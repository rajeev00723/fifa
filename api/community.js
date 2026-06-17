import { supa } from "../lib/supabase.js";
import { cacheGet, cacheSet } from "../lib/cache.js";

/**
 * Combined community-data endpoint — kept as ONE function to stay within
 * Vercel Hobby's 12-function limit.
 *
 * POST /api/community?action=predict
 *   body { matchKey, deviceId, choice, aiPick }
 *   → records/updates one device's prediction for a match
 *
 * GET  /api/community?action=predict&matchKey=...
 *   → { community: {TeamA: pct, TeamB: pct, Draw: pct}, totalVotes }
 *
 * POST /api/community?action=trivia
 *   body { questionDate, deviceId, answer, correct }
 *   → records one device's trivia answer
 *
 * GET  /api/community?action=trivia&questionDate=...
 *   → { tally: {optionText: count, ...}, totalVotes }
 *
 * GET  /api/community?action=leaderboard
 *   → { leaderboard: [{deviceId, correctCount, resolvedCount}, ...] }
 *
 * POST /api/community?action=trending   body { query }
 *   → logs a search term (Redis counter, not Supabase — high frequency, low value data)
 *
 * GET  /api/community?action=trending
 *   → { trending: [{query, count}, ...] }  top 8 over rolling 24h
 *
 * Device IDs are anonymous client-generated UUIDs (no login, no PII).
 */
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const action = req.query?.action;

  try {
    if (action === "predict") {
      return req.method === "POST" ? await recordPrediction(req, res) : await getPredictionStats(req, res);
    }
    if (action === "trivia") {
      return req.method === "POST" ? await recordTrivia(req, res) : await getTriviaStats(req, res);
    }
    if (action === "leaderboard") {
      return await getLeaderboard(req, res);
    }
    if (action === "trending") {
      return req.method === "POST" ? await logTrendingSearch(req, res) : await getTrendingSearches(req, res);
    }
    return res.status(400).json({ error: "Missing or invalid ?action= (predict | trivia | leaderboard)" });
  } catch (e) {
    console.error("community endpoint error:", e.message);
    return res.status(503).json({ error: "Community data unavailable", detail: e.message });
  }
}

async function recordPrediction(req, res) {
  const { matchKey, deviceId, choice, aiPick } = req.body || {};
  if (!matchKey || !deviceId || !choice) {
    return res.status(400).json({ error: "Missing matchKey, deviceId, or choice" });
  }
  const db = supa();
  const { error } = await db
    .from("match_predictions")
    .upsert({ match_key: matchKey, device_id: deviceId, choice, ai_pick: aiPick ?? null },
      { onConflict: "match_key,device_id" });
  if (error) throw new Error(error.message);
  return res.status(200).json({ ok: true });
}

async function getPredictionStats(req, res) {
  const matchKey = req.query?.matchKey;
  if (!matchKey) return res.status(400).json({ error: "Missing matchKey" });
  const db = supa();
  const { data, error } = await db
    .from("match_predictions")
    .select("choice")
    .eq("match_key", matchKey);
  if (error) throw new Error(error.message);

  const tally = {};
  (data || []).forEach(row => { tally[row.choice] = (tally[row.choice] || 0) + 1; });
  const total = data?.length || 0;
  const community = {};
  Object.entries(tally).forEach(([k, v]) => { community[k] = total > 0 ? Math.round((v / total) * 100) : 0; });

  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
  return res.status(200).json({ community, totalVotes: total });
}

async function recordTrivia(req, res) {
  const { questionDate, deviceId, answer, correct } = req.body || {};
  if (!questionDate || !deviceId || !answer) {
    return res.status(400).json({ error: "Missing questionDate, deviceId, or answer" });
  }
  const db = supa();
  const { error } = await db
    .from("trivia_answers")
    .upsert({ question_date: questionDate, device_id: deviceId, answer, correct: !!correct },
      { onConflict: "question_date,device_id" });
  if (error) throw new Error(error.message);
  return res.status(200).json({ ok: true });
}

async function getTriviaStats(req, res) {
  const questionDate = req.query?.questionDate;
  if (!questionDate) return res.status(400).json({ error: "Missing questionDate" });
  const db = supa();
  const { data, error } = await db
    .from("trivia_answers")
    .select("answer, correct")
    .eq("question_date", questionDate);
  if (error) throw new Error(error.message);

  const tally = {};
  let correctCount = 0;
  (data || []).forEach(row => {
    tally[row.answer] = (tally[row.answer] || 0) + 1;
    if (row.correct) correctCount++;
  });
  const total = data?.length || 0;

  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
  return res.status(200).json({ tally, totalVotes: total, correctCount });
}

async function getLeaderboard(req, res) {
  const db = supa();
  const { data, error } = await db
    .from("weekly_leaderboard")
    .select("*")
    .limit(10);
  if (error) throw new Error(error.message);

  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=120");
  return res.status(200).json({
    leaderboard: (data || []).map((row, i) => ({
      rank: i + 1,
      deviceId: row.device_id,
      correctCount: row.correct_count,
      resolvedCount: row.resolved_count,
    })),
  });
}

/* ── TRENDING SEARCHES — Redis-backed, rolling 24h window ─────────────────
 * Lightweight on purpose: every search keystroke would be too noisy for
 * Supabase. We bucket by hour and keep the last 24 hourly buckets, each
 * a JSON object of {normalizedQuery: count}. Reading merges all 24 buckets.
 */
const TRENDING_KEY_PREFIX = "wc:trending:";
const TRENDING_HOURS = 24;

function normalizeQuery(q) {
  return (q || "").trim().toLowerCase().slice(0, 60);
}
function hourBucket(offset = 0) {
  const d = new Date(Date.now() - offset * 3600_000);
  return d.toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

async function logTrendingSearch(req, res) {
  const { query } = req.body || {};
  const norm = normalizeQuery(query);
  // Ignore noise: too short, or generic/junk queries
  if (!norm || norm.length < 3) return res.status(200).json({ ok: true, skipped: true });

  const key = TRENDING_KEY_PREFIX + hourBucket(0);
  const existingRaw = await cacheGet(key).catch(() => null);
  let bucket = {};
  try { bucket = JSON.parse(existingRaw?.value ?? existingRaw ?? "{}"); } catch {}
  bucket[norm] = (bucket[norm] || 0) + 1;
  await cacheSet(key, JSON.stringify(bucket), 90000); // ~25h TTL, slightly over window
  return res.status(200).json({ ok: true });
}

async function getTrendingSearches(req, res) {
  const merged = {};
  for (let h = 0; h < TRENDING_HOURS; h++) {
    const key = TRENDING_KEY_PREFIX + hourBucket(h);
    const raw = await cacheGet(key).catch(() => null);
    if (!raw) continue;
    try {
      const bucket = JSON.parse(raw?.value ?? raw ?? "{}");
      Object.entries(bucket).forEach(([q, c]) => { merged[q] = (merged[q] || 0) + c; });
    } catch {}
  }
  const trending = Object.entries(merged)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([query, count]) => ({ query, count }));

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=60");
  return res.status(200).json({ trending });
}