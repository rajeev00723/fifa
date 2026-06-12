/**
 * Email sender via Resend (https://resend.com — free tier 3,000/mo, no card).
 * Set RESEND_API_KEY and FROM_EMAIL in your env.
 *
 * FROM_EMAIL must be on a domain you've verified in Resend. Since you own
 * rajeevbuilds.dev, verify it in Resend and use something like
 * "World Cup Hub <alerts@rajeevbuilds.dev>".
 */
export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!key || !from) throw new Error("Missing RESEND_API_KEY or FROM_EMAIL");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Shared visual wrapper so every alert looks like the app (pitch green + gold).
export function emailShell(bodyHtml) {
  return `<div style="font-family:Arial,sans-serif;background:#0a1f1a;color:#eef3ee;padding:28px;border-radius:8px;max-width:520px;margin:auto">
    <div style="font-size:18px;font-weight:800;color:#e8b84b;letter-spacing:.04em">WORLD CUP INTELLIGENCE HUB</div>
    <div style="height:1px;background:#1d3b31;margin:16px 0"></div>
    ${bodyHtml}
    <div style="height:1px;background:#1d3b31;margin:18px 0"></div>
    <div style="font-size:11px;color:#7e9a8c;line-height:1.6">
      A hobby project — not affiliated with FIFA · rajeevbuilds.dev<br/>
      You're receiving this because you subscribed. <a href="{{UNSUB}}" style="color:#7e9a8c">Unsubscribe</a>.
    </div>
  </div>`;
}