import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AVATAR_MAX_BYTES, sniffAvatarType } from "@/lib/players/avatar";

const BUCKET = "avatars";

function pathFromUrl(url: string | null): string | null {
  const marker = `/${BUCKET}/`;
  const at = url?.indexOf(marker) ?? -1;
  return url && at >= 0 ? decodeURIComponent(url.slice(at + marker.length).split("?")[0]) : null;
}

/** Caller must already have authorised who `playerId` is. */
export async function storeAvatar(playerId: string, file: File): Promise<void> {
  if (file.size === 0) throw new Error("Choose a picture first.");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("That picture is too big — 512 KB at most.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffAvatarType(bytes);
  if (!type) throw new Error("Use a JPEG, PNG or WebP picture.");

  const db = supabaseAdmin();
  const { data: current } = await db.from("players").select("avatar_url").eq("id", playerId).maybeSingle();

  // A fresh path each time, so nobody keeps seeing a cached old picture.
  const path = `${playerId}/${Date.now()}.${type.ext}`;
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: type.mime,
    cacheControl: "31536000",
  });
  if (uploadError) throw uploadError;

  const { error } = await db
    .from("players")
    .update({ avatar_url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl })
    .eq("id", playerId);
  if (error) {
    await db.storage.from(BUCKET).remove([path]);
    throw error;
  }

  const old = pathFromUrl(current?.avatar_url ?? null);
  if (old) await db.storage.from(BUCKET).remove([old]);
}

export async function clearAvatar(playerId: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: current } = await db.from("players").select("avatar_url").eq("id", playerId).maybeSingle();

  const { error } = await db.from("players").update({ avatar_url: null }).eq("id", playerId);
  if (error) throw error;

  const old = pathFromUrl(current?.avatar_url ?? null);
  if (old) await db.storage.from(BUCKET).remove([old]);
}
