import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  doublePrecision,
  index,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const restaurants = pgTable(
  "restaurants",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    descriptionAl: text("description_al"),
    descriptionMk: text("description_mk"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    photoUrl: text("photo_url"),
    website: text("website"),
    phoneNumber: text("phone_number"),
    location: text("location"),
    openingTime: text("opening_time").default("08:00"),
    closingTime: text("closing_time").default("22:00"),
    active: boolean("active").default(true).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    tableCount: integer("table_count").default(0).notNull(),
    wifiPassword: text("wifi_password"),
    orderMode: text("order_mode").default("whatsapp").notNull(),
  },
  (table) => ({ slugIdx: index("slug_idx").on(table.slug) }),
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameAl: text("name_al"),
    nameMk: text("name_mk"),
    description: text("description"),
    descriptionAl: text("description_al"),
    descriptionMk: text("description_mk"),
    price: text("price").notNull(),
    category: text("category").notNull().default("Main"),
    imageUrl: text("image_url"),
    active: boolean("active").default(true).notNull(),
    isVegetarian: boolean("is_vegetarian").default(false).notNull(),
    isVegan: boolean("is_vegan").default(false).notNull(),
    isGlutenFree: boolean("is_gluten_free").default(false).notNull(),
    isSpicy: boolean("is_spicy").default(false).notNull(),
    containsNuts: boolean("is_contains_nuts").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    specialDiscount: integer("special_discount"),
    specialType: text("special_type"),
  },
  (table) => ({
    restaurantIdIdx: index("restaurant_id_idx").on(table.restaurantId),
  }),
);


export const waiters = pgTable("waiters", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pinCode: text("pin_code").notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  tableNumber: integer("table_number").notNull(),
  cart: text("cart").notNull(),
  customerNote: text("customer_note"),
  status: text("status").notNull().default("pending"),
  waiterId: integer("waiter_id").references(() => waiters.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tableAssignments = pgTable(
  "table_assignments",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    tableNumber: integer("table_number").notNull(),
    waiterId: integer("waiter_id")
      .notNull()
      .references(() => waiters.id, { onDelete: "cascade" }),
  },
  (table) => ({
    taIdx: index("ta_restaurant_table_idx").on(table.restaurantId, table.tableNumber),
  }),
);

export const posTableState = pgTable(
  "pos_table_state",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    tableNumber: integer("table_number").notNull(),
    stateJson: text("state_json").notNull().default("{}"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    posStateIdx: index("pos_state_restaurant_table_idx").on(table.restaurantId, table.tableNumber),
  }),
);

// === RELATIONS ===
export const usersRelations = relations(users, ({ many }) => ({
  restaurants: many(restaurants),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  user: one(users, { fields: [restaurants.userId], references: [users.id] }),
  menuItems: many(menuItems),
  waiters: many(waiters),
  orders: many(orders),
}));

export const waitersRelations = relations(waiters, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [waiters.restaurantId],
    references: [restaurants.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.id],
  }),
  waiter: one(waiters, {
    fields: [orders.waiterId],
    references: [waiters.id],
  }),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [menuItems.restaurantId],
    references: [restaurants.id],
  }),
}));

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users);

export const insertRestaurantSchema = createInsertSchema(restaurants, {
  latitude: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().nullable(),
  ),
  longitude: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().nullable(),
  ),
}).omit({ id: true });

export const insertMenuItemSchema = createInsertSchema(menuItems, {
  name: z.string().min(1),
  nameAl: z.string().optional().nullable(),
  nameMk: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  specialDiscount: z.number().optional().nullable(),
  specialType: z.string().optional().nullable(),
}).omit({ id: true });

export const insertWaiterSchema = createInsertSchema(waiters, {
  name: z.string().min(1),
  pinCode: z.string().length(3).regex(/^\d{3}$/, "PIN must be 3 digits"),
}).omit({ id: true });

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

// === EXPLICIT TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type Waiter = typeof waiters.$inferSelect;
export type InsertWaiter = z.infer<typeof insertWaiterSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type TableAssignment = typeof tableAssignments.$inferSelect;
