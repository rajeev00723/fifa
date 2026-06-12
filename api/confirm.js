import { supa } from "../lib/supabase.js";

/**
 * GET /api/confirm?token=...   (the link in the confirmation email)
 * Also doubles as the unsubscribe link target: confirming an unconfirmed row
 * activates it; hitting it for a confirmed row deletes it (toggle off).
 */
export default async function handler(req, res) {
  const token = req.query?.token;
  if (!token) return res.status(400).send("Missing token");
  try {
    const db = supa();
    const { data: sub } = await db.from("subscriptions").select("id,confirmed").eq("confirm_token", token).single();
    if (!sub) return html(res, "Link not found", "This confirmation link is invalid or already used.");

    if (!sub.confirmed) {
      await db.from("subscriptions").update({ confirmed: true }).eq("id", sub.id);
      return html(res, "You're subscribed ✓", "You'll get match alerts as they happen. Use the unsubscribe link in any email to stop.");
    } else {
      // already confirmed → treat as unsubscribe
      await db.from("subscriptions").delete().eq("id", sub.id);
      return html(res, "Unsubscribed", "You won't receive further alerts for this subscription.");
    }
  } catch (e) {
    return html(res, "Something went wrong", e.message);
  }
}

function html(res, title, msg) {
  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
  <body style="font-family:Arial,sans-serif;background:#0a1f1a;color:#eef3ee;display:grid;place-items:center;min-height:100vh;margin:0">
    <div style="text-align:center;padding:30px;max-width:440px">
      <div style="font-weight:800;color:#e8b84b;letter-spacing:.05em;font-size:13px">WORLD CUP INTELLIGENCE HUB</div>
      <h1 style="font-size:24px;margin:18px 0 10px">${title}</h1>
      <p style="color:#7e9a8c;line-height:1.6">${msg}</p>
      <a href="https://fifa.rajeevbuilds.dev" style="color:#e8b84b">← Back to the hub</a>
    </div></body>`);
}