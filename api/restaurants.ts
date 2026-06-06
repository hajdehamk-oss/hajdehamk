import { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../server/db.js";
import { restaurants, menuItems } from "../shared/schema.js";
import { eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET")
    return res.status(405).json({ message: "Method not allowed" });

  try {
    const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;

    if (slug) {
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.slug, slug));

      if (!restaurant)
        return res.status(404).json({ message: "Restaurant not found" });

      const items = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.restaurantId, restaurant.id));

      return res.status(200).json({ ...restaurant, menuItems: items });
    }

    const allRestaurants = await db.select().from(restaurants);
    const enriched = await Promise.all(
      allRestaurants.map(async (r) => {
        const items = await db
          .select()
          .from(menuItems)
          .where(eq(menuItems.restaurantId, r.id));

        let isOpen = true;
        if (r.openingTime && r.closingTime) {
          const d = new Date();
          const currentTime = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          isOpen = currentTime >= r.openingTime && currentTime <= r.closingTime;
        }

        return { ...r, menuItems: items, isOpen };
      }),
    );

    return res.status(200).json(enriched);
  } catch (error) {
    console.error("Restaurants error:", error);
    return res.status(500).json({ message: "Database error", error: String(error) });
  }
}
