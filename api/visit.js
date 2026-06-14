import { cacheGet, cacheSet } from "../lib/cache.js";

/**
 * POST /api/visit  — called once per page load from the frontend
 * GET  /api/visit  — returns current stats (for the homepage widget)
 *
 * Stores three counters in KV:
 *   wc:visits:total          — all-time unique page loads
 *   wc:visits:YYYY-MM-DD     — today's count (expires after 48h)
 *   wc:visits:history        — last 14 daily counts as a JSON array
 *
 * No personal data is stored — just incrementing integers.
 * Privacy-safe: no IP, no fingerprint, no cookies.
 */
export const config = { runtime: "nodejs" };

const today = () => new Date().toISOString().slice(0, 10);

async function increment() {
  // Total visits
  const totalRaw = await cacheGet("wc:visits:total").catch(() => null);
  const total = parseInt(totalRaw?.value ?? totalRaw ?? "0", 10) || 0;
  await cacheSet("wc:visits:total", String(total + 1), 0); // no expiry

  // Today's visits
  const dayKey = `wc:visits:${today()}`;
  const dayRaw = await cacheGet(dayKey).catch(() => null);
  const dayCount = parseInt(dayRaw?.value ?? dayRaw ?? "0", 10) || 0;
  const newDay = dayCount + 1;
  await cacheSet(dayKey, String(newDay), 172800); // 48h TTL

  // History — last 14 days as [{date, count}]
  const histRaw = await cacheGet("wc:visits:history").catch(() => null);
  let history = [];
  try { history = JSON.parse(histRaw?.value ?? histRaw ?? "[]"); } catch {}
  // Update or append today's entry
  const idx = history.findIndex(h => h.date === today());
  if (idx >= 0) history[idx].count = newDay;
  else history.push({ date: today(), count: newDay });
  // Keep last 14 days only
  history = history.sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  await cacheSet("wc:visits:history", JSON.stringify(history), 0);

  return { total: total + 1, today: newDay, history };
}

async function getStats() {
  const totalRaw = await cacheGet("wc:visits:total").catch(() => null);
  const total = parseInt(totalRaw?.value ?? totalRaw ?? "0", 10) || 0;
  const dayKey = `wc:visits:${today()}`;
  const dayRaw = await cacheGet(dayKey).catch(() => null);
  const todayCount = parseInt(dayRaw?.value ?? dayRaw ?? "0", 10) || 0;
  const histRaw = await cacheGet("wc:visits:history").catch(() => null);
  let history = [];
  try { history = JSON.parse(histRaw?.value ?? histRaw ?? "[]"); } catch {}
  return { total, today: todayCount, history };
}

export default async function handler(req, res) {
  try {
    let stats;
    if (req.method === "POST") {
      stats = await increment();
    } else {
      stats = await getStats();
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(stats);
  } catch (e) {
    // Never fail silently in a way that blocks page load
    console.error("visit counter error:", e.message);
    return res.status(200).json({ total: 0, today: 0, history: [], error: e.message });
  }
}