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
  const url =
    process.env.KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token =
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  const max = Number(process.env.RATE_LIMIT_PER_HOUR ?? 20);
  cached = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, "1 h"),
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

  let result;
  try {
    result = await limiter.limit(identifier);
  } catch {
    // ponytail: fail open locally; make this fail closed if abuse becomes real.
    return ALLOW;
  }
  const { success, limit, remaining, reset } = result;
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
