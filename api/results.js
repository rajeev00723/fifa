import { fetchPastMatches, fetchMatchDetail } from "../lib/provider.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // Tournament-wide highlights mode — scans all matches played so far for
  // the best storylines (hat-tricks, routs, etc). Heavier to compute than
  // a normal results fetch, so cached for an hour.
  if (req.query?.highlights) {
    return handleTournamentHighlights(req, res);
  }

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

async function handleTournamentHighlights(req, res) {
  const key = "wc:results:tournament-highlights";
  try {
    let cached = await cacheGet(key);
    if (cached) {
      res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=1800");
      return res.status(200).json(cached);
    }

    // Scan everything played so far this tournament (up to 30 days back covers it)
    const past = await fetchPastMatches(30);
    const allFinished = Object.values(past.groups || {}).flat();

    const candidates = [];
    // Cap how many matches we fetch detail for — keep this endpoint reasonably fast
    const toScan = allFinished.slice(0, 40);

    for (const m of toScan) {
      try {
        const detail = await fetchMatchDetail(m.id);
        if (!detail.events) continue;
        const goals = detail.events.filter(e => e.type === "GOAL");
        const tally = {};
        goals.forEach(g => { if (g.player) tally[g.player] = (tally[g.player] || 0) + 1; });

        Object.entries(tally).forEach(([player, count]) => {
          if (count >= 2) {
            candidates.push({
              priority: count >= 3 ? 100 : 60,
              type: count >= 3 ? "hattrick" : "brace",
              text: `${player} scored ${count >= 3 ? "a hat-trick" : "a brace"} as ${m.home.name} ${m.home.score}\u2013${m.away.score} ${m.away.name}`,
              icon: count >= 3 ? "\ud83d\udd25" : "\u26bd",
              matchId: m.id,
              date: m.utcKickoff,
            });
          }
        });

        const margin = Math.abs((m.home.score ?? 0) - (m.away.score ?? 0));
        if (margin >= 4) {
          const winner = m.home.score > m.away.score ? m.home.name : m.away.name;
          candidates.push({
            priority: 50 + margin,
            type: "rout",
            text: `${winner} put on a statement performance \u2014 ${m.home.name} ${m.home.score}\u2013${m.away.score} ${m.away.name}`,
            icon: "\ud83d\udca5",
            matchId: m.id,
            date: m.utcKickoff,
          });
        }
      } catch { /* skip matches we can't fetch detail for */ }
    }

    candidates.sort((a, b) => b.priority - a.priority);
    const result = { highlights: candidates.slice(0, 10), generatedAt: new Date().toISOString() };

    await cacheSet(key, result, 3600);
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=1800");
    return res.status(200).json(result);
  } catch (e) {
    console.error("tournament highlights error:", e.message);
    return res.status(503).json({ error: "Tournament highlights unavailable", detail: e.message });
  }
}