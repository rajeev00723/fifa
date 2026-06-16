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
  // Fetch a 2-day window (yesterday + today in UTC) so visitors in timezones
  // ahead of UTC (e.g. UTC+8 Malaysia) don't miss matches that finished on
  // the UTC-previous-day but are still "today" in their local time.
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now - 864e5).toISOString().slice(0, 10);
  const data = await call(`/competitions/${COMPETITION}/matches?dateFrom=${yesterday}&dateTo=${today}`);
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
      teamId: row.team?.id ?? null,
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

/**
 * Full detail for ONE match: goal timeline, bookings (cards), and lineups.
 * football-data.org returns these only on the single-match endpoint, not the
 * list endpoint — which is why this is a separate call made on demand.
 */
export async function fetchMatchDetail(id) {
  const m = await call(`/matches/${id}`);
  const events = [];
  (m.goals ?? []).forEach((g) =>
    events.push({ minute: g.minute, type: "GOAL", team: g.team?.name, player: g.scorer?.name, assist: g.assist?.name ?? null })
  );
  (m.bookings ?? []).forEach((b) =>
    events.push({ minute: b.minute, type: b.card === "RED_CARD" ? "RED" : "YELLOW", team: b.team?.name, player: b.player?.name })
  );
  (m.substitutions ?? []).forEach((s) =>
    events.push({ minute: s.minute, type: "SUB", team: s.team?.name, player: s.playerIn?.name, playerOut: s.playerOut?.name ?? null })
  );
  events.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  const lineup = (side) => ({
    formation: m[side]?.formation ?? null,
    starting: (m[side]?.lineup ?? []).map((p) => ({ name: p.name, shirt: p.shirtNumber ?? null, position: p.position ?? null })),
    bench: (m[side]?.bench ?? []).map((p) => ({ name: p.name, shirt: p.shirtNumber ?? null })),
  });

  return {
    id: m.id,
    status: mapStatus(m.status),
    utcKickoff: m.utcDate,
    home: { name: m.homeTeam?.name, crest: m.homeTeam?.crest ?? null, score: m.score?.fullTime?.home ?? null, lineup: lineup("homeTeam") },
    away: { name: m.awayTeam?.name, crest: m.awayTeam?.crest ?? null, score: m.score?.fullTime?.away ?? null, lineup: lineup("awayTeam") },
    events,
    // NOTE: possession/shots are NOT in the free tier; left null on purpose.
    stats: { possession: null },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Squad for a team: player profiles with position, nationality, DOB, shirt #.
 */
export async function fetchTeamSquad(id) {
  const t = await call(`/teams/${id}`);
  const squad = (t.squad ?? []).map((p) => ({
    name: p.name,
    position: p.position ?? "—",
    nationality: p.nationality ?? "—",
    dob: p.dateOfBirth ?? null,
    shirt: p.shirtNumber ?? null,
  }));
  return { team: t.name, crest: t.crest ?? null, coach: t.coach?.name ?? null, squad, updatedAt: new Date().toISOString() };
}

/**
 * Recent finished matches — last N days.
 * Returns matches sorted newest first, grouped by date (UTC date string).
 * Used for the "Past Results" tab.
 */
export async function fetchPastMatches(days = 7) {
  const to   = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  // Note: don't combine status=FINISHED with dateFrom/dateTo — some free-tier
  // plans reject that combination. Fetch all matches in the date range and
  // filter client-side instead. This is one call either way.
  const data = await call(`/competitions/${COMPETITION}/matches?dateFrom=${from}&dateTo=${to}`);
  const matches = (data.matches ?? [])
    .filter(m => ["FINISHED","AWARDED"].includes(m.status))
    .map(mapMatch)
    .sort((a, b) => new Date(b.utcKickoff) - new Date(a.utcKickoff));
  // Group by date label (YYYY-MM-DD in UTC)
  const groups = {};
  for (const m of matches) {
    const day = m.utcKickoff.slice(0, 10);
    (groups[day] = groups[day] || []).push(m);
  }
  return { updatedAt: new Date().toISOString(), groups, days };
}