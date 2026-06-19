import { fetchMatchDetail, fetchLiveAndToday } from "../lib/provider.js";
import { cacheGet, cacheSet } from "../lib/cache.js";
import { postToLinkedIn, formatMatchPost } from "../lib/linkedin.js";

/**
 * Combined endpoint — stays within Vercel Hobby 12-function limit.
 *
 * GET  /api/story?id=12345   → AI match narrative + facts (unchanged behaviour)
 * POST /api/story?action=linkedin
 *        body { matchId | home,away,homeScore,awayScore,stage,facts }
 *      → posts match result to LinkedIn (manual or auto-detect mode)
 * GET  /api/story?action=highlights&matchId=12345&home=Brazil&away=France
 *      → finds an official YouTube highlight video for a finished match.
 *        Cached PERMANENTLY once found — YouTube Search API costs 100 quota
 *        units per call (only 100 free searches/day), so we search once per
 *        match ever, never re-search a match that already resolved.
 *
 * All three share this file purely to conserve serverless function slots —
 * they are otherwise unrelated features.
 */
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // ── POST: LinkedIn posting ─────────────────────────────────────────────
  if (req.method === "POST" && req.query?.action === "linkedin") {
    return handleLinkedInPost(req, res);
  }

  // ── GET: YouTube highlight video lookup ─────────────────────────────────
  if (req.query?.action === "highlights") {
    return handleHighlightVideo(req, res);
  }

  // ── GET: AI match story (original behaviour) ───────────────────────────
  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: "Missing ?id=" });

  const key = `wc:story:${id}`;
  try {
    const cached = await cacheGet(key);
    if (cached) {
      res.setHeader("Cache-Control", "public, s-maxage=3600");
      return res.status(200).json(cached);
    }

    const match = await fetchMatchDetail(id);

    if (match.status !== "FINISHED") {
      return res.status(200).json({
        headline: null, narrative: null,
        facts: ["Match story available after full time."],
        status: match.status
      });
    }

    const facts = computeFacts(match);

    let narrative = null;
    let headline = null;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      const prompt = buildPrompt(match);
      try {
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 400,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const raw = aiData.content?.[0]?.text || "";
          const hlMatch = raw.match(/HEADLINE:\s*(.+)/);
          const narMatch = raw.match(/STORY:\s*([\s\S]+)/);
          headline = hlMatch ? hlMatch[1].trim() : null;
          narrative = narMatch ? narMatch[1].trim() : raw.trim();
        }
      } catch (e) {
        console.error("Claude API error:", e.message);
      }
    }

    const result = {
      matchId: id,
      home: match.home.name,
      away: match.away.name,
      score: `${match.home.score}–${match.away.score}`,
      headline,
      narrative,
      facts,
      generatedAt: new Date().toISOString(),
    };

    await cacheSet(key, result, 86400);
    res.setHeader("Cache-Control", "public, s-maxage=3600");
    return res.status(200).json(result);
  } catch (e) {
    console.error("story endpoint error:", e.message);
    return res.status(503).json({ error: "Story unavailable", detail: e.message });
  }
}

