import { db } from "./db.js";
import { eq, and } from "drizzle-orm";
import {
  users,
  restaurants,
  menuItems,
  waiters,
  orders,
  tableAssignments,
  posTableState,
  type User,
  type InsertUser,
  type Restaurant,
  type InsertRestaurant,
  type MenuItem,
  type InsertMenuItem,
  type Waiter,
  type InsertWaiter,
  type Order,
  type InsertOrder,
  type TableAssignment,
} from "../shared/schema.js";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Restaurant operations
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantBySlug(slug: string): Promise<Restaurant | undefined>;
  getRestaurantsByUserId(userId: number): Promise<Restaurant[]>;
  getAllRestaurants(): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: number, updates: Partial<InsertRestaurant>): Promise<Restaurant>;
  deleteRestaurant(id: number): Promise<void>;

  // Menu Item operations
  getMenuItems(restaurantId: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, updates: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;

  // Waiter operations
  getWaiters(restaurantId: number): Promise<Waiter[]>;
  getWaiter(id: number): Promise<Waiter | undefined>;
  getWaiterByPin(restaurantId: number, pinCode: string): Promise<Waiter | undefined>;
  createWaiter(waiter: InsertWaiter): Promise<Waiter>;
  updateWaiter(id: number, updates: Partial<InsertWaiter>): Promise<Waiter>;
  deleteWaiter(id: number): Promise<void>;

  // Order operations
  getOrders(restaurantId: number, status?: string): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  claimOrder(id: number, waiterId: number): Promise<Order>;
  completeOrder(id: number): Promise<Order>;
  completeOrdersForTable(restaurantId: number, tableNumber: number): Promise<void>;

  // Table assignment operations
  getTableAssignments(restaurantId: number): Promise<(TableAssignment & { waiterName: string })[]>;
  upsertTableAssignment(restaurantId: number, tableNumber: number, waiterId: number): Promise<void>;
  deleteTableAssignment(restaurantId: number, tableNumber: number): Promise<void>;

  // POS table state (live sync)
  getPosTableStates(restaurantId: number): Promise<{ tableNumber: number; stateJson: string }[]>;
  upsertPosTableState(restaurantId: number, tableNumber: number, stateJson: string): Promise<void>;
  clearPosTableState(restaurantId: number, tableNumber: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Restaurant methods
  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant;
  }

  async getRestaurantBySlug(slug: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.slug, slug));
    return restaurant;
  }

  async getRestaurantsByUserId(userId: number): Promise<Restaurant[]> {
    return db.select().from(restaurants).where(eq(restaurants.userId, userId));
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return db.select().from(restaurants);
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [newRestaurant] = await db.insert(restaurants).values(restaurant).returning();
    return newRestaurant;
  }

  async updateRestaurant(id: number, updates: Partial<InsertRestaurant>): Promise<Restaurant> {
    const [updated] = await db.update(restaurants).set(updates).where(eq(restaurants.id, id)).returning();
    return updated;
  }

  async deleteRestaurant(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.restaurantId, id));
    await db.delete(restaurants).where(eq(restaurants.id, id));
  }

  // Menu Item methods
  async getMenuItems(restaurantId: number): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId));
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db.insert(menuItems).values(item).returning();
    return newItem;
  }

  async updateMenuItem(id: number, updates: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [updated] = await db.update(menuItems).set(updates).where(eq(menuItems.id, id)).returning();
    return updated;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Waiter methods
  async getWaiters(restaurantId: number): Promise<Waiter[]> {
    return db.select().from(waiters).where(eq(waiters.restaurantId, restaurantId));
  }

  async getWaiter(id: number): Promise<Waiter | undefined> {
    const [waiter] = await db.select().from(waiters).where(eq(waiters.id, id));
    return waiter;
  }

  async getWaiterByPin(restaurantId: number, pinCode: string): Promise<Waiter | undefined> {
    const [waiter] = await db
      .select()
      .from(waiters)
      .where(and(eq(waiters.restaurantId, restaurantId), eq(waiters.pinCode, pinCode)));
    return waiter;
  }

  async createWaiter(waiter: InsertWaiter): Promise<Waiter> {
    const [newWaiter] = await db.insert(waiters).values(waiter).returning();
    return newWaiter;
  }

  async updateWaiter(id: number, updates: Partial<InsertWaiter>): Promise<Waiter> {
    const [updated] = await db.update(waiters).set(updates).where(eq(waiters.id, id)).returning();
    return updated;
  }

  async deleteWaiter(id: number): Promise<void> {
    await db.update(orders).set({ waiterId: null }).where(eq(orders.waiterId, id));
    await db.delete(waiters).where(eq(waiters.id, id));
  }

  // Order methods
  async getOrders(restaurantId: number, status?: string): Promise<Order[]> {
    if (status) {
      return db
        .select()
        .from(orders)
        .where(and(eq(orders.restaurantId, restaurantId), eq(orders.status, status)));
    }
    return db.select().from(orders).where(eq(orders.restaurantId, restaurantId));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async claimOrder(id: number, waiterId: number): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({ waiterId, status: "claimed" })
      .where(and(eq(orders.id, id), eq(orders.status, "pending")))
      .returning();
    return updated;
  }

  async completeOrder(id: number): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({ status: "completed" })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async completeOrdersForTable(restaurantId: number, tableNumber: number): Promise<void> {
    await db
      .update(orders)
      .set({ status: "completed" })
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          eq(orders.tableNumber, tableNumber),
          // only close open orders — leave already-completed ones alone
        ),
      );
  }

  // Table assignment methods
  async getTableAssignments(restaurantId: number): Promise<(TableAssignment & { waiterName: string })[]> {
    const rows = await db
      .select({
        id: tableAssignments.id,
        restaurantId: tableAssignments.restaurantId,
        tableNumber: tableAssignments.tableNumber,
        waiterId: tableAssignments.waiterId,
        waiterName: waiters.name,
      })
      .from(tableAssignments)
      .innerJoin(waiters, eq(tableAssignments.waiterId, waiters.id))
      .where(eq(tableAssignments.restaurantId, restaurantId));
    return rows;
  }

  async upsertTableAssignment(restaurantId: number, tableNumber: number, waiterId: number): Promise<void> {
    await db
      .delete(tableAssignments)
      .where(and(eq(tableAssignments.restaurantId, restaurantId), eq(tableAssignments.tableNumber, tableNumber)));
    await db.insert(tableAssignments).values({ restaurantId, tableNumber, waiterId });
  }

  async deleteTableAssignment(restaurantId: number, tableNumber: number): Promise<void> {
    await db
      .delete(tableAssignments)
      .where(and(eq(tableAssignments.restaurantId, restaurantId), eq(tableAssignments.tableNumber, tableNumber)));
  }

  // POS table state methods
  async getPosTableStates(restaurantId: number): Promise<{ tableNumber: number; stateJson: string }[]> {
    const rows = await db
      .select({ tableNumber: posTableState.tableNumber, stateJson: posTableState.stateJson })
      .from(posTableState)
      .where(eq(posTableState.restaurantId, restaurantId));
    return rows;
  }

  async upsertPosTableState(restaurantId: number, tableNumber: number, stateJson: string): Promise<void> {
    await db
      .delete(posTableState)
      .where(and(eq(posTableState.restaurantId, restaurantId), eq(posTableState.tableNumber, tableNumber)));
    await db.insert(posTableState).values({ restaurantId, tableNumber, stateJson });
  }

  async clearPosTableState(restaurantId: number, tableNumber: number): Promise<void> {
    await db
      .delete(posTableState)
      .where(and(eq(posTableState.restaurantId, restaurantId), eq(posTableState.tableNumber, tableNumber)));
  }
}

export const storage = new DatabaseStorage();
