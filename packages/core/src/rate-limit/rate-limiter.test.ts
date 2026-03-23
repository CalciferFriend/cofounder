import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimiter, createRateLimiter } from "./rate-limiter.ts";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  afterEach(() => {
    limiter?.destroy();
  });

  describe("basic rate limiting", () => {
    beforeEach(() => {
      limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
    });

    it("allows requests under the limit", () => {
      const r1 = limiter.check("user1");
      expect(r1.allowed).toBe(true);
      expect(r1.current).toBe(1);
      expect(r1.limit).toBe(3);

      const r2 = limiter.check("user1");
      expect(r2.allowed).toBe(true);
      expect(r2.current).toBe(2);

      const r3 = limiter.check("user1");
      expect(r3.allowed).toBe(true);
      expect(r3.current).toBe(3);
    });

    it("rejects requests over the limit", () => {
      limiter.check("user1");
      limiter.check("user1");
      limiter.check("user1");

      const r4 = limiter.check("user1");
      expect(r4.allowed).toBe(false);
      expect(r4.current).toBe(3); // Count doesn't increment when rejected
    });

    it("tracks separate identities independently", () => {
      limiter.check("user1");
      limiter.check("user1");
      limiter.check("user1");

      const r1 = limiter.check("user1");
      expect(r1.allowed).toBe(false);

      const r2 = limiter.check("user2");
      expect(r2.allowed).toBe(true);
      expect(r2.current).toBe(1);
    });
  });

  describe("sliding window", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("allows requests after window expires", () => {
      limiter.check("user1"); // t=0
      limiter.check("user1"); // t=0

      const r1 = limiter.check("user1"); // t=0
      expect(r1.allowed).toBe(false);

      vi.advanceTimersByTime(1100); // Move past the window

      const r2 = limiter.check("user1"); // t=1100
      expect(r2.allowed).toBe(true);
      expect(r2.current).toBe(1); // Old requests expired
    });

    it("only counts requests within the window", () => {
      limiter.check("user1"); // t=0
      vi.advanceTimersByTime(600); // t=600
      limiter.check("user1"); // t=600

      const r1 = limiter.check("user1"); // t=600
      expect(r1.allowed).toBe(false);

      vi.advanceTimersByTime(500); // t=1100

      // First request (t=0) is now outside the window (>1000ms ago)
      const r2 = limiter.check("user1"); // t=1100
      expect(r2.allowed).toBe(true);
      expect(r2.current).toBe(2); // Only t=600 and t=1100 in window
    });

    it("calculates reset time correctly", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      limiter.check("user1"); // t=now
      limiter.check("user1"); // t=now

      const r = limiter.check("user1"); // Over limit
      expect(r.allowed).toBe(false);
      expect(r.resetMs).toBeGreaterThan(900); // Almost 1000ms until oldest expires
      expect(r.resetMs).toBeLessThanOrEqual(1000);

      vi.advanceTimersByTime(500);

      const r2 = limiter.check("user1");
      expect(r2.resetMs).toBeGreaterThan(400); // ~500ms until oldest expires
      expect(r2.resetMs).toBeLessThanOrEqual(500);
    });
  });

  describe("reset operations", () => {
    beforeEach(() => {
      limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
    });

    it("resets a specific identity", () => {
      limiter.check("user1");
      limiter.check("user1");

      const r1 = limiter.check("user1");
      expect(r1.allowed).toBe(false);

      limiter.reset("user1");

      const r2 = limiter.check("user1");
      expect(r2.allowed).toBe(true);
      expect(r2.current).toBe(1);
    });

    it("resets all identities", () => {
      limiter.check("user1");
      limiter.check("user1");
      limiter.check("user2");
      limiter.check("user2");

      limiter.resetAll();

      const r1 = limiter.check("user1");
      expect(r1.allowed).toBe(true);
      expect(r1.current).toBe(1);

      const r2 = limiter.check("user2");
      expect(r2.allowed).toBe(true);
      expect(r2.current).toBe(1);
    });

    it("does not error when resetting non-existent identity", () => {
      expect(() => limiter.reset("ghost")).not.toThrow();
    });
  });

  describe("cleanup", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 1000,
        cleanupIntervalMs: 2000,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("removes stale records automatically", () => {
      limiter.check("user1");
      vi.advanceTimersByTime(500);
      limiter.check("user2");

      const stats1 = limiter.getStats();
      expect(stats1.totalIdentities).toBe(2);

      // Advance past 2x window (stale threshold)
      vi.advanceTimersByTime(3000);

      // Trigger cleanup
      vi.advanceTimersByTime(2000); // Cleanup interval

      const stats2 = limiter.getStats();
      expect(stats2.totalIdentities).toBe(0);
    });

    it("keeps recently accessed records", () => {
      limiter.check("user1");
      vi.advanceTimersByTime(1500);
      limiter.check("user1"); // Access within 2x window

      vi.advanceTimersByTime(2000); // Trigger cleanup

      const stats = limiter.getStats();
      expect(stats.totalIdentities).toBe(1);
    });

    it("allows manual cleanup", () => {
      limiter.check("user1");
      vi.advanceTimersByTime(3000); // Make it stale

      limiter.cleanup();

      const stats = limiter.getStats();
      expect(stats.totalIdentities).toBe(0);
    });
  });

  describe("getStats", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns accurate statistics", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      limiter.check("user1");
      vi.advanceTimersByTime(100);
      limiter.check("user1");
      limiter.check("user2");

      const stats = limiter.getStats();
      expect(stats.totalIdentities).toBe(2);

      const user1Stats = stats.identities.find((i) => i.identity === "user1");
      expect(user1Stats?.count).toBe(2);
      expect(user1Stats?.oldestTs).toBe(now);

      const user2Stats = stats.identities.find((i) => i.identity === "user2");
      expect(user2Stats?.count).toBe(1);
    });

    it("returns empty stats when no requests have been made", () => {
      const stats = limiter.getStats();
      expect(stats.totalIdentities).toBe(0);
      expect(stats.identities).toEqual([]);
    });
  });

  describe("destroy", () => {
    it("stops cleanup timer", () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 1000,
      });

      limiter.destroy();

      // Timer should be cleared, no error on second destroy
      expect(() => limiter.destroy()).not.toThrow();
    });
  });

  describe("createRateLimiter factory", () => {
    it("creates limiter with default settings (60 req/min)", () => {
      const limiter = createRateLimiter();

      for (let i = 0; i < 60; i++) {
        const r = limiter.check("user1");
        expect(r.allowed).toBe(true);
      }

      const r = limiter.check("user1");
      expect(r.allowed).toBe(false);
      expect(r.limit).toBe(60);

      limiter.destroy();
    });

    it("accepts custom limits", () => {
      const limiter = createRateLimiter(10, 5000);

      for (let i = 0; i < 10; i++) {
        const r = limiter.check("user1");
        expect(r.allowed).toBe(true);
      }

      const r = limiter.check("user1");
      expect(r.allowed).toBe(false);
      expect(r.limit).toBe(10);

      limiter.destroy();
    });
  });

  describe("edge cases", () => {
    it("handles very low limits (1 request)", () => {
      const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });

      const r1 = limiter.check("user1");
      expect(r1.allowed).toBe(true);

      const r2 = limiter.check("user1");
      expect(r2.allowed).toBe(false);

      limiter.destroy();
    });

    it("handles very high limits", () => {
      const limiter = new RateLimiter({ maxRequests: 10000, windowMs: 1000 });

      for (let i = 0; i < 10000; i++) {
        const r = limiter.check("user1");
        expect(r.allowed).toBe(true);
      }

      const r = limiter.check("user1");
      expect(r.allowed).toBe(false);

      limiter.destroy();
    });

    it("handles empty identity string", () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

      const r1 = limiter.check("");
      expect(r1.allowed).toBe(true);

      const r2 = limiter.check("");
      expect(r2.allowed).toBe(true);

      const r3 = limiter.check("");
      expect(r3.allowed).toBe(false);

      limiter.destroy();
    });
  });
});
