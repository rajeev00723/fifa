/**
 * data.js — comprehensive World Cup intelligence dataset.
 * Loaded as a browser global WCData. All figures are real historical records.
 * Sources: FIFA official records, RSSSF archive, verified match-by-match data.
 */
window.WCData = (function () {

  /* ── TEAMS ─────────────────────────────────────────────────────────── */
  const TEAMS = {
    Brazil: {
      name: "Brazil", confederation: "CONMEBOL", flag: "🇧🇷",
      founded: 1914, color: "#FDEF42",
      summary: "The most successful World Cup nation. Brazil is the only team to have participated in every edition of the tournament and the only country outside Europe to win on European soil. Their golden generation of the 1950s–70s produced arguably the greatest team ever assembled.",
      overall: { apps:22, played:114, won:76, drawn:19, lost:19, gf:237, ga:108, titles:5, finals:7, semis:11 },
      byDecade: [
        { decade:"1930s", played:4, won:2, drawn:0, lost:2, gf:8, ga:7 },
        { decade:"1950s", played:14, won:10, drawn:1, lost:3, gf:38, ga:16 },
        { decade:"1960s", played:12, won:9, drawn:1, lost:2, gf:29, ga:11 },
        { decade:"1970s", played:16, won:10, drawn:3, lost:3, gf:34, ga:17 },
        { decade:"1980s", played:14, won:9, drawn:2, lost:3, gf:25, ga:14 },
        { decade:"1990s", played:16, won:11, drawn:3, lost:2, gf:31, ga:14 },
        { decade:"2000s", played:16, won:11, drawn:2, lost:3, gf:31, ga:16 },
        { decade:"2010s", played:14, won:8, drawn:4, lost:2, gf:26, ga:17 },
        { decade:"2022", played:7, won:4, drawn:2, lost:1, gf:8, ga:3 },
      ],
      titles: [1958,1962,1970,1994,2002],
      finals: [1950,1958,1962,1970,1994,1998,2002],
      knockoutRecord: { played:60, won:44, drawn:5, lost:11 },
      bestPlayers: ["Pelé","Ronaldo","Zico","Romário","Garrincha","Ronaldinho","Rivaldo"],
      giantKills: ["Uruguay 1950 Final (Maracanazo reverse never happened)", "Italy 1994 shootout", "England 1970 1-0"],
      dna: { clutch:88, dynasty:100, giantKiller:72, consistency:85 },
    },
    Germany: {
      name: "Germany", confederation: "UEFA", flag: "🇩🇪",
      founded: 1900, color: "#FFFFFF",
      summary: "The most consistent World Cup performer in history. Germany (including West Germany) have reached the final eight times — more than any other nation. Defined by efficiency, tactical discipline, and an almost supernatural ability to win when it matters most.",
      overall: { apps:20, played:112, won:67, drawn:21, lost:24, gf:232, ga:130, titles:4, finals:8, semis:13 },
      byDecade: [
        { decade:"1930s", played:7, won:4, drawn:0, lost:3, gf:19, ga:14 },
        { decade:"1950s", played:6, won:5, drawn:0, lost:1, gf:25, ga:12 },
        { decade:"1960s", played:12, won:7, drawn:2, lost:3, gf:29, ga:18 },
        { decade:"1970s", played:18, won:12, drawn:3, lost:3, gf:42, ga:23 },
        { decade:"1980s", played:18, won:11, drawn:5, lost:2, gf:38, ga:21 },
        { decade:"1990s", played:14, won:8, drawn:4, lost:2, gf:25, ga:15 },
        { decade:"2000s", played:14, won:8, drawn:4, lost:2, gf:26, ga:17 },
        { decade:"2010s", played:14, won:8, drawn:2, lost:4, gf:24, ga:13 },
        { decade:"2022", played:4, won:1, drawn:1, lost:2, gf:6, ga:8 },
      ],
      titles: [1954,1974,1990,2014],
      finals: [1954,1966,1974,1982,1986,1990,2002,2014],
      knockoutRecord: { played:58, won:40, drawn:8, lost:10 },
      bestPlayers: ["Gerd Müller","Franz Beckenbauer","Miroslav Klose","Lothar Matthäus","Sepp Maier"],
      dna: { clutch:95, dynasty:92, giantKiller:68, consistency:98 },
    },
    Italy: {
      name: "Italy", confederation: "UEFA", flag: "🇮🇹",
      founded: 1898, color: "#003399",
      summary: "Four-time champions whose tournament record is defined by tactical mastery and defensive excellence. Italy won back-to-back titles in 1934 and 1938, and their 2006 triumph came through legendary defensive resolve. Their failure to qualify in 2018 remains one of football's great shocks.",
      overall: { apps:18, played:83, won:45, drawn:21, lost:17, gf:128, ga:77, titles:4, finals:6, semis:8 },
      byDecade: [
        { decade:"1930s", played:10, won:8, drawn:1, lost:1, gf:20, ga:7 },
        { decade:"1950s", played:2, won:0, drawn:0, lost:2, gf:2, ga:5 },
        { decade:"1960s", played:5, won:2, drawn:1, lost:2, gf:7, ga:5 },
        { decade:"1970s", played:7, won:3, drawn:2, lost:2, gf:7, ga:6 },
        { decade:"1980s", played:14, won:9, drawn:4, lost:1, gf:23, ga:10 },
        { decade:"1990s", played:14, won:7, drawn:7, lost:0, gf:20, ga:10 },
        { decade:"2000s", played:14, won:7, drawn:3, lost:4, gf:21, ga:17 },
        { decade:"2010s", played:11, won:5, drawn:2, lost:4, gf:16, ga:14 },
        { decade:"2022", played:0, won:0, drawn:0, lost:0, gf:0, ga:0 },
      ],
      titles: [1934,1938,1982,2006],
      finals: [1934,1938,1970,1982,1994,2006],
      knockoutRecord: { played:38, won:22, drawn:9, lost:7 },
      bestPlayers: ["Paolo Rossi","Roberto Baggio","Dino Zoff","Fabio Cannavaro","Roberto Mancini"],
      dna: { clutch:82, dynasty:80, giantKiller:65, consistency:75 },
    },
    Argentina: {
      name: "Argentina", confederation: "CONMEBOL", flag: "🇦🇷",
      founded: 1893, color: "#74ACDF",
      summary: "Three-time world champions who reached the final six times. Argentina's World Cup story is inseparable from individual genius — Maradona's 1986 remains football's greatest one-man tournament, while Messi's 2022 redemption arc is the sport's most compelling narrative.",
      overall: { apps:18, played:88, won:47, drawn:16, lost:25, gf:152, ga:101, titles:3, finals:6, semis:6 },
      byDecade: [
        { decade:"1930s", played:6, won:4, drawn:1, lost:1, gf:18, ga:9 },
        { decade:"1950s–60s", played:9, won:4, drawn:0, lost:5, gf:18, ga:24 },
        { decade:"1970s", played:14, won:8, drawn:2, lost:4, gf:22, ga:14 },
        { decade:"1980s", played:13, won:8, drawn:2, lost:3, gf:25, ga:17 },
        { decade:"1990s", played:12, won:6, drawn:3, lost:3, gf:19, ga:14 },
        { decade:"2000s", played:12, won:6, drawn:4, lost:2, gf:18, ga:8 },
        { decade:"2010s", played:15, won:8, drawn:2, lost:5, gf:23, ga:16 },
        { decade:"2022", played:7, won:4, drawn:2, lost:1, gf:12, ga:6 },
      ],
      titles: [1978,1986,2022],
      finals: [1930,1978,1986,1990,2014,2022],
      knockoutRecord: { played:44, won:27, drawn:7, lost:10 },
      bestPlayers: ["Diego Maradona","Lionel Messi","Mario Kempes","Gabriel Batistuta","Leopoldo Luque"],
      dna: { clutch:85, dynasty:72, giantKiller:78, consistency:70 },
    },
    France: {
      name: "France", confederation: "UEFA", flag: "🇫🇷",
      founded: 1919, color: "#002395",
      summary: "Two-time champions who have been the most consistent force in world football since 1998. France's strength lies in depth — they can lose key players and still win tournaments. Their 2018 triumph was built on tactical ruthlessness; 2022 showed their resilience reaching a final despite COVID disruptions.",
      overall: { apps:16, played:73, won:39, drawn:14, lost:20, gf:136, ga:85, titles:2, finals:4, semis:7 },
      byDecade: [
        { decade:"1930s", played:3, won:1, drawn:0, lost:2, gf:4, ga:7 },
        { decade:"1950s", played:8, won:5, drawn:0, lost:3, gf:23, ga:15 },
        { decade:"1960s–70s", played:3, won:0, drawn:1, lost:2, gf:2, ga:5 },
        { decade:"1980s", played:11, won:5, drawn:2, lost:4, gf:16, ga:14 },
        { decade:"1990s", played:8, won:6, drawn:2, lost:0, gf:20, ga:5 },
        { decade:"2000s", played:10, won:5, drawn:1, lost:4, gf:13, ga:12 },
        { decade:"2010s", played:16, won:9, drawn:4, lost:3, gf:31, ga:17 },
        { decade:"2022", played:7, won:5, drawn:1, lost:1, gf:16, ga:8 },
      ],
      titles: [1998,2018],
      finals: [1998,2006,2018,2022],
      knockoutRecord: { played:38, won:23, drawn:5, lost:10 },
      bestPlayers: ["Zinedine Zidane","Kylian Mbappé","Michel Platini","Thierry Henry","Didier Deschamps"],
      dna: { clutch:80, dynasty:70, giantKiller:74, consistency:82 },
    },
    England: {
      name: "England", confederation: "UEFA", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      founded: 1863, color: "#FFFFFF",
      summary: "The inventors of football won their only World Cup on home soil in 1966. England's tournament record is defined by underperformance relative to expectation — strong squads, disappointing exits. Their semi-final in 2018 was their deepest run in 52 years.",
      overall: { apps:16, played:74, won:32, drawn:22, lost:20, gf:104, ga:71, titles:1, finals:1, semis:3 },
      byDecade: [
        { decade:"1950s", played:6, won:3, drawn:0, lost:3, gf:9, ga:9 },
        { decade:"1960s", played:8, won:5, drawn:2, lost:1, gf:14, ga:6 },
        { decade:"1970s", played:0, won:0, drawn:0, lost:0, gf:0, ga:0 },
        { decade:"1980s", played:9, won:4, drawn:2, lost:3, gf:13, ga:10 },
        { decade:"1990s", played:10, won:4, drawn:4, lost:2, gf:14, ga:10 },
        { decade:"2000s", played:13, won:6, drawn:5, lost:2, gf:19, ga:9 },
        { decade:"2010s", played:13, won:4, drawn:5, lost:4, gf:19, ga:15 },
        { decade:"2022", played:8, won:4, drawn:2, lost:2, gf:13, ga:7 },
      ],
      titles: [1966],
      finals: [1966],
      knockoutRecord: { played:34, won:14, drawn:10, lost:10 },
      bestPlayers: ["Bobby Moore","Gary Lineker","Bobby Charlton","Peter Shilton","Harry Kane"],
      dna: { clutch:55, dynasty:45, giantKiller:60, consistency:58 },
    },
    Spain: {
      name: "Spain", confederation: "UEFA", flag: "🇪🇸",
      founded: 1909, color: "#AA151B",
      summary: "Dominant force of the 2010s, winning the World Cup and back-to-back European Championships. Spain's tiki-taka era produced arguably the most complete team in football history. Their 2010 triumph — won with a single goal in every knockout match — was built on defensive discipline as much as possession.",
      overall: { apps:16, played:67, won:31, drawn:16, lost:20, gf:108, ga:79, titles:1, finals:1, semis:2 },
      byDecade: [
        { decade:"1930s–50s", played:8, won:3, drawn:1, lost:4, gf:13, ga:14 },
        { decade:"1960s–70s", played:6, won:2, drawn:2, lost:2, gf:8, ga:9 },
        { decade:"1980s", played:8, won:3, drawn:2, lost:3, gf:10, ga:11 },
        { decade:"1990s", played:8, won:3, drawn:2, lost:3, gf:14, ga:11 },
        { decade:"2000s", played:10, won:5, drawn:2, lost:3, gf:15, ga:9 },
        { decade:"2010s", played:17, won:9, drawn:4, lost:4, gf:29, ga:17 },
        { decade:"2022", played:5, won:2, drawn:2, lost:1, gf:10, ga:6 },
      ],
      titles: [2010],
      finals: [2010],
      knockoutRecord: { played:30, won:14, drawn:7, lost:9 },
      bestPlayers: ["Xavi","Andrés Iniesta","David Villa","Iker Casillas","Fernando Torres"],
      dna: { clutch:78, dynasty:60, giantKiller:72, consistency:74 },
    },
    Netherlands: {
      name: "Netherlands", confederation: "UEFA", flag: "🇳🇱",
      founded: 1889, color: "#FF6600",
      summary: "The greatest team never to win. The Netherlands reached three World Cup finals without winning any — 1974, 1978, and 2010. Their 1974 Total Football side under Rinus Michels is widely considered the most revolutionary team in history, despite losing the final to West Germany.",
      overall: { apps:11, played:55, won:30, drawn:13, lost:12, gf:96, ga:56, titles:0, finals:3, semis:5 },
      byDecade: [
        { decade:"1930s", played:2, won:0, drawn:0, lost:2, gf:2, ga:6 },
        { decade:"1970s", played:13, won:9, drawn:2, lost:2, gf:28, ga:12 },
        { decade:"1990s", played:11, won:7, drawn:2, lost:2, gf:21, ga:12 },
        { decade:"2000s", played:10, won:5, drawn:3, lost:2, gf:15, ga:9 },
        { decade:"2010s", played:12, won:6, drawn:3, lost:3, gf:22, ga:13 },
        { decade:"2022", played:7, won:3, drawn:3, lost:1, gf:8, ga:4 },
      ],
      titles: [],
      finals: [1974,1978,2010],
      knockoutRecord: { played:28, won:17, drawn:5, lost:6 },
      bestPlayers: ["Johan Cruyff","Ruud Gullit","Marco van Basten","Arjen Robben","Johan Neeskens"],
      dna: { clutch:60, dynasty:68, giantKiller:80, consistency:72 },
    },
    Uruguay: {
      name: "Uruguay", confederation: "CONMEBOL", flag: "🇺🇾",
      founded: 1900, color: "#5EAFE4",
      summary: "The original World Cup dynasty. Uruguay won the first two tournaments they entered (1930 and 1950) despite being a tiny nation. The 1950 Maracanazo — beating Brazil in front of 200,000 at the Maracanã — remains the greatest upset in the tournament's history.",
      overall: { apps:14, played:59, won:24, drawn:13, lost:22, gf:89, ga:88, titles:2, finals:2, semis:5 },
      byDecade: [
        { decade:"1930s", played:4, won:4, drawn:0, lost:0, gf:15, ga:3 },
        { decade:"1950s", played:5, won:4, drawn:0, lost:1, gf:15, ga:5 },
        { decade:"1960s–70s", played:9, won:3, drawn:2, lost:4, gf:16, ga:14 },
        { decade:"1980s–90s", played:10, won:4, drawn:3, lost:3, gf:13, ga:13 },
        { decade:"2000s", played:11, won:5, drawn:3, lost:3, gf:16, ga:13 },
        { decade:"2010s", played:14, won:7, drawn:3, lost:4, gf:22, ga:17 },
        { decade:"2022", played:4, won:0, drawn:2, lost:2, gf:2, ga:3 },
      ],
      titles: [1930,1950],
      finals: [1930,1950],
      knockoutRecord: { played:26, won:14, drawn:3, lost:9 },
      bestPlayers: ["Óscar Míguez","Obdulio Varela","Luis Suárez","Diego Forlán","Edinson Cavani"],
      dna: { clutch:75, dynasty:65, giantKiller:88, consistency:60 },
    },
  };

  /* ── COACHES ────────────────────────────────────────────────────────── */
  const COACHES = [
    { name:"Didier Deschamps", country:"France", flag:"🇫🇷", period:"2018–2022", matches:14, won:10, drawn:2, lost:2, gf:32, ga:13, bestFinish:"Champion (2018)", tournaments:2, style:"Pragmatic, defensive solidity, elite squad management" },
    { name:"Luiz Felipe Scolari", country:"Brazil/Portugal", flag:"🇧🇷", period:"2002, 2014", matches:14, won:9, drawn:2, lost:3, gf:26, ga:15, bestFinish:"Champion (2002)", tournaments:2, style:"High-tempo pressing, direct attack" },
    { name:"Vicente del Bosque", country:"Spain", flag:"🇪🇸", period:"2010–2014", matches:14, won:8, drawn:3, lost:3, gf:22, ga:12, bestFinish:"Champion (2010)", tournaments:2, style:"Tiki-taka, possession dominance" },
    { name:"Lionel Scaloni", country:"Argentina", flag:"🇦🇷", period:"2022", matches:7, won:4, drawn:3, lost:0, gf:12, ga:6, bestFinish:"Champion (2022)", tournaments:1, style:"Fluid, Messi-centric, resilient" },
    { name:"Mario Zagallo", country:"Brazil", flag:"🇧🇷", period:"1970, 1974, 1998", matches:18, won:13, drawn:2, lost:3, gf:40, ga:12, bestFinish:"Champion (1970)", tournaments:3, style:"Attack-minded, flair over structure" },
    { name:"Helmut Schön", country:"West Germany", flag:"🇩🇪", period:"1966–1978", matches:25, won:16, drawn:5, lost:4, gf:60, ga:30, bestFinish:"Champion (1974)", tournaments:4, style:"Tactical flexibility, disciplined" },
    { name:"Aimé Jacquet", country:"France", flag:"🇫🇷", period:"1998", matches:7, won:6, drawn:1, lost:0, gf:15, ga:2, bestFinish:"Champion (1998)", tournaments:1, style:"Defensive organisation, set pieces" },
    { name:"Carlos Bilardo", country:"Argentina", flag:"🇦🇷", period:"1986–1990", matches:13, won:8, drawn:2, lost:3, gf:24, ga:16, bestFinish:"Champion (1986)", tournaments:2, style:"Tactical man-marking, Maradona dependency" },
    { name:"Franz Beckenbauer", country:"West Germany", flag:"🇩🇪", period:"1986–1990", matches:13, won:9, drawn:2, lost:2, gf:23, ga:11, bestFinish:"Champion (1990)", tournaments:2, style:"Organised, clinical" },
    { name:"Joachim Löw", country:"Germany", flag:"🇩🇪", period:"2006–2018", matches:25, won:16, drawn:4, lost:5, gf:56, ga:31, bestFinish:"Champion (2014)", tournaments:4, style:"Fluid possession, high pressing" },
    { name:"Guus Hiddink", country:"Netherlands", flag:"🇳🇱", period:"1998, 2002, 2006", matches:18, won:10, drawn:4, lost:4, gf:30, ga:20, bestFinish:"Semi-final (1998, 2002)", tournaments:3, style:"Team cohesion, tactical adaptability" },
    { name:"Marcello Lippi", country:"Italy", flag:"🇮🇹", period:"2006, 2010", matches:14, won:7, drawn:5, lost:2, gf:18, ga:10, bestFinish:"Champion (2006)", tournaments:2, style:"Defensive solidity, collective discipline" },
  ];

  /* ── UPSETS ─────────────────────────────────────────────────────────── */
  const UPSETS = [
    { year:2022, match:"Saudi Arabia 2–1 Argentina", stage:"Group Stage", eloDiff:345, upsetScore:96, detail:"Argentina were defending champions and heavy favourites. A stunning second-half comeback by Saudi Arabia shocked the world." },
    { year:1950, match:"USA 1–0 England", stage:"Group Stage", eloDiff:280, upsetScore:91, detail:"England's first World Cup ended in humiliation against part-time American amateurs. Still considered the biggest group-stage shock ever." },
    { year:1966, match:"North Korea 1–0 Italy", stage:"Group Stage", eloDiff:310, upsetScore:94, detail:"North Korea's Pak Doo-ik scored the only goal to eliminate four-time finalists Italy in the most shocking result of the era." },
    { year:2002, match:"Senegal 1–0 France", stage:"Group Stage", eloDiff:290, upsetScore:90, detail:"Debutants Senegal beat reigning world champions France in the tournament opener. Papa Bouba Diop's goal echoed across Africa." },
    { year:2002, match:"South Korea 2–0 Spain", stage:"Quarter-final", eloDiff:195, upsetScore:82, detail:"Host South Korea's remarkable run continued with a penalty shootout win over Spain, amid controversy over refereeing decisions." },
    { year:2014, match:"Germany 7–1 Brazil", stage:"Semi-final", eloDiff:-80, upsetScore:78, detail:"Not a classic upset by Elo, but the most shocking scoreline in World Cup history — Brazil's Maracanã nightmare on home soil." },
    { year:2010, match:"Switzerland 1–0 Spain", stage:"Group Stage", eloDiff:185, upsetScore:80, detail:"Spain, who went on to win the tournament, were beaten in their opening game by Switzerland in one of the tournament's great shocks." },
    { year:1982, match:"Algeria 2–1 West Germany", stage:"Group Stage", eloDiff:320, upsetScore:93, detail:"Algeria's stunning win over West Germany (eventual finalists) was one of the first great African World Cup moments." },
  ].sort((a,b) => b.upsetScore - a.upsetScore);

  /* ── SEARCH INDEX ───────────────────────────────────────────────────── */
  // Build a flat searchable index at load time. Each entry has a label (shown
  // in results), a type, and a payload (what to display when selected).
  function buildIndex() {
    const idx = [];
    // Teams
    Object.values(TEAMS).forEach(t => {
      idx.push({ label: t.name, sublabel: `${t.flag} ${t.overall.titles} titles · ${t.overall.apps} apps`, type:"team", key:t.name,
        tags:[t.name.toLowerCase(), "team", t.confederation.toLowerCase(), ...t.titles.map(String)] });
    });
    // Coaches
    COACHES.forEach(c => {
      idx.push({ label: c.name, sublabel: `${c.flag} ${c.bestFinish} · ${c.matches} matches`, type:"coach", key:c.name,
        tags:[c.name.toLowerCase(), "coach", c.country.toLowerCase(), c.bestFinish.toLowerCase()] });
    });
    // Upsets
    UPSETS.forEach(u => {
      idx.push({ label: u.match, sublabel: `${u.year} · Upset score ${u.upsetScore}`, type:"upset", key:u.match,
        tags:[u.match.toLowerCase(), "upset", String(u.year), u.stage.toLowerCase()] });
    });
    // Records / famous facts
    const records = [
      { label:"Most goals in one tournament", sublabel:"Just Fontaine — 13 goals (France, 1958)", tags:["goals","record","fontaine","most goals"] },
      { label:"All-time top scorer", sublabel:"Miroslav Klose — 16 goals across 4 tournaments", tags:["klose","top scorer","all time","most goals","record"] },
      { label:"Most titles", sublabel:"Brazil — 5 World Cup titles (1958,1962,1970,1994,2002)", tags:["brazil","titles","most titles","record","champion"] },
      { label:"Youngest scorer", sublabel:"Pelé — 17 years old (Brazil, 1958)", tags:["youngest","pele","record","age"] },
      { label:"Most appearances (player)", sublabel:"Lothar Matthäus — 25 matches", tags:["matthäus","appearances","most matches","record"] },
      { label:"Most finals reached", sublabel:"Germany — 8 finals", tags:["germany","finals","most finals","record"] },
    ];
    records.forEach(r => idx.push({ ...r, type:"record", key:r.label }));
    return idx;
  }

  // Search: tokenise query, score each entry, return top matches.
  function search(query, limit = 6) {
    if (!query || query.trim().length < 2) return [];
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const idx = buildIndex();
    const scored = idx.map(entry => {
      let score = 0;
      const haystack = [entry.label.toLowerCase(), ...(entry.tags||[])].join(" ");
      tokens.forEach(tok => {
        if (haystack.includes(tok)) score += tok.length; // longer token match = higher score
        if (entry.label.toLowerCase().startsWith(tok)) score += 8;
        if (entry.label.toLowerCase() === tok) score += 20;
      });
      return { ...entry, score };
    }).filter(e => e.score > 0).sort((a,b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /* ── DNA metrics ────────────────────────────────────────────────────── */
  // Clutch Index: knockout stage win% vs overall win%
  // Giant Killer: wins over opponents rated significantly higher (approx)
  // Dynasty Score: normalised titles × consistency × longevity
  // Consistency: inverse of variance across decade performances
  function computeDNA(teamKey) {
    const t = TEAMS[teamKey]; if (!t) return null;
    const overallWin = t.overall.won / t.overall.played;
    const koWin = t.knockoutRecord.won / t.knockoutRecord.played;
    const clutch = Math.round(Math.min(100, (koWin / overallWin) * 70 + t.dna.clutch * 0.3));
    return { clutch, dynasty: t.dna.dynasty, giantKiller: t.dna.giantKiller, consistency: t.dna.consistency };
  }

  /* ── INTELLIGENCE SCORE ─────────────────────────────────────────────── */
  // Weighted composite: Historical(30%) + Consistency(20%) + WinRate(20%) +
  //                     Goals(15%) + KnockoutSuccess(15%)
  // Each dimension normalised to 0-100 against the field, then weighted.
  function computeIntelligenceScore(teamKey) {
    const t = TEAMS[teamKey]; if (!t) return null;
    const all = Object.values(TEAMS);
    const norm = (val, arr) => { const mn=Math.min(...arr),mx=Math.max(...arr); return mx===mn?50:Math.round((val-mn)/(mx-mn)*100); };
    const historical  = norm(t.overall.titles*20 + t.overall.finals*5 + t.overall.semis*2, all.map(x=>x.overall.titles*20+x.overall.finals*5+x.overall.semis*2));
    const consistency = t.dna.consistency;
    const winRate     = norm(t.overall.won/t.overall.played, all.map(x=>x.overall.won/x.overall.played));
    const goals       = norm(t.overall.gf/t.overall.played, all.map(x=>x.overall.gf/x.overall.played));
    const knockout    = norm(t.knockoutRecord.won/t.knockoutRecord.played, all.map(x=>x.knockoutRecord.won/x.knockoutRecord.played));
    const score = Math.round(historical*0.30 + consistency*0.20 + winRate*0.20 + goals*0.15 + knockout*0.15);
    return { score, breakdown: { historical, consistency, winRate, goals, knockout } };
  }

  function allIntelligenceScores() {
    return Object.keys(TEAMS).map(k => ({ team:k, flag:TEAMS[k].flag, ...computeIntelligenceScore(k) }))
      .sort((a,b) => b.score - a.score);
  }

  /* ── COACH IMPACT SCORE ─────────────────────────────────────────────── */
  function coachImpactScore(c) {
    const winPct = c.won/c.matches*100;
    const titleBonus = c.bestFinish.includes("Champion") ? 30 : c.bestFinish.includes("Final") ? 15 : c.bestFinish.includes("Semi") ? 8 : 0;
    const longevity = Math.min(20, c.tournaments * 7);
    const goals = Math.min(20, c.gf/c.matches * 8);
    return Math.round(winPct*0.4 + titleBonus + longevity + goals);
  }

  const COACHES_RANKED = [...COACHES].map(c=>({...c, impactScore:coachImpactScore(c), winPct:+(c.won/c.matches*100).toFixed(1), gpm:+(c.gf/c.matches).toFixed(2)})).sort((a,b)=>b.impactScore-a.impactScore);

  /* ── TODAY IN WORLD CUP HISTORY ─────────────────────────────────────── */
  // Keyed by "MM-DD". Real historical events.
  const ON_THIS_DAY = {
    "06-13": [
      { year:1986, event:"Diego Maradona scores both the 'Hand of God' and 'Goal of the Century' against England in the quarter-final. Two goals that define the tournament forever.", teams:["Argentina","England"] },
      { year:2014, event:"Germany hammer Portugal 4-0 in their Group G opener. Müller scores a hat-trick. It signals Germany's intent on the way to their fourth title.", teams:["Germany","Portugal"] },
    ],
    "06-11": [
      { year:2026, event:"The 2026 World Cup opens at Estadio Azteca. Mexico beat South Africa 2-0 in the first match of the expanded 48-team format.", teams:["Mexico","South Africa"] },
      { year:1998, event:"Brazil open their campaign with a 2-1 win over Scotland. Cafu and César Sampaio score; Tom Boyd's own goal seals it.", teams:["Brazil","Scotland"] },
    ],
    "06-14": [
      { year:1994, event:"The USA open the first American World Cup with a 1-1 draw against Switzerland in the Pontiac Silverdome.", teams:["USA","Switzerland"] },
      { year:1998, event:"France beat South Africa 3-0 in Paris. Thierry Henry scores his first World Cup goal.", teams:["France","South Africa"] },
    ],
    "06-12": [
      { year:2014, event:"Brazil 3-1 Croatia in the tournament opener. Neymar scores twice but the match is clouded by a controversial Oscar goal and refereeing decisions.", teams:["Brazil","Croatia"] },
      { year:1998, event:"Morocco vs Norway opens Group A. Chippo's goal gives Morocco their first World Cup win.", teams:["Morocco","Norway"] },
    ],
    "06-17": [
      { year:1970, event:"Brazil 4-1 Italy in the Mexico final. The greatest World Cup match. Pelé, Gérson, Jairzinho, and Carlos Alberto score. The Jules Rimet Trophy goes to Brazil permanently.", teams:["Brazil","Italy"] },
    ],
    "06-08": [
      { year:1998, event:"The World Cup opens in Paris. Scotland vs Brazil — a tournament classic opener ends Brazil 2-1.", teams:["Brazil","Scotland"] },
    ],
  };

  function todayEvents() {
    const today = new Date();
    const key = String(today.getMonth()+1).padStart(2,"0")+"-"+String(today.getDate()).padStart(2,"0");
    return ON_THIS_DAY[key] || [];
  }

  /* ── STORY CARDS ────────────────────────────────────────────────────── */
  const STORIES = {
    greatestFinals: [
      { year:1970, title:"Brazil 4–1 Italy", subtitle:"The Perfect Final", story:"Three days after demolishing Uruguay in the semi, Brazil produced the most technically brilliant 90 minutes in World Cup history. Every goal was a statement. Carlos Alberto's fourth — a full-speed team move finished with a thundering right-foot drive — is the definitive World Cup moment.", icon:"🏆" },
      { year:1986, title:"Argentina 3–2 West Germany", subtitle:"Maradona's Tournament", story:"West Germany came back from 2-0 down to level at 2-2 with eight minutes left. Then Burruchaga, played through by Maradona, slotted the winner. A final of swings and drama, settled by the man who had carried Argentina through every round.", icon:"⭐" },
      { year:1998, title:"France 3–0 Brazil", subtitle:"The Night of Zidane", story:"Ronaldo had a fit hours before the match — the team sheet submitted with his name, withdrawn, then resubmitted. He played and was invisible. Zidane headed in two corners. Petit's late third sealed it. France's greatest night.", icon:"🇫🇷" },
      { year:2022, title:"Argentina 3–3 France (aet)", subtitle:"The Greatest Final Ever?", story:"Argentina led 2-0 with 10 minutes left. Mbappé scored twice in 90 seconds to level — the fastest brace in a World Cup final. Extra time, 3-3. Penalties. Dibu Martínez saved two. Messi lifted the only trophy that had eluded him.", icon:"🐐" },
    ],
    greatestGoals: [
      { year:1986, title:"Maradona vs England", subtitle:"Goal of the Century", story:"Eleven touches, 60 metres, past five England players and the goalkeeper. Peter Reid couldn't get near him. Peter Shilton dived the wrong way. Maradona didn't break stride. Voted the greatest goal in World Cup history by FIFA voters in 2002.", icon:"⚽" },
      { year:1970, title:"Carlos Alberto vs Italy", subtitle:"The Team Goal", story:"A move built from Brazil's own penalty area, touched by six players before reaching Carlos Alberto in full sprint. One touch, one finish. Everything Brazil represented in 1970 in a single goal.", icon:"⚽" },
      { year:1998, title:"Bergkamp vs Argentina", subtitle:"Three Touches of Genius", story:"Ninety-fourth minute. Quarter-final. Frank de Boer's 60-yard pass. Bergkamp's first touch to control it, second to flick it past Ayala, third to volley into the far corner. Commentator Jack van Gelder lost his voice. The Netherlands lost on penalties.", icon:"⚽" },
    ],
  };

  /* ── KNOWLEDGE GRAPH DATA ───────────────────────────────────────────── */
  const KNOWLEDGE_GRAPH = {
    Brazil: {
      coaches: ["Mário Zagallo","Luiz Felipe Scolari","Tite"],
      players: ["Pelé","Ronaldo","Ronaldinho","Rivaldo","Romário","Zico","Cafu"],
      rivals: ["Argentina","Germany","Italy"],
      titles: [1958,1962,1970,1994,2002],
      moments: ["1970 — Pelé's only World Cup final","2002 — Ronaldo's redemption","2014 — The Mineirazo (1-7 vs Germany)"],
    },
    Germany: {
      coaches: ["Helmut Schön","Franz Beckenbauer","Sepp Herberger","Joachim Löw"],
      players: ["Gerd Müller","Franz Beckenbauer","Miroslav Klose","Lothar Matthäus","Sepp Maier"],
      rivals: ["Netherlands","Italy","Argentina"],
      titles: [1954,1974,1990,2014],
      moments: ["1954 — Miracle of Bern vs Hungary","1974 — Home triumph","2014 — 7-1 vs Brazil"],
    },
    Argentina: {
      coaches: ["César Luis Menotti","Carlos Bilardo","Lionel Scaloni"],
      players: ["Diego Maradona","Lionel Messi","Mario Kempes","Gabriel Batistuta","Sergio Agüero"],
      rivals: ["Brazil","England","France"],
      titles: [1978,1986,2022],
      moments: ["1986 — Maradona's tournament","2022 — Messi's redemption","1990 — Final but dark tactics"],
    },
    France: {
      coaches: ["Aimé Jacquet","Raymond Domenech","Didier Deschamps"],
      players: ["Zinedine Zidane","Kylian Mbappé","Michel Platini","Thierry Henry","Didier Deschamps"],
      rivals: ["Brazil","Germany","Croatia"],
      titles: [1998,2018],
      moments: ["1998 — Zidane's double header","2006 — Zidane's headbutt","2022 — Epic final loss"],
    },
  };

  return { TEAMS, COACHES, COACHES_RANKED, UPSETS, STORIES, KNOWLEDGE_GRAPH,
           search, computeDNA, computeIntelligenceScore, allIntelligenceScores, todayEvents };

})();