import { describe, expect, it } from "vitest";
import { sniffAvatarType } from "@/lib/players/avatar";

describe("sniffAvatarType", () => {
  it("recognises jpeg, png and webp by their bytes", () => {
    expect(sniffAvatarType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffAvatarType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe("png");
    expect(
      sniffAvatarType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))?.ext,
    ).toBe("webp");
  });

  it("rejects anything else, including an SVG or an empty file", () => {
    expect(sniffAvatarType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffAvatarType(new Uint8Array())).toBeNull();
  });
});
