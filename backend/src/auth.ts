import crypto from "node:crypto";
import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verifies Firebase Authentication ID tokens using Google's public keys
 * (no service-account credentials needed). Sets req.uid on success.
 * Configure the project with FIREBASE_PROJECT_ID.
 */
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID?.trim() || "your-ai-477bf";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
export const AUTH_REQUIRED = process.env.AUTH_REQUIRED?.trim().toLowerCase() !== "false";

declare module "express-serve-static-core" {
  interface Request {
    uid?: string;
  }
}

export async function verifyIdToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
    algorithms: ["RS256"],
  });
  if (!payload.sub || typeof payload.sub !== "string") throw new Error("missing sub");
  return payload.sub;
}

/** Stable, non-reversible id used for per-user storage paths (never expose raw uids in URLs). */
export const userKey = (uid: string) => crypto.createHash("sha256").update(`galaxy:${uid}`).digest("hex").slice(0, 24);

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    if (!AUTH_REQUIRED) return next();
    res.status(401).json({ error: { code: "unauthenticated", message: "Please sign in to use Galaxy AI." } });
    return;
  }
  try {
    req.uid = await verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: { code: "unauthenticated", message: "Your session has expired. Please sign in again." } });
  }
};
