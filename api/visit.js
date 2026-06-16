import { cacheGet, cacheSet } from "../lib/cache.js";

/**
 * Combined endpoint:
 * POST /api/visit          — increment visit counter
 * GET  /api/visit          — get visit stats
 * GET  /api/visit?news=1   — fetch + cache football news from RSS feeds
 */
export const config = { runtime: "nodejs" };

const today = () => new Date().toISOString().slice(0, 10);

// ── VISIT COUNTER ────────────────────────────────────────────────────────────
async function increment() {
  const totalRaw = await cacheGet("wc:visits:total").catch(() => null);
  const total = parseInt(totalRaw?.value ?? totalRaw ?? "0", 10) || 0;
  await cacheSet("wc:visits:total", String(total + 1), 0);
  const dayKey = `wc:visits:${today()}`;
  const dayRaw = await cacheGet(dayKey).catch(() => null);
  const dayCount = parseInt(dayRaw?.value ?? dayRaw ?? "0", 10) || 0;
  const newDay = dayCount + 1;
  await cacheSet(dayKey, String(newDay), 172800);
  const histRaw = await cacheGet("wc:visits:history").catch(() => null);
  let history = [];
  try { history = JSON.parse(histRaw?.value ?? histRaw ?? "[]"); } catch {}
  const idx = history.findIndex(h => h.date === today());
  if (idx >= 0) history[idx].count = newDay;
  else history.push({ date: today(), count: newDay });
  history = history.sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  await cacheSet("wc:visits:history", JSON.stringify(history), 0);
  return { total: total + 1, today: newDay, history };
}

async function getStats() {
  const totalRaw = await cacheGet("wc:visits:total").catch(() => null);
  const total = parseInt(totalRaw?.value ?? totalRaw ?? "0", 10) || 0;
  const dayRaw = await cacheGet(`wc:visits:${today()}`).catch(() => null);
  const todayCount = parseInt(dayRaw?.value ?? dayRaw ?? "0", 10) || 0;
  const histRaw = await cacheGet("wc:visits:history").catch(() => null);
  let history = [];
  try { history = JSON.parse(histRaw?.value ?? histRaw ?? "[]"); } catch {}
  return { total, today: todayCount, history };
}

// ── NEWS FEED ─────────────────────────────────────────────────────────────────
// Decode HTML entities so RSS text displays cleanly
function decodeEntities(str) {
  return str
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g,   (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .trim();
}

// Clean raw RSS field content into plain readable text
// Order matters: decode entities FIRST (so &lt;a becomes <a), THEN strip HTML tags
function cleanText(raw, maxLen = 200) {
  return decodeEntities(raw)   // 1. decode &lt; &amp; etc → real chars
    .replace(/<[^>]*>/g, " ") // 2. strip any resulting HTML tags
    .replace(/\s+/g, " ")     // 3. collapse whitespace
    .replace(/\[.*?\]/g, "")  // 4. remove [bracketed link text] (Google News artifact)
    .replace(/\bRead\s*(more|→|&rarr;|\u2192)?\b\s*$/i, "") // 5. strip trailing "Read →"
    .replace(/\d+[mh]\s*ago\s*$/i, "")  // 6. strip trailing "56m ago" timestamps
    .trim()
    .slice(0, maxLen);
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];

    // Extract raw field — handles both CDATA and plain text variants
    const get = (tag) => {
      const r = new RegExp(
        `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>` +
        `|<${tag}[^>]*>([^<]*)<\\/${tag}>`
      );
      const match = r.exec(block);
      return match ? (match[1] || match[2] || "").trim() : "";
    };

    const title = cleanText(get("title"), 120);
    const link  = get("link") || block.match(/<link>([^<]+)<\/link>/)?.[1] || "";
    const rawDesc = get("description");

    // Google News descriptions are HTML link lists — useless as text.
    // Detect and discard them; show title-only cards instead.
    const isHtmlDesc = rawDesc.includes("<a ") || rawDesc.includes("&lt;a ") || rawDesc.includes("<ul") || rawDesc.includes("<li");
    const desc = isHtmlDesc ? "" : cleanText(rawDesc, 180);

    const pub   = get("pubDate");
    const img   = block.match(/url="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i)?.[1] || null;
    const src   = cleanText(get("source") || "", 60);

    if (title && link) items.push({ title, link, desc, pub, img, src });
  }
  return items;
}

async function fetchNews() {
  const cacheKey = "wc:news:feed:v2"; // v2 = HTML entity fix
  const cached = await cacheGet(cacheKey).catch(() => null);
  if (cached) {
    try { return JSON.parse(cached?.value ?? cached); } catch {}
  }

  const feeds = [
    { url: "https://feeds.bbci.co.uk/sport/football/rss.xml",   source: "BBC Sport" },
    { url: "https://news.google.com/rss/search?q=FIFA+World+Cup+2026+football&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    { url: "https://www.theguardian.com/football/worldcup/rss",  source: "The Guardian" },
  ];

  const results = await Promise.allSettled(
    feeds.map(f =>
      fetch(f.url, { headers: { "User-Agent": "WorldCupHub/1.0 (+https://fifa.rajeevbuilds.dev)" }, signal: AbortSignal.timeout(5000) })
        .then(r => r.text())
        .then(xml => parseRSS(xml).slice(0, 8).map(item => ({ ...item, src: item.src || f.source })))
        .catch(() => [])
    )
  );

  // Merge and deduplicate by title similarity
  const all = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  const seen = new Set();
  const deduped = all.filter(item => {
    const key = item.title.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date (newest first), fall back to feed order
  deduped.sort((a, b) => {
    const da = a.pub ? new Date(a.pub).getTime() : 0;
    const db = b.pub ? new Date(b.pub).getTime() : 0;
    return db - da;
  });

  const payload = { items: deduped.slice(0, 20), fetchedAt: new Date().toISOString() };
  await cacheSet(cacheKey, JSON.stringify(payload), 1800); // 30 min cache
  return payload;
}

// ── HANDLER ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    // News mode
    if (req.query?.news) {
      const news = await fetchNews();
      res.setHeader("Cache-Control", "public, s-maxage=600");
      return res.status(200).json(news);
    }
    // Visit counter
    const stats = req.method === "POST" ? await increment() : await getStats();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(stats);
  } catch (e) {
    console.error("visit/news error:", e.message);
    return res.status(200).json(req.query?.news
      ? { items: [], fetchedAt: new Date().toISOString(), error: e.message }
      : { total: 0, today: 0, history: [] }
    );
  }
}