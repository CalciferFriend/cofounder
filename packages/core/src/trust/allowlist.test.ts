import { describe, it, expect } from "vitest";
import { isPeerTrusted, addTrustedPeer, type PeerAllowlist } from "./allowlist.ts";

describe("allowlist", () => {
  const list: PeerAllowlist = { trustedIPs: ["100.64.0.1", "127.0.0.1"] };

  it("trusts a listed IP", () => {
    expect(isPeerTrusted(list, "100.64.0.1")).toBe(true);
  });

  it("rejects an unlisted IP", () => {
    expect(isPeerTrusted(list, "192.168.1.1")).toBe(false);
  });

  it("adds a new trusted peer", () => {
    const updated = addTrustedPeer(list, "100.64.0.2");
    expect(updated.trustedIPs).toContain("100.64.0.2");
    expect(updated.trustedIPs).toHaveLength(3);
  });

  it("does not duplicate an existing peer", () => {
    const updated = addTrustedPeer(list, "100.64.0.1");
    expect(updated.trustedIPs).toHaveLength(2);
  });
});
