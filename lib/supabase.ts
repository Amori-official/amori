import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const IS_CONFIGURED = SUPABASE_URL.startsWith("http");

export function createClient() {
  if (!IS_CONFIGURED) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}

export { IS_CONFIGURED };
