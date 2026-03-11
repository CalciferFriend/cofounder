import { describe, it, expect } from "vitest";
import { generatePairingCode, hashPairingCode, verifyPairingCode } from "./pairing.ts";

describe("pairing", () => {
  it("generates a 6-digit code", () => {
    const code = generatePairingCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates different codes", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generatePairingCode()));
    expect(codes.size).toBeGreaterThan(1);
  });

  it("hashes a code to a hex string", () => {
    const hash = hashPairingCode("123456");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifies a correct code", () => {
    const code = generatePairingCode();
    const hash = hashPairingCode(code);
    expect(verifyPairingCode(code, hash)).toBe(true);
  });

  it("rejects an incorrect code", () => {
    const hash = hashPairingCode("123456");
    expect(verifyPairingCode("654321", hash)).toBe(false);
  });
});
