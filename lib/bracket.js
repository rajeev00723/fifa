// lib/bracket.js
// Fetches the WC knockout bracket from football-data.org and normalizes it
// into a stable shape the frontend can consume directly. The "auto-advance"
// intelligence comes for free: football-data.org populates R16/QF/SF/F
// homeTeam/awayTeam fields as the feeding matches finish, so we just
// mirror their state.

const FD_BASE = "https://api.football-data.org/v4";
const COMP = "WC"; // FIFA World Cup competition code

// football-data.org has used multiple naming conventions historically; we
// accept either modern or legacy stage names.
const STAGE_ALIASES = {
  ROUND_OF_32: "R32",
  LAST_32: "R32",
  ROUND_OF_16: "R16",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  QUARTERFINALS: "QF",
  SEMI_FINALS: "SF",
  SEMIFINALS: "SF",
  THIRD_PLACE: "TP",
  "3RD_PLACE_PLAYOFF": "TP",
  FINAL: "F",
};

const ROUND_ORDER = ["R32", "R16", "QF", "SF", "TP", "F"];
const ROUND_LABEL = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  TP: "Third-place playoff",
  F: "Final",
};

async function fdGet(path) {
  const key = process.env.FOOTBALL_DATA_API_KEY || "";
  const r = await fetch(`${FD_BASE}${path}`, {
    headers: { "X-Auth-Token": key },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`football-data ${r.status}: ${body.slice(0, 200)}`);
  }
  return r.json();
}

function normalizeMatch(m) {
  const stage = STAGE_ALIASES[m.stage];
  if (!stage) return null;

  let winner = null;
  if (m.status === "FINISHED") {
    const w = m.score?.winner;
    if (w === "HOME_TEAM") winner = m.homeTeam?.name || null;
    else if (w === "AWAY_TEAM") winner = m.awayTeam?.name || null;
    else if (m.score?.penalties) {
      // Knockout draw decided on penalties
      const ph = m.score.penalties.home, pa = m.score.penalties.away;
      if (typeof ph === "number" && typeof pa === "number") {
        if (ph > pa) winner = m.homeTeam?.name || null;
        else if (pa > ph) winner = m.awayTeam?.name || null;
      }
    }
  }

  return {
    id: m.id,
    stage,
    stageLabel: ROUND_LABEL[stage],
    utcDate: m.utcDate,
    status: m.status, // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | POSTPONED
    venue: m.venue || null,
    home: m.homeTeam?.name || null,
    homeTla: m.homeTeam?.tla || null,
    homeId: m.homeTeam?.id || null,
    homeCrest: m.homeTeam?.crest || null,
    away: m.awayTeam?.name || null,
    awayTla: m.awayTeam?.tla || null,
    awayId: m.awayTeam?.id || null,
    awayCrest: m.awayTeam?.crest || null,
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
    pensHome: m.score?.penalties?.home ?? null,
    pensAway: m.score?.penalties?.away ?? null,
    winner,
    finished: m.status === "FINISHED",
    live: m.status === "IN_PLAY" || m.status === "PAUSED",
  };
}

export async function fetchBracket() {
  // Pull every WC match in the current season — small payload, simpler than
  // trying to chain stage filters that vary between API tiers.
  const data = await fdGet(`/competitions/${COMP}/matches`);
  const all = Array.isArray(data.matches) ? data.matches : [];

  const knockout = all
    .map(normalizeMatch)
    .filter(Boolean)
    .sort((a, b) => {
      const sa = ROUND_ORDER.indexOf(a.stage);
      const sb = ROUND_ORDER.indexOf(b.stage);
      if (sa !== sb) return sa - sb;
      return new Date(a.utcDate) - new Date(b.utcDate);
    });

  const byStage = {};
  for (const r of ROUND_ORDER) byStage[r] = [];
  for (const m of knockout) byStage[m.stage].push(m);

  return {
    updatedAt: new Date().toISOString(),
    rounds: ROUND_ORDER.map((r) => ({
      stage: r,
      label: ROUND_LABEL[r],
      matches: byStage[r],
    })),
    matches: knockout,
    counts: Object.fromEntries(
      ROUND_ORDER.map((r) => [r, byStage[r].length])
    ),
  };
}

export { ROUND_ORDER, ROUND_LABEL };