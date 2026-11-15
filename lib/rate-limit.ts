/**
 * lib/rate-limit.ts
 *
 * One limiter for every route. Upstash when it's configured; otherwise a map in
 * memory, which is enough for development and for a single server.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { upstashEnabled } from "./env";

type Rule = { max: number; windowSec: number };
const memory = new Map<string, { count: number; resetAt: number }>();
const limiters = new Map<string, Ratelimit>();

export async function rateLimit(name: string, who: string, rule: Rule): Promise<{ ok: boolean }> {
  if (upstashEnabled) {
    const key = `${name}:${rule.max}:${rule.windowSec}`;
    let limiter = limiters.get(key);
    if (!limiter) {
      limiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(rule.max, `${rule.windowSec} s`), prefix: `ah:${name}` });
      limiters.set(key, limiter);
    }
    const res = await limiter.limit(who);
    return { ok: res.success };
  }
  const now = Date.now();
  const k = `${name}:${who}`;
  const hit = memory.get(k);
  if (!hit || hit.resetAt < now) {
    memory.set(k, { count: 1, resetAt: now + rule.windowSec * 1000 });
    return { ok: true };
  }
  hit.count += 1;
  return { ok: hit.count <= rule.max };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
