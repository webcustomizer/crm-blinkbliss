import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 60_000;
const LOGIN_MAX = 5;
const FORM_MAX = 8;
const API_MAX = 60;

let redis: Redis | null = null;
let loginLimiter: Ratelimit | null = null;
let formLimiter: Ratelimit | null = null;
let apiLimiter: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(LOGIN_MAX, "60 s"),
    analytics: true,
    prefix: "rl:login",
  });

  formLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(FORM_MAX, "60 s"),
    analytics: true,
    prefix: "rl:form",
  });

  apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(API_MAX, "60 s"),
    analytics: true,
    prefix: "rl:api",
  });
}

// Fallback: in-memory for local dev when Upstash is not configured
const fallbackStore = new Map<string, { count: number; resetAt: number }>();

if (!redis) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of fallbackStore.entries()) {
      if (now > entry.resetAt) fallbackStore.delete(key);
    }
  }, 300_000);
}

export async function rateLimit(ip: string, type: "api" | "login" | "form" = "api"): Promise<boolean> {
  if (redis) {
    const limiter = type === "login" ? loginLimiter! : type === "form" ? formLimiter! : apiLimiter!;
    const { success } = await limiter.limit(ip);
    return success;
  }

  // Fallback to in-memory (local dev only)
  const now = Date.now();
  const key = `${type}:${ip}`;
  const entry = fallbackStore.get(key);
  const max = type === "login" ? LOGIN_MAX : type === "form" ? FORM_MAX : API_MAX;

  if (!entry || now > entry.resetAt) {
    fallbackStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
