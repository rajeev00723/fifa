import { supa } from "../lib/supabase.js";
import { sendEmail, emailShell } from "../lib/email.js";
import crypto from "node:crypto";

/**
 * POST /api/subscribe
 * body: { email, scope: 'all'|'team'|'player'|'goals', target?: string }
 *
 * Double opt-in: we store the row unconfirmed and email a confirm link. No
 * alerts go out until the person clicks it. This protects deliverability and
 * means nobody can sign up someone else's address.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { email, scope, target } = req.body || {};
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "Valid email required" });
    if (!["all", "team", "player", "goals"].includes(scope)) return res.status(400).json({ error: "Invalid scope" });
    if ((scope === "team" || scope === "player") && !target) return res.status(400).json({ error: "Pick a team or player" });

    const token = crypto.randomBytes(24).toString("hex");
    const db = supa();
    const { data, error } = await db.from("subscriptions")
      .insert({ email: email.trim(), scope, target: target?.trim() || null, confirmed: false, confirm_token: token })
      .select("id").single();
    if (error) throw new Error(error.message);

    const base = process.env.PUBLIC_BASE_URL || "https://fifa.rajeevbuilds.dev";
    const confirmUrl = `${base}/api/confirm?token=${token}`;
    const what = scope === "all" ? "all matches" : scope === "goals" ? "goals & key moments" : `${scope}: ${target}`;
    await sendEmail({
      to: email,
      subject: "Confirm your World Cup alerts",
      html: emailShell(`<p style="font-size:15px">Confirm you want alerts for <b style="color:#e8b84b">${what}</b>.</p>
        <p><a href="${confirmUrl}" style="display:inline-block;background:#e8b84b;color:#0a1f1a;font-weight:700;padding:11px 20px;border-radius:5px;text-decoration:none">Confirm subscription</a></p>
        <p style="font-size:12px;color:#7e9a8c">If you didn't request this, ignore this email — no alerts will be sent.</p>`).replace("{{UNSUB}}", confirmUrl),
    });

    return res.status(200).json({ ok: true, message: "Check your email to confirm." });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}