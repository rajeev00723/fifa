import { fetchScorers } from "../lib/provider.js";
import { cacheGet, cacheSet, KEYS, TTL } from "../lib/cache.js";

export default async function handler(req, res) {
  try {
    let data = await cacheGet(KEYS.scorers);
    if (!data) {
      data = await fetchScorers();
      await cacheSet(KEYS.scorers, data, TTL.scorers);
    }
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(503).json({ error: "Scorers unavailable", detail: e.message });
  }
}
