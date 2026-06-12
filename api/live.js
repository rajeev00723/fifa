import { fetchLiveAndToday } from "../lib/provider.js";
import { cacheGet, cacheSet, KEYS, TTL } from "../lib/cache.js";

/**
 * What the frontend polls every 60s. Reads from cache. If the cache is empty
 * (e.g. cold start before the first cron fired), it does ONE live fetch to
 * self-heal so the first visitor isn't greeted by an empty page.
 */
export default async function handler(req, res) {
  try {
    let data = await cacheGet(KEYS.live);
    if (!data) {
      data = await fetchLiveAndToday();
      await cacheSet(KEYS.live, data, TTL.live);
    }
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=30");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(503).json({ error: "Live data unavailable", detail: e.message });
  }
}
