import { fetchMatchDetail } from "../lib/provider.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

// GET /api/match?id=12345  → goal timeline, lineups, cards for one match.
// Cached 60s per match id (live matches change; finished ones are stable).
export default async function handler(req, res) {
  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: "Missing ?id=" });
  const key = `wc:match:${id}`;
  try {
    let data = await cacheGet(key);
    if (!data) {
      data = await fetchMatchDetail(id);
      await cacheSet(key, data, 60);
    }
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(503).json({ error: "Match detail unavailable", detail: e.message });
  }
}