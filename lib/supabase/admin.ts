import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let cached: ReturnType<typeof build> | null = null;

function build() {
  const env = serverEnv();
  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Bypasses RLS. Only ever used inside server actions and route handlers that
 * have already authorised the caller (spec §49: never reaches the browser).
 */
export function supabaseAdmin() {
  cached ??= build();
  return cached;
}
