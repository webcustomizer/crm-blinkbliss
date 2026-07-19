// Simple in-memory rate limiter (per-IP)
// For production, replace with Redis-based solution
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute per IP
const LOGIN_MAX = 5; // 5 login attempts per minute per IP

export function rateLimit(ip: string, type: "api" | "login" = "api"): boolean {
  const now = Date.now();
  const key = `${type}:${ip}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  const max = type === "login" ? LOGIN_MAX : MAX_REQUESTS;
  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 300_000);
