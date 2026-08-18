/**
 * Local server entry point for the Electron desktop app.
 * Uses SQLite instead of PostgreSQL, syncs data from hajdeha.com on startup,
 * and subscribes to Pusher to receive incoming orders in real-time.
 *
 * Run with: npm run electron:dev
 */
import express from "express";
import compression from "compression";
import { createServer } from "http";
import path from "path";
import fs from "fs";

// ── Config ────────────────────────────────────────────────────────────────────
const CONFIG_PATH =
  process.env.LOCAL_CONFIG_PATH ||
  path.join(process.cwd(), "hajdeha-config.json");

interface LocalConfig {
  slug: string;
  pusherKey?: string;
  pusherCluster?: string;
}

function loadConfig(): LocalConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {}
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Import SQLite storage (only in this file so it doesn't affect cloud server)
  const { LocalStorage, menuItemKey } = await import("./storage-local.js");
  const localStore = new LocalStorage();

  const config = loadConfig();

  const app = express();
  const httpServer = createServer(app);

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false }));

  // ── Pusher listener (saves incoming orders to local SQLite) ──────────────
  async function startPusherListener(slug: string, restaurantId: number) {
    if (!config?.pusherKey || !config?.pusherCluster) return;
    try {
      const PusherJs = (await import("pusher-js")).default;
      const pusherClient = new PusherJs(config.pusherKey, {
        cluster: config.pusherCluster,
      });
      const channel = pusherClient.subscribe(`pos-${slug}`);
      channel.bind("incoming-order", async (data: any) => {
        try {
          const { cart, tableNumber, customerNote } = data;
          if (!Array.isArray(cart) || cart.length === 0) return;
          const fp = makeFingerprint(restaurantId, Number(tableNumber) || 0, cart);
          if (recentOrderFingerprints.has(fp)) {
            console.log(`[local] Duplicate order from table ${tableNumber} — skipped`);
            return;
          }
          trackFingerprint(fp);
          await localStore.createOrder({
            restaurantId,
            tableNumber: Number(tableNumber) || 0,
            cart: JSON.stringify(cart),
            customerNote: customerNote || null,
            status: "pending",
            waiterId: null,
          });
          console.log(`[local] Order saved from table ${tableNumber}`);
        } catch (e: any) {
          console.error("[local] Failed to save incoming order:", e.message);
        }
      });
      console.log(`[local] Pusher listening on pos-${slug}`);
    } catch (e: any) {
      console.warn("[local] Pusher setup failed:", e.message);
    }
  }

  // ── Sync from hajdeha.com ────────────────────────────────────────────────
  async function syncFromCloud(slug: string) {
    try {
      const res = await fetch(
        `https://hajdeha.com/api/restaurants?slug=${slug}`,
      );
      if (!res.ok) {
        console.warn("[local] Sync failed:", res.status);
        return null;
      }
      const data: any = await res.json();

      const existing = await localStore.getRestaurantBySlug(slug);
      let restaurant: any;
      const restaurantData = {
        name: data.name,
        description: data.description,
        descriptionAl: data.descriptionAl,
        descriptionMk: data.descriptionMk,
        photoUrl: data.photoUrl,
        location: data.location,
        openingTime: data.openingTime || "08:00",
        closingTime: data.closingTime || "22:00",
        tableCount: data.tableCount || 0,
        wifiPassword: data.wifiPassword,
        orderMode: data.orderMode || "pos",
        active: data.active ?? true,
        latitude: data.latitude,
        longitude: data.longitude,
        phoneNumber: data.phoneNumber,
        website: data.website,
      };

      if (existing) {
        restaurant = await localStore.updateRestaurant(
          existing.id,
          restaurantData,
        );
      } else {
        restaurant = await localStore.createRestaurant({
          ...restaurantData,
          slug: data.slug,
          userId: 1,
        });
      }

      // Sync menu items — delete and re-insert
      if (Array.isArray(data.menuItems)) {
        const priceOverrides = await localStore.getMenuPriceOverrides(
          restaurant.id,
        );
        const { localDb } = await import("./db-local.js");
        const { menuItems: menuItemsTable } = await import(
          "../shared/schema-local.js"
        );
        const { eq } = await import("drizzle-orm");
        localDb
          .delete(menuItemsTable)
          .where(eq(menuItemsTable.restaurantId, restaurant.id))
          .run();
        for (const item of data.menuItems) {
          await localStore.createMenuItem({
            restaurantId: restaurant.id,
            name: item.name,
            nameAl: item.nameAl,
            nameMk: item.nameMk,
            description: item.description,
            descriptionAl: item.descriptionAl,
            descriptionMk: item.descriptionMk,
            // Keep a price edited at the POS when the next cloud sync runs.
            price:
              priceOverrides.get(
                menuItemKey({
                  name: item.name,
                  category: item.category || "Main",
                }),
              ) ?? item.price,
            category: item.category || "Main",
            imageUrl: item.imageUrl,
            active: item.active ?? true,
            isVegetarian: item.isVegetarian ?? false,
            isVegan: item.isVegan ?? false,
            isGlutenFree: item.isGlutenFree ?? false,
            isSpicy: item.isSpicy ?? false,
            containsNuts: item.containsNuts ?? false,
            sortOrder: item.sortOrder ?? 0,
            specialDiscount: item.specialDiscount,
            specialType: item.specialType,
          });
        }
      }

      console.log(`[local] Synced "${data.name}" from hajdeha.com`);
      return restaurant;
    } catch (e: any) {
      console.error("[local] Sync error:", e.message);
      return null;
    }
  }

  // ── In-memory cart store ─────────────────────────────────────────────────
  const tableRooms = new Map<string, { cart: any[]; sessionOrder: any[] }>();

  // ── Order deduplication ───────────────────────────────────────────────────
  // Fingerprint = "restaurantId:tableNumber:cartHash". Keeps the last 5 minutes
  // of fingerprints so Pusher reconnect/retry doesn't create duplicate orders.
  const recentOrderFingerprints = new Set<string>();
  function makeFingerprint(restaurantId: number, tableNumber: number, cart: any[]): string {
    const cartStr = JSON.stringify(
      [...cart].sort((a, b) => String(a.id).localeCompare(String(b.id))),
    );
    return `${restaurantId}:${tableNumber}:${cartStr}`;
  }
  function trackFingerprint(fp: string) {
    recentOrderFingerprints.add(fp);
    setTimeout(() => recentOrderFingerprints.delete(fp), 5 * 60 * 1000);
  }

  // ── Routes ───────────────────────────────────────────────────────────────

  // Local config endpoints (used by Electron setup)
  app.get("/api/local/config", (_req, res) => {
    res.json({ configured: !!config, slug: config?.slug || null });
  });

  app.post("/api/local/config", (req, res) => {
    const { slug, pusherKey, pusherCluster } = req.body;
    if (!slug) {
      return res.status(400).json({ message: "Slug is required" });
    }
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ slug, pusherKey, pusherCluster }, null, 2),
    );
    res.json({ ok: true });
  });

  app.post("/api/local/sync", async (_req, res) => {
    if (!config?.slug)
      return res.status(400).json({ message: "Not configured" });
    const restaurant = await syncFromCloud(config.slug);
    res.json({ ok: !!restaurant });
  });

  // Pusher config for frontend
  app.get("/api/config/pusher", (_req, res) => {
    res.json({
      key: config?.pusherKey || "",
      cluster: config?.pusherCluster || "",
    });
  });

  // Restaurant
  app.get("/api/restaurants", async (req, res) => {
    try {
      const slug = req.query.slug as string;
      if (slug) {
        const restaurant = await localStore.getRestaurantBySlug(slug);
        if (!restaurant)
          return res.status(404).json({ message: "Not found" });
        const items = await localStore.getMenuItems(restaurant.id);
        const menuItems = items.map((item) => {
          if (!item.imageUrl || !item.imageUrl.startsWith("data:"))
            return item;
          return { ...item, imageUrl: `/api/menu-image/${item.id}` };
        });
        return res.json({ ...restaurant, menuItems });
      }
      const all = await localStore.getAllRestaurants();
      return res.json(all);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/menu-image/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await localStore.getMenuItem(id);
      if (!item?.imageUrl || !item.imageUrl.startsWith("data:"))
        return res.status(404).end();
      const match = item.imageUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
      if (!match) return res.status(404).end();
      const buf = Buffer.from(match[2], "base64");
      res.set({
        "Content-Type": match[1],
        "Cache-Control": "public, max-age=86400",
      });
      return res.end(buf);
    } catch {
      res.status(500).end();
    }
  });

  // Local POS-only price editing. This does not update the online QR menu.
  app.patch("/api/pos/menu-items/:id/price", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const numericPrice = Number(req.body?.price);
      if (!Number.isInteger(id) || !Number.isFinite(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ message: "A valid non-negative price is required" });
      }

      const item = await localStore.getMenuItem(id);
      if (!item) return res.status(404).json({ message: "Menu item not found" });

      const price = `${Math.round(numericPrice)} DEN`;
      const updated = await localStore.updateMenuItem(id, { price });
      await localStore.setMenuPriceOverride(
        item.restaurantId,
        menuItemKey(item),
        price,
      );
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string);
      if (isNaN(restaurantId))
        return res.status(400).json({ message: "restaurantId required" });
      const list = await localStore.getOrders(
        restaurantId,
        req.query.status as string,
      );
      const waiterList = await localStore.getWaiters(restaurantId);
      const waiterMap = new Map(waiterList.map((w) => [w.id, w.name]));
      const enriched = list.map((o) => {
        let parsedCart: any[] = [];
        try {
          parsedCart = JSON.parse(o.cart);
        } catch {}
        const ts =
          o.createdAt instanceof Date
            ? o.createdAt.toISOString()
            : new Date(o.createdAt as any).toISOString();
        return {
          ...o,
          cart: parsedCart,
          waiterName: o.waiterId ? waiterMap.get(o.waiterId) || null : null,
          createdAt: ts,
        };
      });
      res.set("Cache-Control", "no-store");
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { restaurantId, tableNumber, cart } = req.body;
      if (!restaurantId || !tableNumber || !Array.isArray(cart))
        return res.status(400).json({ message: "Missing fields" });
      const order = await localStore.createOrder({
        restaurantId,
        tableNumber,
        cart: JSON.stringify(cart),
        status: "pending",
        waiterId: null,
      });
      res.status(201).json(order);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/orders/:id/claim", async (req, res) => {
    try {
      const order = await localStore.claimOrder(
        parseInt(req.params.id),
        req.body.waiterId,
      );
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/orders/:id/complete", async (req, res) => {
    try {
      const order = await localStore.completeOrder(parseInt(req.params.id));
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POS Table State
  app.get("/api/pos/table-state", async (req, res) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string);
      if (isNaN(restaurantId))
        return res.status(400).json({ message: "restaurantId required" });
      const rows = await localStore.getPosTableStates(restaurantId);
      res.set("Cache-Control", "no-store");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/pos/table-state", async (req, res) => {
    try {
      const { restaurantId, tableNumber, stateJson } = req.body;
      await localStore.upsertPosTableState(restaurantId, tableNumber, stateJson);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/pos/table-state/clear", async (req, res) => {
    try {
      const { restaurantId, tableNumber } = req.body;
      await localStore.clearPosTableState(restaurantId, tableNumber);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Table Assignments
  app.get("/api/pos/table-assignments", async (req, res) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string);
      if (isNaN(restaurantId))
        return res.status(400).json({ message: "restaurantId required" });
      const rows = await localStore.getTableAssignments(restaurantId);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/pos/assign-table", async (req, res) => {
    try {
      const { restaurantId, tableNumber, waiterId } = req.body;
      await localStore.upsertTableAssignment(restaurantId, tableNumber, waiterId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/pos/assign-table", async (req, res) => {
    try {
      const { restaurantId, tableNumber } = req.body;
      await localStore.deleteTableAssignment(restaurantId, tableNumber);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PIN + Waiter
  app.post("/api/pos/verify-pin", async (req, res) => {
    try {
      const { slug, pinCode } = req.body;
      const restaurant = await localStore.getRestaurantBySlug(
        slug || config?.slug || "",
      );
      if (!restaurant)
        return res.status(404).json({ message: "Restaurant not found" });
      const waiter = await localStore.getWaiterByPin(
        restaurant.id,
        String(pinCode),
      );
      if (!waiter) return res.status(401).json({ message: "Invalid PIN" });
      res.json({ id: waiter.id, name: waiter.name });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/waiters/check", async (req, res) => {
    try {
      const slug = (req.query.slug as string) || config?.slug || "";
      const restaurant = await localStore.getRestaurantBySlug(slug);
      if (!restaurant) return res.status(404).json({ message: "Not found" });
      const list = await localStore.getWaiters(restaurant.id);
      res.json({ hasWaiters: list.length > 0 });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/waiters/validate-pin", async (req, res) => {
    try {
      const { slug, pinCode } = req.body;
      const restaurant = await localStore.getRestaurantBySlug(
        slug || config?.slug || "",
      );
      if (!restaurant) return res.status(404).json({ message: "Not found" });
      const waiter = await localStore.getWaiterByPin(
        restaurant.id,
        String(pinCode),
      );
      if (!waiter) return res.status(401).json({ message: "Invalid PIN" });
      res.json({ id: waiter.id, name: waiter.name });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/waiters", async (req, res) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string);
      if (isNaN(restaurantId))
        return res.status(400).json({ message: "restaurantId required" });
      res.json(await localStore.getWaiters(restaurantId));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Checkout
  app.post("/api/pos/checkout", async (req, res) => {
    try {
      const { restaurantId, tableNumber, waiterId, items } = req.body;
      await localStore.completeOrdersForTable(restaurantId, tableNumber);
      await localStore.clearPosTableState(restaurantId, tableNumber);
      await localStore.deleteTableAssignment(restaurantId, tableNumber);
      if (Array.isArray(items) && items.length > 0) {
        const order = await localStore.createOrder({
          restaurantId: Number(restaurantId),
          tableNumber: Number(tableNumber),
          cart: JSON.stringify(items),
          status: "completed",
          waiterId: waiterId ?? null,
        });
        return res.status(201).json(order);
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Pusher relay (fire-and-forget — frontend connects to Pusher directly)
  app.post("/api/pos/send-to-kitchen", (_req, res) => res.json({ ok: true }));
  app.post("/api/kitchen/order-ready", (_req, res) => res.json({ ok: true }));

  // Cart / in-memory real-time sync
  app.post("/api/table/cart-update", (req, res) => {
    const { channel, cart } = req.body;
    const room = tableRooms.get(channel) || { cart: [], sessionOrder: [] };
    tableRooms.set(channel, { ...room, cart: cart || [] });
    res.json({ ok: true });
  });
  app.post("/api/table/cart-cleared", (req, res) => {
    tableRooms.delete(req.body.channel);
    res.json({ ok: true });
  });
  app.post("/api/table/call-waiter", (_req, res) => res.json({ ok: true }));
  app.post("/api/table/waiter-signal", (_req, res) => res.json({ ok: true }));
  app.get("/api/table/:pin/cart", (req, res) => {
    const room = tableRooms.get(req.params.pin);
    res.json({ cart: room?.cart || [] });
  });

  app.post("/api/table/place-order", async (req, res) => {
    try {
      const { channel, cart, tableNumber, customerNote } = req.body;
      if (!Array.isArray(cart) || !channel)
        return res.status(400).json({ message: "Missing fields" });
      const m = String(channel).match(/^table-(.+)-(\d+)$/);
      if (m) {
        const restaurant = await localStore.getRestaurantBySlug(m[1]);
        if (restaurant && cart.length > 0) {
          const tbl = parseInt(m[2]) || 0;
          const fp = makeFingerprint(restaurant.id, tbl, cart);
          if (!recentOrderFingerprints.has(fp)) {
            trackFingerprint(fp);
            await localStore.createOrder({
              restaurantId: restaurant.id,
              tableNumber: tbl,
              cart: JSON.stringify(cart),
              customerNote: customerNote || null,
              status: "pending",
              waiterId: null,
            });
          }
        }
      }
      const room = tableRooms.get(channel) || { cart: [], sessionOrder: [] };
      const merged = [...room.sessionOrder];
      cart.forEach((item: any) => {
        const ex = merged.find((i: any) => i.id === item.id);
        if (ex) (ex as any).qty += item.qty;
        else merged.push({ ...item });
      });
      tableRooms.set(channel, { cart: [], sessionOrder: merged });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Static / Vite ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    const { serveStatic } = await import("./static.js");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite.js");
    await setupVite(httpServer, app);
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  const PORT = parseInt(process.env.PORT || "5000", 10);
  // Bind to loopback only — the Electron app is local, no external access needed.
  // This prevents other machines on the same WiFi from hitting unauthenticated endpoints.
  const HOST = process.env.IS_ELECTRON ? "127.0.0.1" : "0.0.0.0";
  httpServer.listen({ port: PORT, host: HOST }, async () => {
    console.log(`[local] Server on port ${PORT}`);
    if (config?.slug) {
      // Always check local SQLite first — the app must work offline.
      const localRestaurant = await localStore.getRestaurantBySlug(config.slug);

      // Try syncing from cloud (non-blocking — failure is fine when offline).
      const synced = await syncFromCloud(config.slug);
      const restaurant = synced || localRestaurant;

      if (restaurant) {
        // Start Pusher listener (uses cloud real-time orders) — optional, skipped if no key.
        await startPusherListener(config.slug, restaurant.id);
        // Hourly sync — best-effort, silently fails when offline.
        setInterval(() => syncFromCloud(config.slug!), 60 * 60 * 1000);
      } else {
        console.warn("[local] No restaurant data found. Open the app and use File → Sync from Cloud when online.");
      }
    }
  });
}

main().catch(console.error);
