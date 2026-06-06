import { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../server/db.js";
import { users } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { compare } from "bcryptjs";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "e9b8168c9ece2b863894938c631e7e3b698175ff96a07b3a13a9e112a2a2a2f3";

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ message: "Username and password are required" });

  const [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user)
    return res.status(401).json({ message: "Invalid username or password" });

  const isMatch = await compare(password, user.password);
  if (!isMatch)
    return res.status(401).json({ message: "Invalid username or password" });

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "24h" },
  );
  return res.status(200).json({ token, user: { id: user.id, username: user.username } });
}

async function handleMe(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ message: "Not authenticated" });

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ user: userWithoutPassword });
  } catch {
    return res.status(401).json({ message: "Not authenticated" });
  }
}

async function handleList(_req: VercelRequest, res: VercelResponse) {
  const allUsers = await db.select().from(users);
  const safe = allUsers.map(({ password: _, ...u }) => u);
  return res.status(200).json(safe);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;
  try {
    if (action === "login") return await handleLogin(req, res);
    if (action === "logout") return res.status(200).json({ ok: true });
    if (action === "me") return await handleMe(req, res);
    if (action === "list") return await handleList(req, res);
    return res.status(400).json({ message: "Invalid action" });
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ message: "Internal server error", error: String(error) });
  }
}
