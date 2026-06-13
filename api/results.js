import { fetchPastMatches } from "../lib/provider.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // Parse days param safely — default 7, cap at 30
  let days = 7;
  try { days = Math.min(30, Math.max(1, parseInt(req.query?.days || "7", 10))); } catch {}
  if (isNaN(days)) days = 7;

  const key = `wc:results:${days}`;
  try {
    let data = await cacheGet(key);
    if (!data) {
      data = await fetchPastMatches(days);
      await cacheSet(key, data, 600);
    }
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=300");
    return res.status(200).json(data);
  } catch (e) {
    // Always return JSON — never let Vercel's HTML error page reach the frontend
    console.error("results endpoint error:", e.message);
    return res.status(503).json({ error: "Results unavailable", detail: e.message });
  }
}