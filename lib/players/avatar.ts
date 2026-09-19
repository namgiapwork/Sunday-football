/** Pure checks for an uploaded profile picture. No I/O, safe to unit test. */

export const AVATAR_MAX_BYTES = 512 * 1024;

export type AvatarType = { mime: "image/webp" | "image/jpeg" | "image/png"; ext: "webp" | "jpg" | "png" };

/** Identifies the image from its leading bytes; the client-supplied type is never trusted. */
export function sniffAvatarType(bytes: Uint8Array): AvatarType | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

  if (startsWith([0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  // RIFF....WEBP
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}
