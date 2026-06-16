import { fetchMatchDetail, fetchTeamSquad } from "../lib/provider.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

/**
 * Combined match + squad endpoint to stay within Vercel Hobby 12-function limit.
 *
 * GET /api/match?id=12345       → match detail (goals, lineups, cards)
 * GET /api/match?squad=759      → team squad (players, positions, ages)
 */
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // Squad mode
  if (req.query?.squad !== undefined) {
    const id = req.query.squad;
    // Validate: must be a positive integer
    if (!id || id === "null" || id === "undefined" || !/^\d+$/.test(id)) {
      return res.status(400).json({ error: "Invalid team ID — tap a team row in Standings to load their squad." });
    }
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
      return res.status(503).json({ error: "Squad unavailable — the free data tier may not include this team's squad. Try again after the team plays their first match.", detail: e.message });
    }
  }

  // Match detail mode
  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: "Missing ?id= or ?squad=" });
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