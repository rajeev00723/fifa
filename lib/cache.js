/**
 * Cache layer using @upstash/redis.
 *
 * Reads the KV_REST_API_URL / KV_REST_API_TOKEN env vars that Vercel
 * auto-injects when you connect Upstash Redis via the marketplace.
 * Falls back to in-memory cache for local dev without Redis configured.
 */

let redis = null;

async function getRedis() {
  if (redis) return redis;
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = await import("@upstash/redis");
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

// In-memory fallback for local dev
const mem = new Map();

export async function cacheGet(key) {
  const r = await getRedis();
  if (r) {
    try { const val = await r.get(key); return val ?? null; }
    catch { return null; }
  }
  const hit = mem.get(key);
  if (!hit) return null;
  if (hit.expires && Date.now() > hit.expires) { mem.delete(key); return null; }
  return hit.value;
}

export async function cacheSet(key, value, ttlSeconds) {
  const r = await getRedis();
  if (r) {
    try {
      if (ttlSeconds && ttlSeconds > 0) await r.set(key, value, { ex: ttlSeconds });
      else await r.set(key, value);
      return;
    } catch {}
  }
  mem.set(key, {
    value,
    expires: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null
  });
}

export async function cacheDelete(key) {
  const r = await getRedis();
  if (r) { try { await r.del(key); } catch {} return; }
  mem.delete(key);
}

export const KEYS = {
  live:      "wc:live",
  standings: "wc:standings",
  scorers:   "wc:scorers",
};

export const TTL = {
  live:      60,         // 60s — live scores must be fresh
  standings: 300,        // 5 min — standings update after each match
  scorers:   300,        // 5 min — scorer table changes during matches
  results:   600,        // 10 min — past results don't change
  squad:     86400,      // 24h — squads don't change mid-tournament
  story:     86400,      // 24h — match stories are final after FT
};