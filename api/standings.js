import { fetchStandings } from "../lib/provider.js";
import { cacheGet, cacheSet, KEYS, TTL } from "../lib/cache.js";

export default async function handler(req, res) {
  if (req.query?.action === "bracket") {
    try {
      let bracket = await cacheGet("wc:bracket:state");
      if (!bracket) {
        const { fetchBracket } = await import("../lib/bracket.js");
        bracket = await fetchBracket();
        await cacheSet("wc:bracket:state", bracket, 60 * 60 * 6);
      }
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
      return res.status(200).json(bracket);
    } catch (e) {
      return res.status(502).json({ error: "bracket_fetch_failed", detail: e.message });
    }
  }

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
