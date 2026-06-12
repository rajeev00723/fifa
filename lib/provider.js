/**
 * Provider adapter.
 * The rest of the app NEVER talks to a data provider directly — it talks to
 * the normalized shape this file returns. To switch providers (API-Football,
 * TheStatsAPI, etc.) you only rewrite this one file's fetch + map functions.
 *
 * Default provider: football-data.org
 *   - Free tier includes the World Cup, 10 calls/minute.
 *   - Docs: https://www.football-data.org/documentation/quickstart
 *   - The World Cup competition code is "WC".
 */

const BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC"; // World Cup

function headers() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("Missing FOOTBALL_DATA_API_KEY env var");
  return { "X-Auth-Token": key };
}

async function call(path) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Provider ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/* ---- normalized shapes the rest of the app relies on ---------------- */

function mapStatus(s) {
  // Collapse provider statuses into three the UI cares about.
  if (["IN_PLAY", "PAUSED"].includes(s)) return "LIVE";
  if (["FINISHED", "AWARDED"].includes(s)) return "FINISHED";
  return "SCHEDULED"; // TIMED, SCHEDULED, POSTPONED, etc.
}

function mapMatch(m) {
  return {
    id: m.id,
    status: mapStatus(m.status),
    minute: m.minute ?? null,
    utcKickoff: m.utcDate,
    stage: m.stage,
    group: m.group ?? null,
    home: { name: m.homeTeam?.name ?? "TBD", crest: m.homeTeam?.crest ?? null, score: m.score?.fullTime?.home ?? null },
    away: { name: m.awayTeam?.name ?? "TBD", crest: m.awayTeam?.crest ?? null, score: m.score?.fullTime?.away ?? null },
  };
}

/* ---- public functions used by the API routes ----------------------- */

export async function fetchLiveAndToday() {
  // One call covers today's matches incl. anything in play.
  const today = new Date().toISOString().slice(0, 10);
  const data = await call(`/competitions/${COMPETITION}/matches?dateFrom=${today}&dateTo=${today}`);
  const matches = (data.matches ?? []).map(mapMatch);
  return {
    updatedAt: new Date().toISOString(),
    live: matches.filter((m) => m.status === "LIVE"),
    finishedToday: matches.filter((m) => m.status === "FINISHED"),
    upcomingToday: matches.filter((m) => m.status === "SCHEDULED"),
  };
}

export async function fetchStandings() {
  const data = await call(`/competitions/${COMPETITION}/standings`);
  const groups = (data.standings ?? []).map((s) => ({
    group: s.group ?? s.stage,
    table: (s.table ?? []).map((row) => ({
      position: row.position,
      team: row.team?.name,
      crest: row.team?.crest ?? null,
      played: row.playedGames,
      won: row.won,
      draw: row.draw,
      lost: row.lost,
      gf: row.goalsFor,
      ga: row.goalsAgainst,
      gd: row.goalDifference,
      points: row.points,
    })),
  }));
  return { updatedAt: new Date().toISOString(), groups };
}

export async function fetchScorers() {
  const data = await call(`/competitions/${COMPETITION}/scorers?limit=20`);
  const scorers = (data.scorers ?? []).map((s) => ({
    player: s.player?.name,
    team: s.team?.name,
    goals: s.goals ?? 0,
    assists: s.assists ?? null,
    penalties: s.penalties ?? null,
  }));
  return { updatedAt: new Date().toISOString(), scorers };
}
