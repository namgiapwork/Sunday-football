import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";

const COOKIE_NAME = "sf_player";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days: a player logs in once a season.

function secret(): Uint8Array {
  return new TextEncoder().encode(serverEnv().sessionSecret);
}

/**
 * The cookie carries the player id and nothing else. Roles are never trusted
 * from it — they are read from the database on every privileged call (spec §78).
 */
export async function createPlayerSession(playerId: string): Promise<void> {
  const token = await new SignJWT({ sub: playerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readPlayerSession(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function clearPlayerSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
