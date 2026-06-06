import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("sslmode=require") || process.env.DATABASE_URL.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
});

export const db = drizzle(pool, { schema });
