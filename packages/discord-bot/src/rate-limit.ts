interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

/**
 * A simple per-key token bucket. Used to cap how many moderation actions
 * (message deletes, timeouts, mod-log posts) the bot will perform in a burst,
 * so a raid or spam wave can't drive the bot into Discord's own API rate limits.
 */
export class TokenBucketRateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {
    if (capacity <= 0) throw new Error('capacity must be positive');
    if (refillPerSecond <= 0) throw new Error('refillPerSecond must be positive');
  }

  tryConsume(key: string, cost = 1): boolean {
    const nowMs = this.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, lastRefillMs: nowMs };

    const elapsedSeconds = Math.max(0, (nowMs - bucket.lastRefillMs) / 1000);
    const refilled = Math.min(this.capacity, bucket.tokens + elapsedSeconds * this.refillPerSecond);

    if (refilled < cost) {
      this.buckets.set(key, { tokens: refilled, lastRefillMs: nowMs });
      return false;
    }

    this.buckets.set(key, { tokens: refilled - cost, lastRefillMs: nowMs });
    return true;
  }

  reset(key?: string): void {
    if (key) this.buckets.delete(key);
    else this.buckets.clear();
  }
}
