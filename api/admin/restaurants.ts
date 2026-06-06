import { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../server/db.js";
import { restaurants, menuItems } from "../../shared/schema.js";
import { eq, and, ne } from "drizzle-orm";
import { verifyToken, unauthorized, forbidden } from "./auth.js";

function getId(req: VercelRequest): number {
  const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  return parseInt(raw || "");
}

async function handleList(req: VercelRequest, res: VercelResponse, userId: number) {
  const rows = await db.select().from(restaurants).where(eq(restaurants.userId, userId));
  return res.status(200).json(rows);
}

async function handleGet(req: VercelRequest, res: VercelResponse, userId: number) {
  const id = getId(req);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
  if (restaurant.userId !== userId) return forbidden(res);

  const items = await db.select().from(menuItems).where(eq(menuItems.restaurantId, id));
  return res.status(200).json({ ...restaurant, menuItems: items });
}

async function handleCreate(req: VercelRequest, res: VercelResponse, userId: number) {
  const {
    name, slug, description, descriptionAl, descriptionMk, photoUrl,
    website, phoneNumber, location, openingTime, closingTime,
    active, latitude, longitude, tableCount,
  } = req.body || {};

  if (!name || !slug)
    return res.status(400).json({ message: "Name and slug are required" });

  const [existing] = await db.select().from(restaurants).where(eq(restaurants.slug, slug));
  if (existing)
    return res.status(400).json({ message: "Slug already exists. Please choose a different URL slug." });

  const [newRestaurant] = await db
    .insert(restaurants)
    .values({
      name, slug, description, descriptionAl, descriptionMk, photoUrl,
      website, phoneNumber, location, openingTime, closingTime,
      active: active ?? true, latitude, longitude,
      tableCount: tableCount ?? 0,
      userId,
    })
    .returning();

  return res.status(201).json(newRestaurant);
}

async function handleUpdate(req: VercelRequest, res: VercelResponse, userId: number) {
  const id = getId(req);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
  if (restaurant.userId !== userId) return forbidden(res);

  const body = { ...req.body };
  delete body.id;
  delete body.userId;

  const allowed = [
    "name", "description", "descriptionAl", "descriptionMk", "slug",
    "photoUrl", "website", "phoneNumber", "location",
    "openingTime", "closingTime", "active", "latitude", "longitude", "tableCount",
    "wifiPassword", "orderMode",
  ];

  const updateData: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      if (key === "latitude" || key === "longitude" || key === "tableCount") {
        updateData[key] = body[key] !== null && body[key] !== "" ? Number(body[key]) : null;
      } else {
        updateData[key] = body[key];
      }
    }
  }

  if (updateData.slug) {
    const [dup] = await db
      .select()
      .from(restaurants)
      .where(and(eq(restaurants.slug, updateData.slug as string), ne(restaurants.id, id)));
    if (dup)
      return res.status(400).json({ message: "Slug already exists. Please choose a different URL slug." });
  }

  const [updated] = await db
    .update(restaurants)
    .set(updateData)
    .where(eq(restaurants.id, id))
    .returning();

  const items = await db.select().from(menuItems).where(eq(menuItems.restaurantId, id));
  return res.status(200).json({ ...updated, menuItems: items });
}

async function handleDelete(req: VercelRequest, res: VercelResponse, userId: number) {
  const id = getId(req);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
  if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
  if (restaurant.userId !== userId) return forbidden(res);

  await db.delete(menuItems).where(eq(menuItems.restaurantId, id));
  await db.delete(restaurants).where(eq(restaurants.id, id));
  return res.status(200).json({ message: "Restaurant deleted successfully" });
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
    return res.status(400).json({ message: "Invalid action" });
  } catch (error) {
    console.error("Admin restaurants error:", error);
    return res.status(500).json({ message: "Database error", error: String(error) });
  }
}
