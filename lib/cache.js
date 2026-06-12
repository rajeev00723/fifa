/**
 * Tiny cache layer with two backends:
 *   1. Vercel KV (Upstash Redis) when KV_REST_API_URL is set — survives across
 *      serverless invocations, so the cron job's fresh data is visible to every
 *      visitor request.
 *   2. In-memory Map fallback for `vercel dev` / local runs (per-process only).
 *
 * Why this matters: visitors hit /api/live, which reads the CACHE, not the
 * provider. The cron job is the only thing that writes fresh data. That's what
 * keeps you inside the provider's free quota no matter how many people visit.
 */

let kv = null;
try {
  // Lazy import so local dev without KV still works.
  if (process.env.KV_REST_API_URL) {
    const mod = await import("@vercel/kv");
    kv = mod.kv;
  }
} catch {
  kv = null;
}

const mem = new Map();

export async function cacheGet(key) {
  if (kv) return (await kv.get(key)) ?? null;
  const hit = mem.get(key);
  if (!hit) return null;
  if (hit.expires && Date.now() > hit.expires) {
    mem.delete(key);
    return null;
  }
  return hit.value;
}

export async function cacheSet(key, value, ttlSeconds) {
  if (kv) {
    await kv.set(key, value, { ex: ttlSeconds });
    return;
  }
  mem.set(key, { value, expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
}

export const KEYS = {
  live: "wc:live",
  standings: "wc:standings",
  scorers: "wc:scorers",
};

// TTLs follow the golden rule: live data stays fresh ~60s, slow data caches long.
export const TTL = {
  live: 60,        // seconds
  standings: 3600, // 1 hour
  scorers: 1800,   // 30 minutes
};
