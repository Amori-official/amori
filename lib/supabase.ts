import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/supabase-config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const IS_CONFIGURED = isSupabaseConfigured();

export function createClient() {
  if (!IS_CONFIGURED) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}

export { IS_CONFIGURED };
