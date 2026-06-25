/**
 * Supabase client for direct frontend database access.
 * Used when deployed as a static site (no Express server).
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || supabaseUrl === "undefined") {
  console.error("[Supabase] VITE_SUPABASE_URL is not set!");
}
if (!supabaseAnonKey || supabaseAnonKey === "REPLACE_WITH_YOUR_ANON_KEY") {
  console.error("[Supabase] VITE_SUPABASE_ANON_KEY is not set! Go to Supabase Dashboard → Settings → API → anon public key");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
