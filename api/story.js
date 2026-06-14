import { fetchMatchDetail } from "../lib/provider.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

/**
 * GET /api/story?id=12345
 *
 * Returns for a finished match:
 *   1. narrative  — 2-paragraph AI-written match story (Claude API)
 *   2. facts      — auto-computed highlights from match data (no AI needed)
 *   3. headline   — one punchy sentence summary
 *
 * Cached 24h per match ID — stories don't change after full time.
 * The Claude call is the expensive part; caching means it only happens once.
 *
 * Security: ANTHROPIC_API_KEY stays server-side, never reaches the browser.
 */
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: "Missing ?id=" });

  const key = `wc:story:${id}`;
  try {
    // Serve from cache if available — stories don't change after FT
    const cached = await cacheGet(key);
    if (cached) {
      res.setHeader("Cache-Control", "public, s-maxage=3600");
      return res.status(200).json(cached);
    }

    // Fetch match detail — we need events, scores, lineups
    const match = await fetchMatchDetail(id);

    // Only generate for finished matches
    if (match.status !== "FINISHED") {
      return res.status(200).json({
        headline: null, narrative: null,
        facts: ["Match story available after full time."],
        status: match.status
      });
    }

    // ── 1. Compute fact bullets from match data (no AI needed) ──────────────
    const facts = computeFacts(match);

    // ── 2. Generate AI narrative via Claude API ──────────────────────────────
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
          // Parse the structured response
          const hlMatch = raw.match(/HEADLINE:\s*(.+)/);
          const narMatch = raw.match(/STORY:\s*([\s\S]+)/);
          headline = hlMatch ? hlMatch[1].trim() : null;
          narrative = narMatch ? narMatch[1].trim() : raw.trim();
        }
      } catch (e) {
        console.error("Claude API error:", e.message);
        // Fall through — we still return facts even without narrative
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

    // Cache 24h — story is final after FT
    await cacheSet(key, result, 86400);
    res.setHeader("Cache-Control", "public, s-maxage=3600");
    return res.status(200).json(result);
  } catch (e) {
    console.error("story endpoint error:", e.message);
    return res.status(503).json({ error: "Story unavailable", detail: e.message });
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