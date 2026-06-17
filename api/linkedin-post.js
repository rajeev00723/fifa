import { postToLinkedIn, formatMatchPost } from "../lib/linkedin.js";
import { fetchLiveAndToday } from "../lib/provider.js";
import { fetchMatchDetail } from "../lib/provider.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

/**
 * POST /api/linkedin-post
 *
 * Two modes:
 *   1. Automatic (called from cron or after match) — finds recently
 *      finished matches and posts them to LinkedIn.
 *   2. Manual with body { matchId, home, away, homeScore, awayScore, stage }
 *      — posts a specific match you specify.
 *
 * Deduplication: tracks posted match IDs in cache (wc:linkedin:posted:MATCHID)
 * so the same match is never posted twice even if called repeatedly.
 *
 * Auth: requires CRON_SECRET header for automated calls.
 */
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Auth check
  const auth = req.headers.authorization || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check LinkedIn is configured
  if (!process.env.LINKEDIN_ACCESS_TOKEN || !process.env.LINKEDIN_PERSON_ID) {
    return res.status(503).json({ error: "LinkedIn not configured. Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_ID to Vercel env vars." });
  }

  try {
    const body = req.body || {};
    const posted = [];
    const skipped = [];

    // ── MODE 1: Manual post for a specific match ──────────────────────────
    if (body.matchId || (body.home && body.away)) {
      const dedupeKey = `wc:linkedin:posted:${body.matchId||body.home+body.away}`;
      const alreadyPosted = await cacheGet(dedupeKey).catch(() => null);
      if (alreadyPosted) return res.status(200).json({ ok: true, skipped: ["already posted"] });

      // Fetch facts from story endpoint if matchId provided
      let facts = body.facts || [];
      if (body.matchId && facts.length === 0) {
        try {
          const d = await fetchMatchDetail(body.matchId);
          const goals = d.events.filter(e => e.type === "GOAL");
          if (goals.length) facts.push(`Goals: ${goals.map(g => `${g.player} ${g.minute}'`).join(", ")}`);
          const reds = d.events.filter(e => e.type === "RED");
          if (reds.length) facts.push(`Red card: ${reds[0].player} (${reds[0].team})`);
        } catch {}
      }

      const text = formatMatchPost({
        home: body.home, away: body.away,
        homeScore: body.homeScore ?? 0, awayScore: body.awayScore ?? 0,
        facts, stage: body.stage
      });

      const result = await postToLinkedIn({ text });
      await cacheSet(dedupeKey, result.postId, 604800); // 7 days
      return res.status(200).json({ ok: true, posted: [result] });
    }

    // ── MODE 2: Auto-detect recently finished matches ─────────────────────
    const today = await fetchLiveAndToday();
    const finished = today.finishedToday;

    for (const m of finished) {
      const dedupeKey = `wc:linkedin:posted:${m.id}`;
      const alreadyPosted = await cacheGet(dedupeKey).catch(() => null);
      if (alreadyPosted) { skipped.push(m.id); continue; }

      // Fetch match facts
      let facts = [];
      try {
        const d = await fetchMatchDetail(m.id);
        const goals = d.events.filter(e => e.type === "GOAL");
        if (goals.length) {
          const scorers = {};
          goals.forEach(g => { if (g.player) scorers[g.player] = (scorers[g.player]||0)+1; });
          Object.entries(scorers).forEach(([p,c]) => {
            facts.push(c > 1 ? `${p} (${c})` : p);
          });
          if (facts.length) facts[0] = "⚽ " + facts.join(", ");
          facts = [facts[0]]; // one clean scorers line
        }
        const reds = d.events.filter(e => e.type === "RED");
        if (reds.length) facts.push(`🟥 ${reds[0].player} sent off (${reds[0].team})`);
        const late = goals.filter(g => g.minute >= 85);
        if (late.length) facts.push(`⏱ Late drama in the ${late[late.length-1].minute}th minute`);
      } catch {}

      const text = formatMatchPost({
        home: m.home.name,
        away: m.away.name,
        homeScore: m.home.score ?? 0,
        awayScore: m.away.score ?? 0,
        facts,
        stage: m.stage?.replace(/_/g," "),
      });

      try {
        const result = await postToLinkedIn({ text });
        await cacheSet(dedupeKey, result.postId, 604800);
        posted.push({ match: `${m.home.name} vs ${m.away.name}`, ...result });
        // Small delay between posts to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        skipped.push(`${m.home.name} vs ${m.away.name}: ${e.message}`);
      }
    }

    return res.status(200).json({ ok: true, posted, skipped, total: finished.length });
  } catch (e) {
    console.error("LinkedIn post error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}