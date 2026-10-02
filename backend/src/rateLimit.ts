import type { RequestHandler } from "express";

/** Small in-memory fixed-window limiter per client IP (single-instance deployments). */
export function rateLimit(perMinute: number): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, 60_000).unref();

  return (req, res, next) => {
    if (perMinute <= 0) return next();
    const key = req.ip ?? "unknown";
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + 60_000 };
      hits.set(key, entry);
    }
    entry.count++;
    if (entry.count > perMinute) {
      const retry = Math.ceil((entry.reset - now) / 1000);
      res.setHeader("Retry-After", String(retry));
      res.status(429).json({ error: { code: "rate_limited", message: `Too many requests. Please wait ${retry}s and try again.` } });
      return;
    }
    next();
  };
}
