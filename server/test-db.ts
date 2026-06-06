import { db } from "./db";
import { restaurants } from "@shared/schema";

(async () => {
  try {
    const allRestaurants = await db.select().from(restaurants);
    console.log("Restaurants from Supabase:", allRestaurants);
  } catch (err) {
    console.error("DB Error:", err);
  }
})();
