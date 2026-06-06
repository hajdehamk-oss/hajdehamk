import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import cookieSession from "cookie-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { User as SelectUser } from "../shared/schema.js";

const scryptAsync = promisify(scrypt);

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "e9b8168c9ece2b863894938c631e7e3b698175ff96a07b3a13a9e112a2a2a2f3";

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (stored.startsWith("$2")) {
    return bcrypt.compare(supplied, stored);
  }
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derivedKey = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
}

// ── DB-persisted token store (survives server restarts) ───────────────────────
export async function generateToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.execute(
    `INSERT INTO user_tokens (token, user_id) VALUES ('${token}', ${userId}) ON CONFLICT (token) DO NOTHING`,
  );
  return token;
}

export async function getUserFromToken(
  token: string,
): Promise<SelectUser | null> {
  // Try JWT first (used by Vercel serverless api/ functions)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    if (decoded?.id) {
      return (await storage.getUser(decoded.id)) ?? null;
    }
  } catch {
    // not a JWT, fall through to DB lookup
  }

  // Fall back to DB hex token lookup
  try {
    const result = await db.execute(
      `SELECT user_id FROM user_tokens WHERE token = '${token}' LIMIT 1`,
    );
    const rows = (result as any).rows ?? result;
    if (!rows || rows.length === 0) return null;
    const userId = rows[0].user_id;
    return (await storage.getUser(userId)) ?? null;
  } catch {
    return null;
  }
}

// ── Middleware: attach user from Bearer token if session auth didn't work ─────
export async function attachTokenUser(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.isAuthenticated()) return next();
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const user = await getUserFromToken(token);
      if (user) {
        (req as any).user = user;
        (req as any)._tokenAuth = true;
      }
    } catch {
      // token lookup failed, continue without user
    }
  }
  next();
}

export function setupAuth(app: Express) {
  app.use(
    cookieSession({
      name: "session",
      keys: [process.env.SESSION_SECRET || "r3pl1t_s3cr3t_k3y"],
      maxAge: 24 * 60 * 60 * 1000,
      secure: false,
      httpOnly: false,
      sameSite: "lax",
    }),
  );
  app.use((req, res, next) => {
    if (req.session && !req.session.regenerate) {
      req.session.regenerate = (cb: any) => cb();
    }
    if (req.session && !req.session.save) {
      req.session.save = (cb: any) => cb();
    }
    next();
  });
  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(attachTokenUser);
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Invalid username" });
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) return done(null, false, { message: "Invalid password" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );
  passport.serializeUser((user, done) => {
    done(null, (user as SelectUser).id);
  });
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  return { hashPassword };
}
