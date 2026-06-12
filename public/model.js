/**
 * model.js — transparent prediction model + historical data.
 * Loaded by index.html. No build step; plain browser global `WCModel`.
 *
 * PHILOSOPHY: every number a user sees should be traceable to an input they
 * can inspect. No black boxes. The Elo ratings are stated openly; the win
 * probabilities are a published formula, not a trained weight nobody can read.
 */
window.WCModel = (function () {
  // Pre-tournament Elo-style ratings (illustrative, editable). Higher = stronger.
  // Source baseline: world ranking + recent form, rounded. Tweak freely.
  const RATINGS = {
    Argentina: 2055, Spain: 1985, France: 2010, England: 1975, Brazil: 2030,
    Portugal: 1970, Netherlands: 1955, Germany: 1960, Italy: 1945, Uruguay: 1910,
    Croatia: 1900, Morocco: 1885, Belgium: 1905, Colombia: 1880, Mexico: 1840,
    USA: 1820, Japan: 1815, Senegal: 1810, Switzerland: 1825, Denmark: 1830,
    Ecuador: 1790, "South Korea": 1800, Australia: 1760, Canada: 1775,
  };
  const DEFAULT_RATING = 1750;
  const rating = (t) => RATINGS[t] ?? DEFAULT_RATING;

  // Win expectancy from rating gap — the standard Elo logistic.
  function winExpectancy(a, b) {
    return 1 / (1 + Math.pow(10, (rating(b) - rating(a)) / 400));
  }

  // Single match: split into win/draw/win. Draw share widens for even games.
  function matchOutcome(a, b) {
    const expA = winExpectancy(a, b);
    const draw = Math.max(0.08, 0.27 - Math.abs(expA - 0.5) * 0.22);
    return { winA: expA * (1 - draw), winB: (1 - expA) * (1 - draw), draw };
  }

  // Expected goals for a matchup (used by Golden Boot projection).
  function expectedGoals(a, b) {
    const diff = (rating(a) - rating(b)) / 400;
    return [Math.max(0.3, 1.35 + diff * 1.1), Math.max(0.3, 1.35 - diff * 1.1)];
  }

  // Probability a team wins a knockout tie (no draws — penalties resolve).
  function knockoutWin(a, b) {
    const e = winExpectancy(a, b);
    return e; // draws collapse into the favourite's expectancy at ~50/50 on shootouts
  }

  // Probability of lifting the trophy = product of winning each remaining round.
  // Given a list of likely opponents per round, chain the survival probability.
  function titleOdds(team, roundsOpponents) {
    let p = 1;
    for (const opp of roundsOpponents) p *= knockoutWin(team, opp);
    return p;
  }

  // Golden Boot projection: blends current goals (real, from feed) with a
  // model term = expected goals/game * remaining games. The split is shown to
  // the user so they see how much is "banked" vs "projected".
  function bootProjection({ currentGoals, team, avgOpponent, remainingGames }) {
    const [xgPerGame] = expectedGoals(team, avgOpponent);
    const finishingShare = 0.42; // a striker takes ~this share of team xG, illustrative
    const projected = xgPerGame * finishingShare * remainingGames;
    return { banked: currentGoals, projected: +projected.toFixed(1), total: +(currentGoals + projected).toFixed(1) };
  }

  return { RATINGS, rating, winExpectancy, matchOutcome, expectedGoals, knockoutWin, titleOdds, bootProjection };
})();

/* Historical dataset (men's WC) for the history visuals. */
window.WCHistory = {
  champions: [
    { year: 1930, team: "Uruguay" }, { year: 1934, team: "Italy" }, { year: 1938, team: "Italy" },
    { year: 1950, team: "Uruguay" }, { year: 1954, team: "West Germany" }, { year: 1958, team: "Brazil" },
    { year: 1962, team: "Brazil" }, { year: 1966, team: "England" }, { year: 1970, team: "Brazil" },
    { year: 1974, team: "West Germany" }, { year: 1978, team: "Argentina" }, { year: 1982, team: "Italy" },
    { year: 1986, team: "Argentina" }, { year: 1990, team: "West Germany" }, { year: 1994, team: "Brazil" },
    { year: 1998, team: "France" }, { year: 2002, team: "Brazil" }, { year: 2006, team: "Italy" },
    { year: 2010, team: "Spain" }, { year: 2014, team: "Germany" }, { year: 2018, team: "France" },
    { year: 2022, team: "Argentina" },
  ],
  goalsPerMatch: [
    {year:1930,v:3.89},{year:1934,v:4.12},{year:1938,v:4.67},{year:1950,v:4.00},{year:1954,v:5.38},
    {year:1958,v:3.60},{year:1962,v:2.78},{year:1966,v:2.78},{year:1970,v:2.97},{year:1974,v:2.55},
    {year:1978,v:2.68},{year:1982,v:2.81},{year:1986,v:2.54},{year:1990,v:2.21},{year:1994,v:2.71},
    {year:1998,v:2.67},{year:2002,v:2.52},{year:2006,v:2.30},{year:2010,v:2.27},{year:2014,v:2.67},
    {year:2018,v:2.64},{year:2022,v:2.69},
  ],
  // dynasty radar metrics, 0–100 scaled
  teams: {
    Brazil:     { Titles:100, "Win %":67, Finals:88, "Goals/Match":85, Longevity:100 },
    Germany:    { Titles:80, "Win %":60, Finals:100, "Goals/Match":83, Longevity:91 },
    Italy:      { Titles:80, "Win %":54, Finals:75, "Goals/Match":62, Longevity:82 },
    Argentina:  { Titles:60, "Win %":53, Finals:75, "Goals/Match":70, Longevity:82 },
    France:     { Titles:40, "Win %":53, Finals:50, "Goals/Match":75, Longevity:73 },
  },
};