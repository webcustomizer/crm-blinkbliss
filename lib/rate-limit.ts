import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 60_000;
const LOGIN_MAX = 5;
const FORM_MAX = 8;
const API_MAX = 60;

let _redis: Redis | null = null;
let _loginLimiter: Ratelimit | null = null;
let _formLimiter: Ratelimit | null = null;
let _apiLimiter: Ratelimit | null = null;
let _initialized = false;

function ensureUpstash() {
  if (_initialized) return;
  _initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token && url.startsWith("https://")) {
    _redis = new Redis({ url, token });

    _loginLimiter = new Ratelimit({
      redis: _redis,
      limiter: Ratelimit.slidingWindow(LOGIN_MAX, "60 s"),
      analytics: true,
      prefix: "rl:login",
    });

    _formLimiter = new Ratelimit({
      redis: _redis,
      limiter: Ratelimit.slidingWindow(FORM_MAX, "60 s"),
      analytics: true,
      prefix: "rl:form",
    });

    _apiLimiter = new Ratelimit({
      redis: _redis,
      limiter: Ratelimit.slidingWindow(API_MAX, "60 s"),
      analytics: true,
      prefix: "rl:api",
    });
  }
}

const fallbackStore = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of fallbackStore.entries()) {
    if (now > entry.resetAt) fallbackStore.delete(key);
  }
}, 300_000);

export async function rateLimit(ip: string, type: "api" | "login" | "form" = "api"): Promise<boolean> {
  ensureUpstash();

  if (_redis) {
    const limiter = type === "login" ? _loginLimiter! : type === "form" ? _formLimiter! : _apiLimiter!;
    const { success } = await limiter.limit(ip);
    return success;
  }

  // Fallback to in-memory (local dev / build time)
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
