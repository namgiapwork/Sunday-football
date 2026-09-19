"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { removeAvatarAction, updateAvatarAction } from "@/app/actions/profile";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { PlayerAvatar } from "@/components/players/player-avatar";

const SIZE = 256;

/** Centre-crops to a square and shrinks, so uploads stay tiny whatever the phone camera produced. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("Could not prepare that picture.");
  return blob;
}

export function AvatarForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [saveState, save, saving] = useActionState(updateAvatarAction, IDLE);
  const [removeState, remove, removing] = useActionState(removeAvatarAction, IDLE);
  const [localError, setLocalError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setLocalError(null);
    try {
      const data = new FormData();
      data.set("avatar", new File([await shrink(file)], "avatar.webp", { type: "image/webp" }));
      startTransition(() => save(data));
    } catch {
      setLocalError("Could not read that picture. Try a JPEG, PNG or WebP.");
    }
    if (input.current) input.current.value = "";
  }

  const state = saveState.ok !== null ? saveState : removeState;
  const error = localError ?? (state.ok === false ? state.error : null);
  const busy = saving || removing;

  return (
    <div className="mb-8 flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <PlayerAvatar name={name} avatarUrl={avatarUrl} size="xl" />
        <div className="flex flex-col items-start gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="rounded-xl border border-pitch-700 px-4 py-2 text-sm font-semibold hover:bg-pitch-850 disabled:opacity-50"
          >
            {saving ? "Uploading…" : avatarUrl ? "Change picture" : "Add picture"}
          </button>
          {avatarUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => startTransition(() => remove(new FormData()))}
              className="text-sm text-chalk-dim underline disabled:opacity-50"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {!error && state.ok === true ? <Alert tone="success">{state.message}</Alert> : null}
    </div>
  );
}
