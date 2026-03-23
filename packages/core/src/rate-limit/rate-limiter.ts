/**
 * rate-limit/rate-limiter.ts
 *
 * Sliding-window rate limiter for HTTP endpoints.
 * Tracks requests per identity (IP address, API token, etc.) over a time window.
 *
 * No external dependencies — pure in-memory counters with automatic cleanup.
 */

export interface RateLimiterOptions {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional cleanup interval (default: windowMs) */
  cleanupIntervalMs?: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current count for this identity within the window */
  current: number;
  /** Maximum allowed requests */
  limit: number;
  /** Milliseconds until the rate limit resets */
  resetMs: number;
}

interface RequestRecord {
  timestamps: number[];
  lastCleanup: number;
}

export class RateLimiter {
  private records = new Map<string, RequestRecord>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;

    // Start periodic cleanup
    const cleanupInterval = options.cleanupIntervalMs ?? this.windowMs;
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
  }

  /**
   * Check if a request from the given identity is allowed.
   * Returns rate limit result with current count and reset time.
   */
  check(identity: string): RateLimitResult {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let record = this.records.get(identity);
    if (!record) {
      record = { timestamps: [], lastCleanup: now };
      this.records.set(identity, record);
    }

    // Remove timestamps outside the window
    record.timestamps = record.timestamps.filter((ts) => ts > cutoff);

    const current = record.timestamps.length;
    const allowed = current < this.maxRequests;

    if (allowed) {
      record.timestamps.push(now);
    }

    record.lastCleanup = now;

    // Calculate reset time (when the oldest timestamp will expire)
    const oldestTs = record.timestamps[0] ?? now;
    const resetMs = Math.max(0, this.windowMs - (now - oldestTs));

    return {
      allowed,
      current: current + (allowed ? 1 : 0), // Include the current request in count
      limit: this.maxRequests,
      resetMs,
    };
  }

  /**
   * Reset the rate limit for a specific identity.
   * Useful for manual overrides or testing.
   */
  reset(identity: string): void {
    this.records.delete(identity);
  }

  /**
   * Reset all rate limits.
   */
  resetAll(): void {
    this.records.clear();
  }

  /**
   * Remove stale records that haven't been accessed recently.
   * Runs automatically on a timer, but can be called manually.
   */
  cleanup(): void {
    const now = Date.now();
    const staleThreshold = now - this.windowMs * 2; // Keep records for 2x window

    for (const [identity, record] of this.records.entries()) {
      if (record.lastCleanup < staleThreshold) {
        this.records.delete(identity);
      }
    }
  }

  /**
   * Stop the cleanup timer.
   * Should be called when the rate limiter is no longer needed.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get current statistics for debugging/monitoring.
   */
  getStats(): {
    totalIdentities: number;
    identities: Array<{ identity: string; count: number; oldestTs: number }>;
  } {
    const identities: Array<{
      identity: string;
      count: number;
      oldestTs: number;
    }> = [];

    for (const [identity, record] of this.records.entries()) {
      identities.push({
        identity,
        count: record.timestamps.length,
        oldestTs: record.timestamps[0] ?? 0,
      });
    }

    return {
      totalIdentities: this.records.size,
      identities,
    };
  }
}

/**
 * Create a rate limiter with standard defaults:
 * - 60 requests per minute (typical API rate limit)
 * - 1-minute window
 */
export function createRateLimiter(
  maxRequests = 60,
  windowMs = 60_000,
): RateLimiter {
  return new RateLimiter({ maxRequests, windowMs });
}
