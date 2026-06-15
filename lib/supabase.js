import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 * The service role key bypasses RLS entirely — no policies needed.
 * Must only ever run server-side (API routes), never in the browser.
 *
 * Key options for RLS bypass:
 *   auth.persistSession: false    — serverless, no session storage
 *   auth.autoRefreshToken: false  — no token refresh needed server-side
 *   global.headers                — explicitly sends the service role as Bearer
 *                                   token, guaranteeing RLS bypass on all calls
 */
let client = null;

export function supa() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    },
  });
  return client;
}