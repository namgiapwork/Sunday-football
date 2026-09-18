"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Anon-key client used only for Realtime subscriptions and the reads RLS allows.
 * Every write goes through a server action.
 */
export function supabaseBrowser() {
  cached ??= createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return cached;
}
