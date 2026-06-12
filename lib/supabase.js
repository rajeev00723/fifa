import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 * This key bypasses row-level security, so it MUST only ever run on the server
 * (in API routes), never shipped to the browser. The subscriptions table has
 * no public policies, so the anon key can't touch it — only this can.
 */
let client = null;

export function supa() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}