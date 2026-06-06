import { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../server/db.js";
import { menuItems, restaurants } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { verifyToken, unauthorized, forbidden } from "./auth.js";

function getId(req: VercelRequest): number {
  const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  return parseInt(raw || "");
}

async function ownerCheck(itemId: number, userId: number, res: VercelResponse) {
  const [item] = await db.select().from(menuItems).where(eq(menuItems.id, itemId));
  if (!item) { res.status(404).json({ message: "Item not found" }); return null; }

  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, item.restaurantId));
  if (!restaurant) { res.status(404).json({ message: "Restaurant not found" }); return null; }

  if (restaurant.userId !== userId) { forbidden(res); return null; }
  return item;
}

async function handleList(req: VercelRequest, res: VercelResponse, userId: number) {
  const raw = Array.isArray(req.query.restaurantId) ? req.query.restaurantId[0] : req.query.restaurantId;
  const restaurantId = parseInt(raw || "");
  if (isNaN(restaurantId))
    return res.status(400).json({ message: "restaurantId is required" });

  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
  if (restaurant.userId !== userId) return forbidden(res);

  const items = await db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId));
  return res.status(200).json(items);
}

async function handleGet(req: VercelRequest, res: VercelResponse, userId: number) {
  const id = getId(req);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  const item = await ownerCheck(id, userId, res);
  if (!item) return;
  return res.status(200).json(item);
}

async function handleCreate(req: VercelRequest, res: VercelResponse, userId: number) {
  const {
    restaurantId, name, nameAl, nameMk, price, category,
    description, descriptionAl, descriptionMk,
    imageUrl, active, isVegetarian, isVegan, isGlutenFree,
  } = req.body || {};

  if (!restaurantId) return res.status(400).json({ message: "restaurantId is required" });
  if (!name) return res.status(400).json({ message: "name is required" });
  if (!price) return res.status(400).json({ message: "price is required" });

  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
  if (restaurant.userId !== userId) return forbidden(res);

  const [newItem] = await db
    .insert(menuItems)
    .values({
      restaurantId, name, nameAl: nameAl || null, nameMk: nameMk || null,
      price, category: category || "Main",
      description: description || null,
      descriptionAl: descriptionAl || null,
      descriptionMk: descriptionMk || null,
      imageUrl: imageUrl || null,
      active: active !== undefined ? active : true,
      isVegetarian: isVegetarian || false,
      isVegan: isVegan || false,
      isGlutenFree: isGlutenFree || false,
    })
    .returning();

  return res.status(201).json(newItem);
}

async function handleUpdate(req: VercelRequest, res: VercelResponse, userId: number) {
  const id = getId(req);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

  const item = await ownerCheck(id, userId, res);
  if (!item) return;

  const updateData = { ...req.body };
  delete updateData.id;
  delete updateData.restaurantId;

  const [updated] = await db
    .update(menuItems)
    .set(updateData)
    .where(eq(menuItems.id, id))
    .returning();

  return res.status(200).json(updated);
}

async function handleDelete(req: VercelRequest, res: VercelResponse, userId: number) {
  const id = getId(req);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

  const item = await ownerCheck(id, userId, res);
  if (!item) return;

  await db.delete(menuItems).where(eq(menuItems.id, id));
  return res.status(200).json({ message: "Item deleted successfully" });
}

async function handleReorder(req: VercelRequest, res: VercelResponse) {
  const { items } = req.body as { items: { id: number; sortOrder: number }[] };
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: "items array is required" });

  await Promise.all(
    items.map(({ id, sortOrder }) =>
      db.update(menuItems).set({ sortOrder }).where(eq(menuItems.id, id)),
    ),
  );
  return res.status(200).json({ ok: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = verifyToken(req);
  if (!user) return unauthorized(res);

  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

  try {
    if (action === "list") return await handleList(req, res, user.userId);
    if (action === "get") return await handleGet(req, res, user.userId);
    if (action === "create") return await handleCreate(req, res, user.userId);
    if (action === "update") return await handleUpdate(req, res, user.userId);
    if (action === "delete") return await handleDelete(req, res, user.userId);
    if (action === "reorder") return await handleReorder(req, res);
    return res.status(400).json({ message: "Invalid action" });
  } catch (error) {
    console.error("Admin menu error:", error);
    return res.status(500).json({ message: "Database error", error: String(error) });
  }
}
