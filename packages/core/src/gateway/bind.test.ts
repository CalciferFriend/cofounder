import { describe, it, expect } from "vitest";
import { getBindAddress } from "./bind.ts";

describe("getBindAddress", () => {
  it("returns 127.0.0.1 for loopback", () => {
    expect(getBindAddress("loopback")).toBe("127.0.0.1");
  });

  it("returns 0.0.0.0 for lan", () => {
    expect(getBindAddress("lan")).toBe("0.0.0.0");
  });

  it("returns tailscale IP for tailscale mode", () => {
    expect(getBindAddress("tailscale", "100.64.0.1")).toBe("100.64.0.1");
  });

  it("throws if tailscale mode without IP", () => {
    expect(() => getBindAddress("tailscale")).toThrow("Tailscale IP required");
  });
});
