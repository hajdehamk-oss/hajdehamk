import { eq, and } from "drizzle-orm";
import { localDb as db } from "./db-local.js";
import {
  restaurants,
  menuItems,
  menuPriceOverrides,
  waiters,
  orders,
  tableAssignments,
  posTableState,
  type Restaurant,
  type MenuItem,
  type Waiter,
  type Order,
  type TableAssignment,
} from "../shared/schema-local.js";
import type { IStorage } from "./storage.js";

// Stable across cloud re-syncs, unlike the local SQLite auto-increment id.
export function menuItemKey(item: {
  name: string;
  category?: string | null;
}): string {
  return `${String(item.category || "Main").trim().toLowerCase()}::${String(item.name).trim().toLowerCase()}`;
}

/**
 * SQLite-backed storage for the Electron desktop app.
 * Implements the same IStorage interface as DatabaseStorage so
 * all existing route code works without modification.
 */
export class LocalStorage implements IStorage {
  // ── Users (minimal — local app uses PIN auth only) ────────────────────────
  async getUser(id: number) {
    return undefined;
  }
  async getUserByUsername(username: string) {
    return undefined;
  }
  async createUser(user: any): Promise<any> {
    throw new Error("User management not supported in local mode");
  }

  // ── Restaurants ───────────────────────────────────────────────────────────
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const [r] = db.select().from(restaurants).where(eq(restaurants.id, id)).all();
    return r;
  }

  async getRestaurantBySlug(slug: string): Promise<Restaurant | undefined> {
    const [r] = db.select().from(restaurants).where(eq(restaurants.slug, slug)).all();
    return r;
  }

  async getRestaurantsByUserId(userId: number): Promise<Restaurant[]> {
    return db.select().from(restaurants).all();
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return db.select().from(restaurants).all();
  }

  async createRestaurant(data: any): Promise<Restaurant> {
    const result = db.insert(restaurants).values(data).returning().all();
    return result[0];
  }

  async updateRestaurant(id: number, updates: any): Promise<Restaurant> {
    const result = db
      .update(restaurants)
      .set(updates)
      .where(eq(restaurants.id, id))
      .returning()
      .all();
    return result[0];
  }

  async deleteRestaurant(id: number): Promise<void> {
    db.delete(menuItems).where(eq(menuItems.restaurantId, id)).run();
    db.delete(restaurants).where(eq(restaurants.id, id)).run();
  }

  // ── Menu Items ────────────────────────────────────────────────────────────
  async getMenuItems(restaurantId: number): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId)).all();
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = db.select().from(menuItems).where(eq(menuItems.id, id)).all();
    return item;
  }

  async createMenuItem(item: any): Promise<MenuItem> {
    const result = db.insert(menuItems).values(item).returning().all();
    return result[0];
  }

  async updateMenuItem(id: number, updates: any): Promise<MenuItem> {
    const result = db
      .update(menuItems)
      .set(updates)
      .where(eq(menuItems.id, id))
      .returning()
      .all();
    return result[0];
  }

  async deleteMenuItem(id: number): Promise<void> {
    db.delete(menuItems).where(eq(menuItems.id, id)).run();
  }

  async getMenuPriceOverrides(restaurantId: number): Promise<Map<string, string>> {
    const rows = db
      .select({
        itemKey: menuPriceOverrides.itemKey,
        price: menuPriceOverrides.price,
      })
      .from(menuPriceOverrides)
      .where(eq(menuPriceOverrides.restaurantId, restaurantId))
      .all();
    return new Map(rows.map((row) => [row.itemKey, row.price]));
  }

  async setMenuPriceOverride(
    restaurantId: number,
    itemKey: string,
    price: string,
  ): Promise<void> {
    db.delete(menuPriceOverrides)
      .where(
        and(
          eq(menuPriceOverrides.restaurantId, restaurantId),
          eq(menuPriceOverrides.itemKey, itemKey),
        ),
      )
      .run();
    db.insert(menuPriceOverrides)
      .values({ restaurantId, itemKey, price, updatedAt: new Date() })
      .run();
  }

  // ── Waiters ───────────────────────────────────────────────────────────────
  async getWaiters(restaurantId: number): Promise<Waiter[]> {
    return db.select().from(waiters).where(eq(waiters.restaurantId, restaurantId)).all();
  }

  async getWaiter(id: number): Promise<Waiter | undefined> {
    const [w] = db.select().from(waiters).where(eq(waiters.id, id)).all();
    return w;
  }

  async getWaiterByPin(restaurantId: number, pinCode: string): Promise<Waiter | undefined> {
    const [w] = db
      .select()
      .from(waiters)
      .where(and(eq(waiters.restaurantId, restaurantId), eq(waiters.pinCode, pinCode)))
      .all();
    return w;
  }

  async createWaiter(data: any): Promise<Waiter> {
    const result = db.insert(waiters).values(data).returning().all();
    return result[0];
  }

  async updateWaiter(id: number, updates: any): Promise<Waiter> {
    const result = db
      .update(waiters)
      .set(updates)
      .where(eq(waiters.id, id))
      .returning()
      .all();
    return result[0];
  }

  async deleteWaiter(id: number): Promise<void> {
    db.update(orders).set({ waiterId: null }).where(eq(orders.waiterId, id)).run();
    db.delete(waiters).where(eq(waiters.id, id)).run();
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  async getOrders(restaurantId: number, status?: string): Promise<Order[]> {
    if (status) {
      return db
        .select()
        .from(orders)
        .where(and(eq(orders.restaurantId, restaurantId), eq(orders.status, status)))
        .all();
    }
    return db.select().from(orders).where(eq(orders.restaurantId, restaurantId)).all();
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [o] = db.select().from(orders).where(eq(orders.id, id)).all();
    return o;
  }

  async createOrder(data: any): Promise<Order> {
    const result = db
      .insert(orders)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .all();
    return result[0];
  }

  async claimOrder(id: number, waiterId: number): Promise<Order> {
    const result = db
      .update(orders)
      .set({ waiterId, status: "claimed" })
      .where(and(eq(orders.id, id), eq(orders.status, "pending")))
      .returning()
      .all();
    return result[0];
  }

  async completeOrder(id: number): Promise<Order> {
    const result = db
      .update(orders)
      .set({ status: "completed" })
      .where(eq(orders.id, id))
      .returning()
      .all();
    return result[0];
  }

  async completeOrdersForTable(restaurantId: number, tableNumber: number): Promise<void> {
    db.update(orders)
      .set({ status: "completed" })
      .where(and(eq(orders.restaurantId, restaurantId), eq(orders.tableNumber, tableNumber)))
      .run();
  }

  // ── Table Assignments ─────────────────────────────────────────────────────
  async getTableAssignments(restaurantId: number): Promise<(TableAssignment & { waiterName: string })[]> {
    const rows = db
      .select({
        id: tableAssignments.id,
        restaurantId: tableAssignments.restaurantId,
        tableNumber: tableAssignments.tableNumber,
        waiterId: tableAssignments.waiterId,
        waiterName: waiters.name,
      })
      .from(tableAssignments)
      .innerJoin(waiters, eq(tableAssignments.waiterId, waiters.id))
      .where(eq(tableAssignments.restaurantId, restaurantId))
      .all();
    return rows;
  }

  async upsertTableAssignment(restaurantId: number, tableNumber: number, waiterId: number): Promise<void> {
    db.delete(tableAssignments)
      .where(and(eq(tableAssignments.restaurantId, restaurantId), eq(tableAssignments.tableNumber, tableNumber)))
      .run();
    db.insert(tableAssignments).values({ restaurantId, tableNumber, waiterId }).run();
  }

  async deleteTableAssignment(restaurantId: number, tableNumber: number): Promise<void> {
    db.delete(tableAssignments)
      .where(and(eq(tableAssignments.restaurantId, restaurantId), eq(tableAssignments.tableNumber, tableNumber)))
      .run();
  }

  // ── POS Table State ───────────────────────────────────────────────────────
  async getPosTableStates(restaurantId: number): Promise<{ tableNumber: number; stateJson: string }[]> {
    return db
      .select({ tableNumber: posTableState.tableNumber, stateJson: posTableState.stateJson })
      .from(posTableState)
      .where(eq(posTableState.restaurantId, restaurantId))
      .all();
  }

  async upsertPosTableState(restaurantId: number, tableNumber: number, stateJson: string): Promise<void> {
    db.delete(posTableState)
      .where(and(eq(posTableState.restaurantId, restaurantId), eq(posTableState.tableNumber, tableNumber)))
      .run();
    db.insert(posTableState).values({ restaurantId, tableNumber, stateJson, updatedAt: new Date() }).run();
  }

  async clearPosTableState(restaurantId: number, tableNumber: number): Promise<void> {
    db.delete(posTableState)
      .where(and(eq(posTableState.restaurantId, restaurantId), eq(posTableState.tableNumber, tableNumber)))
      .run();
  }
}
