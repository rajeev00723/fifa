import { fetchLiveAndToday, fetchStandings, fetchScorers } from "../../lib/provider.js";
import { cacheSet, cacheGet, KEYS, TTL } from "../../lib/cache.js";
import { fetchBracket } from "../../lib/bracket.js";

/**
 * The "intelligent pull on an interval" engine.
 *
 * Vercel Cron calls this endpoint on a schedule (see vercel.json). It:
 *   1. ALWAYS refreshes live data (cheap, time-sensitive).
 *   2. Refreshes standings/scorers only when their cache has expired, so we
 *      don't waste quota re-pulling slow-moving data every minute.
 *
 * Smart skip: if there are no live or upcoming matches today, we still refresh
 * once but you could widen the cron interval off-tournament to save calls.
 *
 * Security: Vercel sets the CRON_SECRET automatically and sends it as a Bearer
 * token. We reject anything else so randoms can't trigger your provider calls.
 */
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const did = [];
  try {
    // 1. Live — always refresh.
    const live = await fetchLiveAndToday();
    await cacheSet(KEYS.live, live, TTL.live);
    did.push(`live(${live.live.length} in play)`);

    // 2. Standings — refresh only if stale.
    if (!(await cacheGet(KEYS.standings))) {
      const standings = await fetchStandings();
      await cacheSet(KEYS.standings, standings, TTL.standings);
      did.push("standings");
    }
    try {
      const bracket = await fetchBracket();
      await cacheSet("wc:bracket:state", bracket, 60 * 60 * 6); // 6h TTL
    } catch (e) {
      console.error("[cron] bracket sync failed:", e.message);
    }

    // 3. Scorers — refresh only if stale.
    if (!(await cacheGet(KEYS.scorers))) {
      const scorers = await fetchScorers();
      await cacheSet(KEYS.scorers, scorers, TTL.scorers);
      did.push("scorers");
    }

    return res.status(200).json({ ok: true, refreshed: did, at: new Date().toISOString() });
  } catch (e) {
    // Don't throw — a failed pull shouldn't kill the cron. Log and report.
    console.error("cron refresh failed:", e.message);
    return res.status(200).json({ ok: false, error: e.message, refreshed: did });
  }
}
