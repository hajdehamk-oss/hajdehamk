import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

// SQLite version of the schema — mirrors shared/schema.ts but uses SQLite types.
// boolean → integer({ mode: "boolean" })
// doublePrecision → real()
// serial → integer().primaryKey({ autoIncrement: true })
// timestamp → integer({ mode: "timestamp" })

export const restaurants = sqliteTable("restaurants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  descriptionAl: text("description_al"),
  descriptionMk: text("description_mk"),
  userId: integer("user_id").notNull().default(1),
  photoUrl: text("photo_url"),
  website: text("website"),
  phoneNumber: text("phone_number"),
  location: text("location"),
  openingTime: text("opening_time").default("08:00"),
  closingTime: text("closing_time").default("22:00"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  tableCount: integer("table_count").default(0).notNull(),
  wifiPassword: text("wifi_password"),
  orderMode: text("order_mode").default("pos").notNull(),
});

export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  name: text("name").notNull(),
  nameAl: text("name_al"),
  nameMk: text("name_mk"),
  description: text("description"),
  descriptionAl: text("description_al"),
  descriptionMk: text("description_mk"),
  price: text("price").notNull(),
  category: text("category").notNull().default("Main"),
  imageUrl: text("image_url"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  isVegetarian: integer("is_vegetarian", { mode: "boolean" }).default(false).notNull(),
  isVegan: integer("is_vegan", { mode: "boolean" }).default(false).notNull(),
  isGlutenFree: integer("is_gluten_free", { mode: "boolean" }).default(false).notNull(),
  isSpicy: integer("is_spicy", { mode: "boolean" }).default(false).notNull(),
  containsNuts: integer("is_contains_nuts", { mode: "boolean" }).default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  specialDiscount: integer("special_discount"),
  specialType: text("special_type"),
});

export const menuPriceOverrides = sqliteTable("menu_price_overrides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  itemKey: text("item_key").notNull(),
  price: text("price").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const waiters = sqliteTable("waiters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  name: text("name").notNull(),
  pinCode: text("pin_code").notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  tableNumber: integer("table_number").notNull(),
  cart: text("cart").notNull(),
  customerNote: text("customer_note"),
  status: text("status").notNull().default("pending"),
  waiterId: integer("waiter_id").references(() => waiters.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const tableAssignments = sqliteTable("table_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  tableNumber: integer("table_number").notNull(),
  waiterId: integer("waiter_id")
    .notNull()
    .references(() => waiters.id),
});

export const posTableState = sqliteTable("pos_table_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  restaurantId: integer("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  tableNumber: integer("table_number").notNull(),
  stateJson: text("state_json").notNull().default("{}"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type Restaurant = typeof restaurants.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type MenuPriceOverride = typeof menuPriceOverrides.$inferSelect;
export type Waiter = typeof waiters.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type TableAssignment = typeof tableAssignments.$inferSelect;
