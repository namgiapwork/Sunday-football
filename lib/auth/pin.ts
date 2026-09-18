import "server-only";
import bcrypt from "bcryptjs";

const ROUNDS = 10;

/** Consecutive wrong PINs before the account is paused (spec §77). */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 10;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/** Burns roughly the same time as a real check, so a missing player is not detectable. */
export async function dummyVerify(): Promise<void> {
  await bcrypt.compare("0000", "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy");
}
