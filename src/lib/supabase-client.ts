import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
}
if (!anonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
}

/** Browser client for subscribing to realtime broadcast channels. Holds only the public anon key. */
export const supabaseClient = createClient(url, anonKey, {
  auth: { persistSession: false },
});
