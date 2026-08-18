import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../shared/schema-local.js";
import path from "path";
import fs from "fs";

// DB path: use LOCAL_DB_PATH env var (set by Electron main) or fall back to cwd
const dbPath =
  process.env.LOCAL_DB_PATH ||
  path.join(process.cwd(), "hajdeha-local.db");

// Ensure directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables if they don't exist (schema migration for SQLite)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    description_al TEXT,
    description_mk TEXT,
    user_id INTEGER NOT NULL DEFAULT 1,
    photo_url TEXT,
    website TEXT,
    phone_number TEXT,
    location TEXT,
    opening_time TEXT DEFAULT '08:00',
    closing_time TEXT DEFAULT '22:00',
    active INTEGER NOT NULL DEFAULT 1,
    latitude REAL,
    longitude REAL,
    table_count INTEGER NOT NULL DEFAULT 0,
    wifi_password TEXT,
    order_mode TEXT NOT NULL DEFAULT 'pos'
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    name TEXT NOT NULL,
    name_al TEXT,
    name_mk TEXT,
    description TEXT,
    description_al TEXT,
    description_mk TEXT,
    price TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Main',
    image_url TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    is_vegetarian INTEGER NOT NULL DEFAULT 0,
    is_vegan INTEGER NOT NULL DEFAULT 0,
    is_gluten_free INTEGER NOT NULL DEFAULT 0,
    is_spicy INTEGER NOT NULL DEFAULT 0,
    is_contains_nuts INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    special_discount INTEGER,
    special_type TEXT
  );

  CREATE TABLE IF NOT EXISTS menu_price_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    item_key TEXT NOT NULL,
    price TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    UNIQUE (restaurant_id, item_key)
  );

  CREATE TABLE IF NOT EXISTS waiters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    name TEXT NOT NULL,
    pin_code TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    table_number INTEGER NOT NULL,
    cart TEXT NOT NULL,
    customer_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    waiter_id INTEGER REFERENCES waiters(id),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS table_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    table_number INTEGER NOT NULL,
    waiter_id INTEGER NOT NULL REFERENCES waiters(id)
  );

  CREATE TABLE IF NOT EXISTS pos_table_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
    table_number INTEGER NOT NULL,
    state_json TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );
`);

export const localDb = drizzle(sqlite, { schema });
export { sqlite };
