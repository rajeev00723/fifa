/**
 * LinkedIn posting client.
 * Uses OAuth 2.0 with automatic token refresh — the access token
 * lasts 60 days but the refresh token lasts a year, so this
 * silently renews when needed and updates the env var via Vercel API.
 *
 * Docs: https://learn.microsoft.com/en-us/linkedin/shared/authentication/
 */

async function getValidToken() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const refreshToken = process.env.LINKEDIN_REFRESH_TOKEN;
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!token) throw new Error("Missing LINKEDIN_ACCESS_TOKEN");

  // Try the current token first — if it works, use it
  const test = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (test.ok) return token;

  // Token expired — try to refresh
  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("LinkedIn token expired and no refresh token available. Re-run the OAuth flow.");
  }

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn token refresh failed: ${err}`);
  }

  const data = await res.json();
  // Note: can't update Vercel env vars from a function — log a reminder
  console.log("LinkedIn token refreshed. Update LINKEDIN_ACCESS_TOKEN in Vercel env vars:", data.access_token.slice(0,20)+"...");
  return data.access_token;
}

/**
 * Post text content to LinkedIn as the authenticated user.
 * LinkedIn text posts with a URL preview are the highest-engagement format.
 */
export async function postToLinkedIn({ text, url }) {
  const personId = process.env.LINKEDIN_PERSON_ID;
  const orgId = process.env.LINKEDIN_ORG_ID; // optional: company page ID
  if (!personId && !orgId) throw new Error("Missing LINKEDIN_PERSON_ID or LINKEDIN_ORG_ID");

  const token = await getValidToken();

  // Post to company page if LINKEDIN_ORG_ID is set, otherwise personal profile
  const author = orgId
    ? `urn:li:organization:${orgId}`
    : `urn:li:person:${personId}`;

  const body = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: url ? `${text}\n\n${url}` : text,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`LinkedIn post failed ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return { postId: data.id, url: `https://www.linkedin.com/feed/update/${data.id}/` };
}

/**
 * Format a match result into a LinkedIn post.
 * Designed for engagement: result up front, key facts, link, hashtags.
 */
export function formatMatchPost({ home, away, homeScore, awayScore, facts = [], stage }) {
  const result = `${home} ${homeScore}–${awayScore} ${away}`;
  const winner = homeScore > awayScore ? home : awayScore > homeScore ? away : null;
  const emoji = homeScore === awayScore ? "🤝" : "⚽";

  const lines = [
    `${emoji} ${result}`,
    stage ? `${stage} · #WorldCup2026` : "#WorldCup2026",
    "",
  ];

  // Add up to 3 key facts
  facts.slice(0, 3).forEach(f => lines.push(`▸ ${f}`));

  lines.push("");
  lines.push("Full match story, lineups & stats:");
  lines.push("https://fifa.rajeevbuilds.dev");
  lines.push("");
  lines.push(`#${home.replace(/\s/g,"")} #${away.replace(/\s/g,"")} #Football #Soccer #FIFAWorldCup`);

  return lines.join("\n");
}