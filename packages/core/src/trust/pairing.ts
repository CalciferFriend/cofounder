import { randomBytes, createHash } from "node:crypto";

/**
 * Generate a 6-digit pairing code for the two-machine handshake.
 */
export function generatePairingCode(): string {
  const num = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, "0");
}

/**
 * Hash a pairing code for storage (never store plaintext).
 */
export function hashPairingCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Verify a pairing code against a stored hash.
 */
export function verifyPairingCode(code: string, hash: string): boolean {
  return hashPairingCode(code) === hash;
}