/* ── LinkedIn posting handler ────────────────────────────────────────────── */
async function handleLinkedInPost(req, res) {
  const auth = req.headers.authorization || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!process.env.LINKEDIN_ACCESS_TOKEN || (!process.env.LINKEDIN_PERSON_ID && !process.env.LINKEDIN_ORG_ID)) {
    return res.status(503).json({ error: "LinkedIn not configured. Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_ID (or LINKEDIN_ORG_ID) to Vercel env vars." });
  }

  try {
    const body = req.body || {};
    const posted = [];
    const skipped = [];

    // Manual post for a specific match
    if (body.matchId || (body.home && body.away)) {
      const dedupeKey = `wc:linkedin:posted:${body.matchId || body.home + body.away}`;
      const alreadyPosted = await cacheGet(dedupeKey).catch(() => null);
      if (alreadyPosted) return res.status(200).json({ ok: true, skipped: ["already posted"] });

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
      await cacheSet(dedupeKey, result.postId, 604800);
      return res.status(200).json({ ok: true, posted: [result] });
    }

    // Auto-detect recently finished matches
    const today = await fetchLiveAndToday();
    const finished = today.finishedToday;

    for (const m of finished) {
      const dedupeKey = `wc:linkedin:posted:${m.id}`;
      const alreadyPosted = await cacheGet(dedupeKey).catch(() => null);
      if (alreadyPosted) { skipped.push(m.id); continue; }

      let facts = [];
      try {
        const d = await fetchMatchDetail(m.id);
        const goals = d.events.filter(e => e.type === "GOAL");
        if (goals.length) {
          const scorers = {};
          goals.forEach(g => { if (g.player) scorers[g.player] = (scorers[g.player] || 0) + 1; });
          Object.entries(scorers).forEach(([p, c]) => {
            facts.push(c > 1 ? `${p} (${c})` : p);
          });
          if (facts.length) facts[0] = "⚽ " + facts.join(", ");
          facts = [facts[0]];
        }
        const reds = d.events.filter(e => e.type === "RED");
        if (reds.length) facts.push(`🟥 ${reds[0].player} sent off (${reds[0].team})`);
        const late = goals.filter(g => g.minute >= 85);
        if (late.length) facts.push(`⏱ Late drama in the ${late[late.length - 1].minute}th minute`);
      } catch {}

      const text = formatMatchPost({
        home: m.home.name,
        away: m.away.name,
        homeScore: m.home.score ?? 0,
        awayScore: m.away.score ?? 0,
        facts,
        stage: m.stage?.replace(/_/g, " "),
      });

      try {
        const result = await postToLinkedIn({ text });
        await cacheSet(dedupeKey, result.postId, 604800);
        posted.push({ match: `${m.home.name} vs ${m.away.name}`, ...result });
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

/* ── fact computation — no AI, pure match data logic ─────────────────────── */
function computeFacts(m) {
  const facts = [];
  const goals = m.events.filter(e => e.type === "GOAL");
  const homeGoals = goals.filter(e => e.team === m.home.name);
  const awayGoals = goals.filter(e => e.team === m.away.name);
  const reds = m.events.filter(e => e.type === "RED");
  const yellows = m.events.filter(e => e.type === "YELLOW");
  const homeScore = m.home.score ?? 0;
  const awayScore = m.away.score ?? 0;

  // Result type
  const margin = Math.abs(homeScore - awayScore);
  if (homeScore === awayScore) {
    facts.push(`The match ended ${homeScore}–${awayScore} — points shared.`);
  } else {
    const winner = homeScore > awayScore ? m.home.name : m.away.name;
    const loser  = homeScore > awayScore ? m.away.name : m.home.name;
    if (margin >= 4) facts.push(`A dominant ${margin}-goal victory for ${winner} — one of the largest winning margins of the tournament so far.`);
    else if (margin === 1) facts.push(`${winner} edged it by a single goal — a closely-fought result.`);
    else facts.push(`${winner} won ${Math.max(homeScore, awayScore)}–${Math.min(homeScore, awayScore)} against ${loser}.`);
  }

  // Comeback
  const firstGoal = goals[0];
  if (firstGoal) {
    const firstScorer = firstGoal.team;
    const winner = homeScore > awayScore ? m.home.name : homeScore < awayScore ? m.away.name : null;
    if (winner && firstScorer !== winner) {
      facts.push(`${winner} came from behind to win — the opening goal had gone to ${firstScorer}.`);
    }
  }

  // Late drama — goal after 80th minute
  const lateGoals = goals.filter(g => g.minute && g.minute >= 80);
  if (lateGoals.length > 0) {
    const lg = lateGoals[lateGoals.length - 1];
    facts.push(`Late drama: ${lg.player || "a player"} scored in the ${lg.minute}th minute to ${lateGoals.some(g => g.team === (homeScore > awayScore ? m.home.name : m.away.name)) ? "seal the win" : "change the game"}.`);
  }

  // First half vs second half goals
  const firstHalf = goals.filter(g => g.minute && g.minute <= 45);
  const secondHalf = goals.filter(g => g.minute && g.minute > 45);
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    facts.push(`${firstHalf.length} goal${firstHalf.length > 1 ? "s" : ""} in the first half, ${secondHalf.length} in the second.`);
  } else if (firstHalf.length >= 3) {
    facts.push(`A breathless first half — ${firstHalf.length} goals before the break.`);
  } else if (secondHalf.length >= 3) {
    facts.push(`A dramatic second half — ${secondHalf.length} goals after the interval.`);
  }

  // Individual scorer highlights
  const scorerCount = {};
  goals.forEach(g => { if (g.player) scorerCount[g.player] = (scorerCount[g.player] || 0) + 1; });
  Object.entries(scorerCount).forEach(([player, count]) => {
    if (count >= 2) facts.push(`${player} scored ${count === 2 ? "a brace" : "a hat-trick"} — a standout individual performance.`);
  });

  // Assists
  const assists = goals.filter(g => g.assist);
  if (assists.length > 0) {
    const assistCount = {};
    assists.forEach(g => { assistCount[g.assist] = (assistCount[g.assist] || 0) + 1; });
    const topAssist = Object.entries(assistCount).sort((a,b) => b[1]-a[1])[0];
    if (topAssist[1] >= 2) facts.push(`${topAssist[0]} provided ${topAssist[1]} assists — the creative force behind the victory.`);
  }

  // Red cards
  if (reds.length > 0) {
    reds.forEach(r => facts.push(`${r.player || "A player"} (${r.team}) was sent off${r.minute ? ` in the ${r.minute}th minute` : ""}.`));
  }

  // Yellow cards
  if (yellows.length >= 5) {
    facts.push(`A feisty affair — ${yellows.length} yellow cards shown across both teams.`);
  }

  // Formations
  const hForm = m.home.lineup?.formation;
  const aForm = m.away.lineup?.formation;
  if (hForm && aForm) {
    facts.push(`Tactical setup: ${m.home.name} lined up in a ${hForm}, ${m.away.name} in a ${aForm}.`);
  }

  // Clean sheet
  if (homeScore > 0 && awayScore === 0) facts.push(`Clean sheet for ${m.home.name}'s goalkeeper.`);
  if (awayScore > 0 && homeScore === 0) facts.push(`Clean sheet for ${m.away.name}'s goalkeeper.`);

  // Total goals
  const total = homeScore + awayScore;
  if (total >= 5) facts.push(`${total} goals in total — a goal feast for fans.`);

  return facts.slice(0, 6); // Cap at 6 for readability
}

/* ── Claude prompt builder ────────────────────────────────────────────────── */
function buildPrompt(m) {
  const goals = m.events.filter(e => e.type === "GOAL");
  const cards = m.events.filter(e => ["RED","YELLOW"].includes(e.type));

  const goalLine = goals.length === 0
    ? "No goals scored."
    : goals.map(g => `${g.minute}' ${g.player || "Unknown"} (${g.team})${g.assist ? ` assist: ${g.assist}` : ""}`).join(", ");

  const cardLine = cards.length === 0 ? "No cards." : cards.map(c => `${c.type} card — ${c.player} (${c.team}) ${c.minute}'`).join(", ");

  const hForm = m.home.lineup?.formation || "unknown";
  const aForm = m.away.lineup?.formation || "unknown";

  return `You are a concise football match reporter for a World Cup analytics site. Write a short match story from this data.

Match: ${m.home.name} ${m.home.score}–${m.away.score} ${m.away.name} (FIFA World Cup 2026)
Goals: ${goalLine}
Cards: ${cardLine}
Formations: ${m.home.name} ${hForm} vs ${m.away.name} ${aForm}

Write EXACTLY in this format:
HEADLINE: [One punchy sentence, max 12 words, no score in it]
STORY: [Two short paragraphs. First: what happened tactically and how the goals fell. Second: the key talking point or turning moment. Factual, energetic, no invented stats. Max 120 words total. Do not mention the score — it's already shown.]`;
}

/* ── YouTube highlight video lookup ───────────────────────────────────────
 * Searches YouTube once per match for an official highlights video, then
 * caches the result FOREVER (no TTL) — a finished match's highlight video
 * never needs to be re-searched. This is essential because YouTube's
 * search.list endpoint costs 100 of our 10,000 daily quota units, meaning
 * only ~100 searches/day are possible. Caching forever means each of the
 * ~104 World Cup 2026 matches only ever costs one search, total.
 *
 * Prefers official FIFA / broadcaster channels by filtering for channel
 * names containing "FIFA" first; falls back to the top relevance result
 * if no official-looking channel appears in the first page.
 */
async function handleHighlightVideo(req, res) {
  const matchId = req.query?.matchId;
  const home = req.query?.home;
  const away = req.query?.away;
  if (!matchId || !home || !away) {
    return res.status(400).json({ error: "Missing matchId, home, or away" });
  }

  const key = `wc:highlight-video:${matchId}`;
  try {
    const cached = await cacheGet(key);
    if (cached) {
      res.setHeader("Cache-Control", "public, s-maxage=86400");
      return res.status(200).json(cached);
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "YouTube highlights not configured. Add YOUTUBE_API_KEY to Vercel env vars.", video: null });
    }

    const query = encodeURIComponent(`${home} vs ${away} highlights FIFA World Cup 2026`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${query}&key=${apiKey}`;

    const ytRes = await fetch(url);
    if (!ytRes.ok) {
      const errBody = await ytRes.text().catch(() => "");
      throw new Error(`YouTube API ${ytRes.status}: ${errBody.slice(0, 200)}`);
    }
    const ytData = await ytRes.json();
    const items = ytData.items || [];

    if (items.length === 0) {
      const empty = { video: null, searchedAt: new Date().toISOString() };
      await cacheSet(key, empty, 86400); // cache the "nothing found" for a day, not forever — might appear later
      return res.status(200).json(empty);
    }

    // Prefer an official-looking channel (FIFA, major broadcasters) if present
    const officialMarkers = ["fifa", "fox sports", "bbc sport", "espn", "telemundo", "bein sports"];
    const best = items.find(it =>
      officialMarkers.some(marker => (it.snippet.channelTitle || "").toLowerCase().includes(marker))
    ) || items[0];

    const result = {
      video: {
        videoId: best.id.videoId,
        title: best.snippet.title,
        channelTitle: best.snippet.channelTitle,
        thumbnail: best.snippet.thumbnails?.medium?.url || best.snippet.thumbnails?.default?.url,
        url: `https://www.youtube.com/watch?v=${best.id.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${best.id.videoId}`,
      },
      searchedAt: new Date().toISOString(),
    };

    // Cache FOREVER (no TTL) — a found video for a finished match never changes
    await cacheSet(key, result, 0);
    res.setHeader("Cache-Control", "public, s-maxage=86400");
    return res.status(200).json(result);
  } catch (e) {
    console.error("highlight video lookup error:", e.message);
    return res.status(503).json({ error: "Highlight video unavailable", detail: e.message, video: null });
  }
}