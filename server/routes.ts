import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import Pusher from "pusher";
import { storage } from "./storage.js";
import { setupAuth, generateToken } from "./auth.js";
import { api } from "../shared/routes.js";
import passport from "passport";
import { db } from "./db.js";
import {
  restaurants as restaurantsTable,
  menuItems as menuItemsTable,
  insertWaiterSchema,
  orders as ordersTable,
} from "../shared/schema.js";
import { eq, sql, lt } from "drizzle-orm";

// ── In-memory cart store (keyed by Pusher channel name) ──────────────────────
interface CartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
}
interface TableRoom {
  cart: CartItem[];
  sessionOrder: CartItem[];
}

const tableRooms = new Map<string, TableRoom>();
// ── Pusher server client ──────────────────────────────────────────────────────
const PUSHER_APP_ID = process.env.PUSHER_APP_ID || "";
const PUSHER_KEY = process.env.PUSHER_KEY || process.env.VITE_PUSHER_KEY || "";
const PUSHER_SECRET = process.env.PUSHER_SECRET || "";
const PUSHER_CLUSTER =
  process.env.PUSHER_CLUSTER || process.env.VITE_PUSHER_CLUSTER || "";

const pusherConfigured = !!(
  PUSHER_APP_ID &&
  PUSHER_KEY &&
  PUSHER_SECRET &&
  PUSHER_CLUSTER
);

const pusherServer = pusherConfigured
  ? new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    })
  : null;

async function safeTrigger(channel: string, event: string, data: object) {
  if (!pusherServer) return;
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (e: any) {
    console.warn("[pusher] trigger failed:", e.message);
  }
}

