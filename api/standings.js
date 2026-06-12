import { fetchStandings } from "../lib/provider.js";
import { cacheGet, cacheSet, KEYS, TTL } from "../lib/cache.js";

export default async function handler(req, res) {
  try {
    let data = await cacheGet(KEYS.standings);
    if (!data) {
      data = await fetchStandings();
      await cacheSet(KEYS.standings, data, TTL.standings);
    }
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(503).json({ error: "Standings unavailable", detail: e.message });
  }
}
