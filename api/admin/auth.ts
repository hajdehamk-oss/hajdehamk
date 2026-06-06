import { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";

export const JWT_SECRET =
  process.env.JWT_SECRET ||
  "e9b8168c9ece2b863894938c631e7e3b698175ff96a07b3a13a9e112a2a2a2f3";

export function verifyToken(
  req: VercelRequest,
): { userId: number; username: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    // The token contains { id, username } from /api/login.ts
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      username: string;
    };

    // Map 'id' to 'userId' for consistency with your route handlers
    return { userId: decoded.id, username: decoded.username };
  } catch (error) {
    return null;
  }
}

export function unauthorized(res: VercelResponse) {
  return res.status(401).json({ message: "Unauthorized access" });
}

export function forbidden(res: VercelResponse) {
  return res.status(403).json({ message: "Forbidden" });
}

export function methodNotAllowed(res: VercelResponse) {
  return res.status(405).json({ message: "Method not allowed" });
}

export function notFound(res: VercelResponse) {
  return res.status(404).json({ message: "Resource not found" });
}