function requireAuth(req: Request, res: Response): boolean {
  // Accept either passport session OR Bearer-token user attached by attachTokenUser
  if (!req.isAuthenticated() && !(req as any).user) {
    res.status(401).json({ message: "Not authenticated" });
    return false;
  }
  return true;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  const { hashPassword } = setupAuth(app);

  // Auto-cleanup: delete orders older than 1 day every hour
  const cleanOldOrders = async () => {
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await db
      .delete(ordersTable)
      .where(
        sql`${ordersTable.createdAt} < ${cutoff24h} AND ${ordersTable.status} != 'completed'`,
      );
    await db
      .delete(ordersTable)
      .where(
        sql`${ordersTable.createdAt} < ${cutoff30d} AND ${ordersTable.status} = 'completed'`,
      );
  };
  cleanOldOrders();
  setInterval(cleanOldOrders, 60 * 60 * 1000);

  // === AUTH — /api/auth?action=login|logout|me ===
  app.all("/api/auth", (req, res, next) => {
    const action = req.query.action as string;

    if (action === "login") {
      const validation = api.auth.login.input.safeParse(req.body);
      if (!validation.success)
        return res.status(400).json({ message: "Invalid input" });
      return passport.authenticate(
        "local",
        (err: any, user: any, info: any) => {
          if (err) return next(err);
          if (!user)
            return res
              .status(401)
              .json({ message: info?.message || "Authentication failed" });
          req.logIn(user, async (err) => {
            if (err) return next(err);
            const { password: _pw, ...safeUser } = user;
            const token = await generateToken(user.id);
            return res.json({ user: safeUser, token });
          });
        },
      )(req, res, next);
    }

    if (action === "logout") {
      if (req.logout) {
        return req.logout((err) => {
          if (err) return next(err);
          res.sendStatus(200);
        });
      }
      return res.sendStatus(200);
    }

    if (action === "me") {
      if (!requireAuth(req, res)) return;
      const { password: _pw, ...safeUser } = req.user as any;
      return res.json({ user: safeUser });
    }

    if (action === "list") {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(400).json({ message: "Invalid action" });
  });

  // === AI CHAT PROXY ===
  app.post(api.aiChat.path, async (req, res) => {
    try {
      const { system, messages, max_tokens } = req.body;
      if (!system || !Array.isArray(messages))
        return res.status(400).json({ message: "Invalid request body" });
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error("ANTHROPIC_API_KEY is not set");
        return res.status(500).json({ message: "AI service not configured" });
      }
      const anthropicRes = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: max_tokens ?? 600,
            system,
            messages,
          }),
        },
      );
      if (!anthropicRes.ok) {
        const err = await anthropicRes.text();
        console.error("Anthropic API error:", anthropicRes.status, err);
        return res.status(200).json({
          text: `DEBUG: ${anthropicRes.status} - ${err.slice(0, 200)}`,
        });
      }
      const data = await anthropicRes.json();
      const text: string =
        data.content
          ?.map((b: any) => b.text || "")
          .join("")
          .trim() || "";
      res.json({ text });
    } catch (err: any) {
      console.error("AI chat error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/table/cart-update", async (req, res) => {
    try {
      const { channel, cart, clearSession } = req.body;
      console.log("cart-update hit:", {
        channel,
        cartLength: cart?.length,
        clearSession,
      });
      if (!channel || !Array.isArray(cart)) {
        return res.status(400).json({ message: "Missing fields" });
      }
      const existing = tableRooms.get(channel);
      tableRooms.set(channel, {
        cart,
        sessionOrder: clearSession ? [] : existing?.sessionOrder || [],
      });
      if (clearSession) {
        await safeTrigger(channel, "cart-cleared", {});
      } else {
        await safeTrigger(channel, "cart-update", { cart });
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("cart-update error:", err.message, err.stack);
      res.status(500).json({ message: err.message });
    }
  });
  app.post("/api/table/cart-cleared", async (req, res) => {
    try {
      const { channel } = req.body;
      if (!channel) return res.status(400).json({ message: "Missing channel" });

      tableRooms.delete(channel); // wipe server-side room too
      await safeTrigger(channel, "cart-cleared", {});

      res.json({ ok: true });
    } catch (err: any) {
      console.error("cart-cleared error:", err);
      res.status(500).json({ message: err.message });
    }
  });
  app.post("/api/table/waiter-signal", async (req, res) => {
    try {
      const { restaurantSlug, tableNumber, type } = req.body;
      if (!restaurantSlug || !tableNumber || !type) {
        return res.status(400).json({ message: "Missing fields" });
      }
      await safeTrigger(`pos-${restaurantSlug}`, "waiter-request", {
        tableNumber,
        type,
      });
      res.json({ ok: true });
    } catch (err: any) {
      console.error("waiter-signal error:", err.message, err.stack);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/config/pusher", (_req, res) => {
    res.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.json({
      key: PUSHER_KEY,
      cluster: PUSHER_CLUSTER,
    });
  });

  // === MENU IMAGES — served from DB base64, with aggressive caching ===
  app.get("/api/menu-image/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).end();
      const item = await storage.getMenuItem(id);
      if (!item?.imageUrl || !item.imageUrl.startsWith("data:"))
        return res.status(404).end();
      const match = item.imageUrl.match(/^data:([^;]+);base64,(.+)$/s);
      if (!match) return res.status(404).end();
      const buf = Buffer.from(match[2], "base64");
      res.set({
        "Content-Type": match[1],
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Length": String(buf.length),
      });
      return res.end(buf);
    } catch (err: any) {
      res.status(500).end();
    }
  });

  app.get("/api/table/:pin/cart", (req, res) => {
    const room = tableRooms.get(req.params.pin);
    res.json({ cart: room?.cart || [] });
  });

  app.post("/api/table/place-order", async (req, res) => {
    try {
      const { channel, cart, tableNumber, customerNote } = req.body;

      if (!channel) {
        return res.status(400).json({ message: "Missing channel" });
      }

      if (!Array.isArray(cart)) {
        return res.status(400).json({ message: "Cart must be an array" });
      }

      const safeCart = cart as CartItem[];

      await safeTrigger(channel, "order-placed", {
        cart: safeCart,
        tableNumber,
      });

      // ── POS live broadcast + DB save (always, regardless of orderMode) ──
      // channel format: `table-{slug}-{tableNumber}` → extract slug, look up restaurant
      // tableNumber is always a digit suffix, slug may contain hyphens
      try {
        console.log("[place-order] channel received:", channel);
        const m = String(channel).match(/^table-(.+)-(\d+)$/);
        console.log(
          "[place-order] regex match:",
          m ? `slug="${m[1]}" table="${m[2]}"` : "no match",
        );
        if (m) {
          const slug = m[1];
          console.log("[place-order] looking up restaurant slug:", slug);
          const restaurant = await storage.getRestaurantBySlug(slug);
          console.log(
            "[place-order] restaurant found:",
            restaurant ? restaurant.name : "NOT FOUND",
          );
          if (restaurant) {
            // Always fire to POS so orders panel always works
            await safeTrigger(`pos-${slug}`, "incoming-order", {
              cart: safeCart,
              tableNumber,
              customerNote: customerNote || null,
              timestamp: Date.now(),
            });
            // Always persist to DB so waiter PIN claiming works
            const tableNum = parseInt(String(tableNumber), 10) || 0;
            if (Array.isArray(safeCart) && safeCart.length > 0) {
              await storage.createOrder({
                restaurantId: restaurant.id,
                tableNumber: tableNum,
                cart: JSON.stringify(safeCart),
                customerNote: customerNote || null,
                status: "pending",
                waiterId: null,
              });
            }
          }
        }
      } catch (e) {
        console.error("pos broadcast failed:", e);
      }

      const room = tableRooms.get(channel) || { cart: [], sessionOrder: [] };
      const merged = [...room.sessionOrder];

      safeCart.forEach((item) => {
        const existing = merged.find((i) => i.id === item.id);
        if (existing) existing.qty += item.qty;
        else merged.push({ ...item });
      });

      tableRooms.set(channel, { cart: [], sessionOrder: merged });

      await safeTrigger(channel, "cart-update", { cart: [] });
      await safeTrigger(channel, "order-snapshot", {
        sessionOrder: merged,
      });

      res.json({ ok: true });
    } catch (err: any) {
      console.error("place-order error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/table/call-waiter", async (req, res) => {
    try {
      const { channel, tableNumber } = req.body;
      if (!channel) return res.status(400).json({ message: "Missing channel" });
      await safeTrigger(channel, "waiter-called", {
        tableNumber,
        timestamp: Date.now(),
      });
      res.json({ ok: true });
    } catch (err: any) {
      console.error("call-waiter error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // === PUBLIC WAITER CHECK ===
  app.get("/api/waiters/check", async (req, res) => {
    const slug = req.query.slug as string;
    if (!slug) return res.status(400).json({ message: "slug required" });
    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    const restaurant = await storage.getRestaurantBySlug(slug);
    if (!restaurant) return res.status(404).json({ message: "Not found" });
    const list = await storage.getWaiters(restaurant.id);
    return res.json({ hasWaiters: list.length > 0 });
  });

  app.post("/api/waiters/validate-pin", async (req, res) => {
    const { slug, pinCode } = req.body;
    if (!slug || !pinCode)
      return res.status(400).json({ message: "slug and pinCode required" });
    const restaurant = await storage.getRestaurantBySlug(slug);
    if (!restaurant) return res.status(404).json({ message: "Not found" });
    const waiter = await storage.getWaiterByPin(restaurant.id, String(pinCode));
    if (!waiter) return res.status(401).json({ message: "Invalid PIN" });
    return res.json({ id: waiter.id, name: waiter.name });
  });

  // === PUBLIC RESTAURANTS — /api/restaurants[?slug=X] ===
  // Images are stripped from this response and served via /api/menu-image/:id
  // with 24-hour Cache-Control so repeat visits cost almost nothing.
  function stripImages(items: any[]) {
    return items.map((item) => {
      if (!item.imageUrl || !item.imageUrl.startsWith("data:")) return item;
      return { ...item, imageUrl: `/api/menu-image/${item.id}` };
    });
  }

  app.get("/api/restaurants", async (req, res) => {
    try {
      const slug = req.query.slug as string | undefined;
      res.set("Cache-Control", "public, max-age=60, s-maxage=60");

      if (slug) {
        const restaurant = await storage.getRestaurantBySlug(slug);
        if (!restaurant)
          return res.status(404).json({ message: "Restaurant not found" });
        const items = await storage.getMenuItems(restaurant.id);
        return res.json({ ...restaurant, menuItems: stripImages(items) });
      }

      const restaurants = await db.select().from(restaurantsTable);
      const enriched = await Promise.all(
        restaurants.map(async (r) => {
          const menuItems = await storage.getMenuItems(r.id);
          return { ...r, menuItems: stripImages(menuItems) };
        }),
      );
      res.json(enriched);
    } catch (err: any) {
      console.error("Restaurants error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === ADMIN RESTAURANTS — /api/admin/restaurants?action=list|get|create|update|delete ===
  app.all("/api/admin/restaurants", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const user = req.user as any;
    const action = req.query.action as string;

    try {
      if (action === "list") {
        const restaurants = await db
          .select()
          .from(restaurantsTable)
          .where(eq(restaurantsTable.userId, user.id));
        return res.json(restaurants);
      }

      if (action === "get") {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const restaurant = await storage.getRestaurant(id);
        if (!restaurant) return res.status(404).json({ message: "Not found" });
        if (restaurant.userId !== user.id)
          return res.status(403).json({ message: "Forbidden" });
        const menuItems = await storage.getMenuItems(id);
        return res.json({ ...restaurant, menuItems });
      }

      if (action === "create") {
        if (user.username !== "hajdeha")
          return res.status(403).json({
            message: "Only the platform admin can create restaurants",
          });
        const result = api.restaurants.create.input.safeParse(req.body);
        if (!result.success)
          return res.status(400).json({
            message: result.error.errors[0]?.message || "Invalid input",
          });
        const restaurant = await storage.createRestaurant({
          ...result.data,
          userId: user.id,
          latitude: result.data.latitude ?? null,
          longitude: result.data.longitude ?? null,
        });
        return res.status(201).json(restaurant);
      }

      if (action === "update") {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const restaurant = await storage.getRestaurant(id);
        if (!restaurant) return res.status(404).json({ message: "Not found" });
        if (restaurant.userId !== user.id)
          return res.status(403).json({ message: "Forbidden" });
        const result = api.restaurants.update.input.safeParse(req.body);
        if (!result.success)
          return res.status(400).json({
            message: result.error.errors[0]?.message || "Invalid input",
          });
        const updated = await storage.updateRestaurant(id, result.data);
        return res.json(updated);
      }

      if (action === "delete") {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const restaurant = await storage.getRestaurant(id);
        if (!restaurant) return res.status(404).json({ message: "Not found" });
        if (restaurant.userId !== user.id)
          return res.status(403).json({ message: "Forbidden" });
        await storage.deleteRestaurant(id);
        return res.sendStatus(204);
      }

      return res.status(400).json({ message: "Invalid action" });
    } catch (err: any) {
      console.error("Admin restaurants error:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // === ADMIN MENU — /api/admin/menu?action=list|get|create|update|delete|reorder ===
  app.all("/api/admin/menu", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const user = req.user as any;
    const action = req.query.action as string;

    try {
      if (action === "list") {
        const restaurantId = parseInt(req.query.restaurantId as string);
        if (isNaN(restaurantId))
          return res.status(400).json({ message: "restaurantId is required" });
        const restaurant = await storage.getRestaurant(restaurantId);
        if (!restaurant)
          return res.status(404).json({ message: "Restaurant not found" });
        if (restaurant.userId !== user.id)
          return res.status(403).json({ message: "Forbidden" });
        const items = await storage.getMenuItems(restaurantId);
        return res.json(items);
      }

      if (action === "get") {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const item = await storage.getMenuItem(id);
        if (!item) return res.status(404).json({ message: "Item not found" });
        return res.json(item);
      }

      if (action === "create") {
        const result = api.menuItems.create.input.safeParse(req.body);
        if (!result.success)
          return res.status(400).json({
            message: result.error.errors[0]?.message || "Invalid input",
          });
        const restaurant = await storage.getRestaurant(
          result.data.restaurantId,
        );
        if (!restaurant)
          return res.status(404).json({ message: "Restaurant not found" });
        const item = await storage.createMenuItem(result.data);
        return res.status(201).json(item);
      }

      if (action === "update") {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const item = await storage.getMenuItem(id);
        if (!item) return res.status(404).json({ message: "Item not found" });
        const result = api.menuItems.update.input.safeParse(req.body);
        if (!result.success)
          return res.status(400).json({
            message: result.error.errors[0]?.message || "Invalid input",
          });
        // Zod strips explicit nulls from partial schemas — re-apply them from raw body
        const updates: Record<string, any> = { ...result.data };
        const nullableFields = ["specialDiscount", "specialType"] as const;
        for (const field of nullableFields) {
          if (field in req.body && req.body[field] === null) {
            updates[field] = null;
          }
        }
        if (Object.keys(updates).length === 0) return res.json(item);
        const updated = await storage.updateMenuItem(id, updates as any);
        return res.json(updated);
      }

      if (action === "delete") {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const item = await storage.getMenuItem(id);
        if (!item) return res.status(404).json({ message: "Item not found" });
        await storage.deleteMenuItem(id);
        return res.sendStatus(204);
      }

      if (action === "reorder") {
        const { items } = api.menuItems.reorder.input.parse(req.body);
        await Promise.all(
          items.map(({ id, sortOrder }) =>
            db
              .update(menuItemsTable)
              .set({ sortOrder })
              .where(eq(menuItemsTable.id, id)),
          ),
        );
        return res.json({ ok: true });
      }

      return res.status(400).json({ message: "Invalid action" });
    } catch (err: any) {
      console.error("Admin menu error:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // === ADMIN WAITERS — /api/admin/waiters?action=list|create|update|delete ===
  app.all("/api/admin/waiters", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const user = req.user as any;
    const action = req.query.action as string;

    try {
      if (action === "list") {
        const restaurantId = parseInt(req.query.restaurantId as string);
        if (isNaN(restaurantId))
          return res.status(400).json({ message: "restaurantId required" });
        const restaurant = await storage.getRestaurant(restaurantId);
        if (!restaurant || restaurant.userId !== user.id)
          return res.status(403).json({ message: "Forbidden" });
        const list = await storage.getWaiters(restaurantId);
        return res.json(list);
      }

      if (action === "create") {
        const result = insertWaiterSchema.safeParse(req.body);
        if (!result.success)
          return res.status(400).json({
            message: result.error.errors[0]?.message || "Invalid input",
          });
        const restaurant = await storage.getRestaurant(
          result.data.restaurantId,
        );
        if (!restaurant || restaurant.userId !== user.id)
          return res.status(403).json({ message: "Forbidden" });
        const existing = await storage.getWaiterByPin(
          result.data.restaurantId,
          result.data.pinCode,
        );
        if (existing)
          return res.status(409).json({ message: "PIN already in use" });
        const waiter = await storage.createWaiter(result.data);
        return res.status(201).json(waiter);
      }

      if (action === "update") {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const waiter = await storage.getWaiter(id);
        if (!waiter) return res.status(404).json({ message: "Not found" });
        const restaurant = await storage.getRestaurant(waiter.restaurantId);
        if (!restaurant || restaurant.userId !== user.id)
          return res.status(403).json({ message: "Forbidden" });
        if (req.body.pinCode) {
          const existing = await storage.getWaiterByPin(
            waiter.restaurantId,
            req.body.pinCode,
          );
          if (existing && existing.id !== id)
            return res.status(409).json({ message: "PIN already in use" });
        }
        const updated = await storage.updateWaiter(id, req.body);
        return res.json(updated);
      }

      if (action === "delete") {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
        const waiter = await storage.getWaiter(id);
        if (!waiter) return res.status(404).json({ message: "Not found" });
        const restaurant = await storage.getRestaurant(waiter.restaurantId);
        if (!restaurant || restaurant.userId !== user.id)
          return res.status(403).json({ message: "Forbidden" });
        await storage.deleteWaiter(id);
        return res.sendStatus(204);
      }

      return res.status(400).json({ message: "Invalid action" });
    } catch (err: any) {
      console.error("Admin waiters error:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // === POS MANUAL CHECKOUT — saves a completed order for profit tracking ===
  app.post("/api/pos/send-to-kitchen", async (req, res) => {
    try {
      const { slug, tableNumber, cart } = req.body;
      if (!slug || !Array.isArray(cart) || cart.length === 0)
        return res.status(400).json({ message: "Missing fields" });
      await safeTrigger(`pos-${slug}`, "kitchen-order", {
        cart,
        tableNumber,
        timestamp: Date.now(),
        source: "pos",
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/kitchen/order-ready", async (req, res) => {
    try {
      const { slug, tableNumber } = req.body;
      console.log("[order-ready] received:", {
        slug,
        tableNumber,
        pusherConfigured,
        pusherServerNull: !pusherServer,
      });
      if (!slug || !tableNumber)
        return res.status(400).json({ message: "Missing fields" });
      await safeTrigger(`pos-${slug}`, "order-ready", {
        tableNumber,
        timestamp: Date.now(),
      });
      console.log("[order-ready] trigger sent to pos-" + slug);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/pos/checkout", async (req, res) => {
    try {
      const { restaurantId, tableNumber, items, waiterId } = req.body;
      if (!restaurantId || !tableNumber)
        return res.status(400).json({ message: "Missing fields" });
      // Always mark all open orders for this table as completed so the
      // DB poll never re-stamps their note onto the now-empty table
      await storage.completeOrdersForTable(
        Number(restaurantId),
        Number(tableNumber),
      );
      // Only create a new completed order when there are actual items (for profit tracking)
      if (Array.isArray(items) && items.length > 0) {
        const order = await storage.createOrder({
          restaurantId: Number(restaurantId),
          tableNumber: Number(tableNumber),
          cart: JSON.stringify(items),
          status: "completed",
          waiterId: waiterId ?? null,
        });
        return res.status(201).json(order);
      }
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("POS checkout error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // === ORDERS ===
  app.post("/api/orders", async (req, res) => {
    try {
      const { restaurantId, tableNumber, cart } = req.body;
      if (!restaurantId || !tableNumber || !Array.isArray(cart))
        return res.status(400).json({ message: "Missing fields" });
      const order = await storage.createOrder({
        restaurantId,
        tableNumber,
        cart: JSON.stringify(cart),
        status: "pending",
        waiterId: null,
      });
      return res.status(201).json(order);
    } catch (err: any) {
      console.error("Create order error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string);
      if (isNaN(restaurantId))
        return res.status(400).json({ message: "restaurantId required" });
      res.set("Cache-Control", "no-store");
      const status = req.query.status as string | undefined;
      const list = await storage.getOrders(restaurantId, status);
      const waiters = await storage.getWaiters(restaurantId);
      const waiterMap = new Map(waiters.map((w) => [w.id, w.name]));
      const enriched = list.map((o) => {
        let parsedCart: any[] = [];
        try {
          parsedCart =
            typeof o.cart === "string"
              ? JSON.parse(o.cart)
              : Array.isArray(o.cart)
                ? o.cart
                : [];
        } catch {
          parsedCart = [];
        }
        return {
          ...o,
          cart: parsedCart,
          waiterName: o.waiterId ? (waiterMap.get(o.waiterId) ?? null) : null,
        };
      });
      return res.json(enriched);
    } catch (err: any) {
      console.error("Get orders error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/orders/:id/claim", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { pinCode, restaurantId } = req.body;
      if (!pinCode || !restaurantId)
        return res.status(400).json({ message: "Missing fields" });

      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.restaurantId !== Number(restaurantId))
        return res
          .status(403)
          .json({ message: "Order does not belong to this restaurant" });
      if (order.status !== "pending")
        return res.status(409).json({ message: "Order already taken" });

      const waiter = await storage.getWaiterByPin(
        Number(restaurantId),
        pinCode,
      );
      if (!waiter) return res.status(401).json({ message: "Invalid PIN" });

      const updated = await storage.claimOrder(id, waiter.id);
      if (!updated)
        return res.status(409).json({ message: "Order already taken" });

      return res.json({
        ...updated,
        cart: JSON.parse(updated.cart),
        waiterName: waiter.name,
      });
    } catch (err: any) {
      console.error("Claim order error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/orders/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      const updated = await storage.completeOrder(id);
      return res.json({ ...updated, cart: JSON.parse(updated.cart) });
    } catch (err: any) {
      console.error("Complete order error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // === POS TABLE STATE (live sync between devices) ===
  app.get("/api/pos/table-state", async (req, res) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string);
      if (isNaN(restaurantId))
        return res.status(400).json({ message: "restaurantId required" });
      res.set("Cache-Control", "no-store");
      const rows = await storage.getPosTableStates(restaurantId);
      return res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/pos/table-state", async (req, res) => {
    try {
      const { restaurantId, tableNumber, stateJson, slug, deviceId } = req.body;
      if (!restaurantId || !tableNumber || !stateJson || !slug)
        return res.status(400).json({ message: "Missing fields" });
      await storage.upsertPosTableState(
        Number(restaurantId),
        Number(tableNumber),
        stateJson,
      );
      await safeTrigger(`pos-${slug}`, "table-state-updated", {
        tableNumber: Number(tableNumber),
        stateJson,
        deviceId: deviceId || null,
      });
      return res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/pos/table-state/clear", async (req, res) => {
    try {
      const { restaurantId, tableNumber, slug, deviceId } = req.body;
      if (!restaurantId || !tableNumber || !slug)
        return res.status(400).json({ message: "Missing fields" });
      await storage.clearPosTableState(
        Number(restaurantId),
        Number(tableNumber),
      );
      await safeTrigger(`pos-${slug}`, "table-state-cleared", {
        tableNumber: Number(tableNumber),
        deviceId: deviceId || null,
      });
      return res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === TABLE ASSIGNMENTS (persist waiter-table claims) ===
  app.get("/api/pos/table-assignments", async (req, res) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string);
      if (isNaN(restaurantId))
        return res.status(400).json({ message: "restaurantId required" });
      res.set("Cache-Control", "public, max-age=30, s-maxage=30");
      const rows = await storage.getTableAssignments(restaurantId);
      return res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/pos/assign-table", async (req, res) => {
    try {
      const { restaurantId, tableNumber, waiterId } = req.body;
      if (!restaurantId || !tableNumber || !waiterId)
        return res.status(400).json({ message: "Missing fields" });
      await storage.upsertTableAssignment(
        Number(restaurantId),
        Number(tableNumber),
        Number(waiterId),
      );
      const restaurant = await storage.getRestaurant(Number(restaurantId));
      if (restaurant) {
        const waiter = await storage.getWaiter(Number(waiterId));
        await safeTrigger(`pos-${restaurant.slug}`, "table-assigned", {
          tableNumber: Number(tableNumber),
          waiterId: Number(waiterId),
          waiterName: waiter?.name ?? "",
        });
      }
      return res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/pos/assign-table", async (req, res) => {
    try {
      const { restaurantId, tableNumber } = req.body;
      if (!restaurantId || !tableNumber)
        return res.status(400).json({ message: "Missing fields" });
      await storage.deleteTableAssignment(
        Number(restaurantId),
        Number(tableNumber),
      );
      const restaurant = await storage.getRestaurant(Number(restaurantId));
      if (restaurant) {
        await safeTrigger(`pos-${restaurant.slug}`, "table-released", {
          tableNumber: Number(tableNumber),
        });
      }
      return res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === VERIFY WAITER PIN (for POS table claim) ===
  app.post("/api/pos/verify-pin", async (req, res) => {
    try {
      const { pinCode, restaurantId } = req.body;
      if (!pinCode || !restaurantId)
        return res.status(400).json({ message: "Missing fields" });
      const waiter = await storage.getWaiterByPin(
        Number(restaurantId),
        String(pinCode),
      );
      if (!waiter) return res.status(401).json({ message: "PIN i gabuar" });
      return res.json({ id: waiter.id, name: waiter.name });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === WAITER EARNINGS TODAY ===
  app.get("/api/admin/waiter-earnings", async (req, res) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string);
      if (isNaN(restaurantId))
        return res.status(400).json({ message: "restaurantId required" });
      const period = (req.query.period as string) || "day";
      const now = new Date();
      const from = new Date();
      if (period === "week") {
        from.setDate(now.getDate() - 6);
      } else if (period === "month") {
        from.setDate(now.getDate() - 29);
      }
      from.setHours(0, 0, 0, 0);

      const allOrders = await storage.getOrders(restaurantId);
      const filtered = allOrders.filter(
        (o) => o.status === "completed" && new Date(o.createdAt) >= from,
      );

      const waiterList = await storage.getWaiters(restaurantId);
      const waiterMap = new Map(waiterList.map((w) => [w.id, w.name]));

      // Build: { waiterId -> { total, byDay: { "YYYY-MM-DD" -> total } } }
      const earningsMap = new Map<
        number | null,
        { total: number; byDay: Map<string, number> }
      >();
      for (const order of filtered) {
        const key = order.waiterId ?? null;
        const dateKey = new Date(order.createdAt).toISOString().slice(0, 10);
        const cart = JSON.parse(order.cart);
        const total = cart.reduce((s: number, i: any) => {
          const price =
            typeof i.price === "number"
              ? i.price
              : parseFloat(String(i.price).replace(/[^\d.]/g, ""));
          return s + (isNaN(price) ? 0 : price * (i.qty ?? 1));
        }, 0);
        if (!earningsMap.has(key))
          earningsMap.set(key, { total: 0, byDay: new Map() });
        const entry = earningsMap.get(key)!;
        entry.total += total;
        entry.byDay.set(dateKey, (entry.byDay.get(dateKey) ?? 0) + total);
      }

      // Build date labels for the period
      const days: string[] = [];
      const periodDays = period === "month" ? 30 : period === "week" ? 7 : 1;
      for (let i = periodDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }

      const earnings = Array.from(earningsMap.entries()).map(
        ([waiterId, { total, byDay }]) => ({
          waiterId,
          waiterName: waiterId
            ? (waiterMap.get(waiterId) ?? "Unknown")
            : "Pa kamarier",
          total,
          byDay: days.map((date) => ({ date, total: byDay.get(date) ?? 0 })),
        }),
      );

      return res.json({ earnings, days });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === SEED DATA ===
  seedDatabase(hashPassword).catch((err) => {
    console.warn("[seed] Skipped:", err?.message ?? err);
  });

  return httpServer;
}

async function seedDatabase(hashPassword: (pwd: string) => Promise<string>) {
  const admin = await storage.getUserByUsername("hajdeha");
  if (admin) return;
  console.log("Seeding database...");
  const pwd = await hashPassword("DesiigneR.123");
  const user1 = await storage.createUser({
    username: "hajdeha",
    password: pwd,
  });
  const seedUser = async (username: string, passwordPlain: string) => {
    const existing = await storage.getUserByUsername(username);
    if (existing) return existing;
    return storage.createUser({
      username,
      password: await hashPassword(passwordPlain),
    });
  };
  const user2 = await seedUser("admin2", "password123");
  const user3 = await seedUser("admin3", "password123");
  const r1 = await storage.createRestaurant({
    userId: user1.id,
    name: "Test Restaurant Tetovë",
    slug: "test-restaurant-tetove",
    description: "Authentic local cuisine in the heart of Tetovo.",
    photoUrl:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    website: "https://test-restaurant.mk",
    phoneNumber: "+389 44 123 456",
    location: "Rruga e Marshit, Tetovë 1200",
    latitude: 42.01,
    longitude: 20.97,
    wifiPassword: "12345678",
  });
  const r2 = await storage.createRestaurant({
    userId: user2.id,
    name: "Hajde Grill",
    slug: "hajde-grill",
    description: "Best grilled meats and traditional qebapa.",
    photoUrl:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    website: "https://hajdegrill.mk",
    phoneNumber: "+389 44 234 567",
    location: "Bulevardi Iliria, Tetovë 1200",
    latitude: 42.008,
    longitude: 20.965,
    wifiPassword: "12345678",
  });
  const r3 = await storage.createRestaurant({
    userId: user3.id,
    name: "Cafe Hajde",
    slug: "cafe-hajde",
    description: "Premium coffee and delightful desserts.",
    photoUrl:
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
    website: "https://cafehajde.mk",
    phoneNumber: "+389 44 345 678",
    location: "Sheshi Iliria, Tetovë 1200",
    latitude: 42.012,
    longitude: 20.972,
    wifiPassword: "12345678",
  });
  const items = [
    {
      restaurantId: r1.id,
      name: "Pizza Margherita",
      price: "500 DEN",
      category: "Food",
      description: "Tomato sauce, mozzarella, basil",
    },
    {
      restaurantId: r1.id,
      name: "Classic Burger",
      price: "350 DEN",
      category: "Food",
      description: "Beef patty, lettuce, tomato, house sauce",
    },
    {
      restaurantId: r1.id,
      name: "Coca-Cola",
      price: "100 DEN",
      category: "Drinks",
      description: "330ml can",
    },
    {
      restaurantId: r2.id,
      name: "Grilled Chicken",
      price: "450 DEN",
      category: "Mains",
      description: "Served with fries and salad",
    },
    {
      restaurantId: r2.id,
      name: "Qebapa (10 pcs)",
      price: "300 DEN",
      category: "Mains",
      description: "Traditional minced meat rolls with bread",
    },
    {
      restaurantId: r2.id,
      name: "Ayran",
      price: "60 DEN",
      category: "Drinks",
      description: "Refreshing yogurt drink",
    },
    {
      restaurantId: r3.id,
      name: "Espresso",
      price: "80 DEN",
      category: "Coffee",
      description: "Strong and rich",
    },
    {
      restaurantId: r3.id,
      name: "Cappuccino",
      price: "120 DEN",
      category: "Coffee",
      description: "Espresso with steamed milk foam",
    },
    {
      restaurantId: r3.id,
      name: "Cheesecake",
      price: "250 DEN",
      category: "Dessert",
      description: "New York style with berry topping",
    },
  ];
  for (let i = 0; i < items.length; i++) {
    await storage.createMenuItem({ ...items[i], sortOrder: i });
  }
  console.log("Database seeded successfully!");
}
