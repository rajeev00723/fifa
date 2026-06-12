import { fetchLiveAndToday, fetchMatchDetail } from "../../lib/provider.js";
import { supa } from "../../lib/supabase.js";
import { sendEmail, emailShell } from "../../lib/email.js";

/**
 * Scheduled notifier. For each live/finished match today it derives "events"
 * (kickoff, goal, full-time), builds a stable event_key per event, finds
 * confirmed subscriptions that match, and emails — but only if that exact
 * (event_key → subscription) pair hasn't already been sent.
 *
 * The sent_notifications table is the dedupe guard: its UNIQUE(event_key,
 * subscription_id) constraint makes a re-send a no-op insert that we skip.
 *
 * Auth: gated by CRON_SECRET like your refresh cron.
 */
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const db = supa();
    const { data: subs } = await db.from("subscriptions").select("*").eq("confirmed", true);
    if (!subs || subs.length === 0) return res.status(200).json({ ok: true, note: "no confirmed subscribers" });

    const today = await fetchLiveAndToday();
    const events = [];

    // 1. Kickoff + result events from the day's match list (cheap, no extra calls).
    for (const m of [...today.live, ...today.finishedToday]) {
      if (m.status === "LIVE") events.push(ev(`kickoff:${m.id}`, "kickoff", m, `${m.home.name} vs ${m.away.name} is underway.`));
      if (m.status === "FINISHED") events.push(ev(`ft:${m.id}`, "result", m, `Full time: ${m.home.name} ${m.home.score}–${m.away.score} ${m.away.name}.`));
    }

    // 2. Goal events — only fetch detail for matches currently live (limits API calls).
    for (const m of today.live) {
      try {
        const d = await fetchMatchDetail(m.id);
        for (const e of d.events.filter((x) => x.type === "GOAL")) {
          events.push(ev(`goal:${m.id}:${e.minute}:${e.player}`, "goal", m, `⚽ ${e.player} scores for ${e.team}! ${d.home.name} ${d.home.score}–${d.away.score} ${d.away.name} (${e.minute}')`, e));
        }
      } catch { /* lineups/events may not be published yet — skip quietly */ }
    }

    let sent = 0;
    for (const event of events) {
      for (const s of subs) {
        if (!matches(s, event)) continue;
        // dedupe: try to claim this (event, subscriber) pair.
        const { error: claimErr } = await db.from("sent_notifications")
          .insert({ event_key: event.key, subscription_id: s.id });
        if (claimErr) continue; // unique violation → already sent, skip
        const unsub = `${base()}/api/confirm?token=${s.confirm_token}`;
        try {
          await sendEmail({
            to: s.email,
            subject: subjectFor(event),
            html: emailShell(`<p style="font-size:16px;line-height:1.5">${event.message}</p>
              <p style="font-size:12px;color:#7e9a8c">${labelFor(s)}</p>`).replace("{{UNSUB}}", unsub),
          });
          sent++;
        } catch (mailErr) {
          // roll back the claim so a transient mail failure can retry next run
          await db.from("sent_notifications").delete().eq("event_key", event.key).eq("subscription_id", s.id);
        }
      }
    }

    return res.status(200).json({ ok: true, events: events.length, emailsSent: sent });
  } catch (e) {
    console.error("notify cron failed:", e.message);
    return res.status(200).json({ ok: false, error: e.message });
  }
}

function ev(key, type, m, message, goal) {
  return { key, type, home: m.home.name, away: m.away.name, goalTeam: goal?.team || null, goalPlayer: goal?.player || null, message };
}

// Does this subscription want this event?
function matches(sub, e) {
  if (sub.scope === "all") return true;
  if (sub.scope === "goals") return e.type === "goal";
  if (sub.scope === "team") return e.home === sub.target || e.away === sub.target || e.goalTeam === sub.target;
  if (sub.scope === "player") return e.goalPlayer === sub.target;
  return false;
}

function subjectFor(e) {
  return e.type === "goal" ? `⚽ Goal — ${e.home} vs ${e.away}` : e.type === "result" ? `Full time — ${e.home} vs ${e.away}` : `Kickoff — ${e.home} vs ${e.away}`;
}
function labelFor(s) {
  return s.scope === "all" ? "You're subscribed to all matches." : s.scope === "goals" ? "You're subscribed to goals & key moments." : `You're subscribed to ${s.scope}: ${s.target}.`;
}
function base() { return process.env.PUBLIC_BASE_URL || "https://fifa.rajeevbuilds.dev"; }