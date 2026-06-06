import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function seed() {
  console.log("Starting seed...");

  try {
    // Check if admin already exists
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, "hajdeha"),
    });

    if (existingAdmin) {
      console.log("Admin user already exists!");
      return;
    }

    // Create admin user
    const hashedPassword = await hashPassword("DesiigneR.123");
    
    await db.insert(users).values({
      username: "hajdeha",
      password: hashedPassword,
    });

    console.log("✅ Admin user created successfully!");
    console.log("Username: hajdeha");
    console.log("Password: DesiigneR.123");
  } catch (error) {
    console.error("Error during seed:", error);
    throw error;
  }

  process.exit(0);
}

seed();
