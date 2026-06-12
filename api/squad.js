import { fetchTeamSquad } from "../lib/provider.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

// GET /api/squad?id=759  → player profiles for one team.
// Squads barely change mid-tournament, so cache a full day.
export default async function handler(req, res) {
  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: "Missing ?id=" });
  const key = `wc:squad:${id}`;
  try {
    let data = await cacheGet(key);
    if (!data) {
      data = await fetchTeamSquad(id);
      await cacheSet(key, data, 86400);
    }
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=3600");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(503).json({ error: "Squad unavailable", detail: e.message });
  }
}