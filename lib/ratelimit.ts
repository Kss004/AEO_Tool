import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds: number;
};

let cached: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  cached = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: false,
    prefix: "aeo:analyze",
  });
  return cached;
}

const ALLOW: RateResult = {
  ok: true,
  limit: Infinity,
  remaining: Infinity,
  reset: 0,
  retryAfterSeconds: 0,
};

export async function rateLimit(identifier: string): Promise<RateResult> {
  const limiter = getLimiter();
  if (!limiter) return ALLOW;

  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
  return { ok: success, limit, remaining, reset, retryAfterSeconds };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anon";
}
