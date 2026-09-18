import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GroupRow, VenueRow } from "@/types/database";

/** V1 runs a single group; the query is written so a second one would not break it. */
export const getGroup = cache(async (): Promise<GroupRow | null> => {
  const { data } = await supabaseAdmin()
    .from("groups")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
});

export const listVenues = cache(async (groupId: string): Promise<VenueRow[]> => {
  const { data } = await supabaseAdmin()
    .from("venues")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
});
