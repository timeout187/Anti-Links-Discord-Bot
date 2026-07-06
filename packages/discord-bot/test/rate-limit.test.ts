import { describe, expect, it } from 'vitest';
import { TokenBucketRateLimiter } from '../src/rate-limit.js';

function fakeClock(startMs = 0): { now: () => number; advance: (ms: number) => void } {
  let current = startMs;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

describe('TokenBucketRateLimiter', () => {
  it('allows up to the bucket capacity in an instant burst', () => {
    const clock = fakeClock();
    const limiter = new TokenBucketRateLimiter(3, 1, clock.now);

    expect(limiter.tryConsume('guild-1')).toBe(true);
    expect(limiter.tryConsume('guild-1')).toBe(true);
    expect(limiter.tryConsume('guild-1')).toBe(true);
    expect(limiter.tryConsume('guild-1')).toBe(false);
  });

  it('refills tokens over time at the configured rate', () => {
    const clock = fakeClock();
    const limiter = new TokenBucketRateLimiter(1, 1, clock.now);

    expect(limiter.tryConsume('guild-1')).toBe(true);
    expect(limiter.tryConsume('guild-1')).toBe(false);

    clock.advance(500);
    expect(limiter.tryConsume('guild-1')).toBe(false);

    clock.advance(600);
    expect(limiter.tryConsume('guild-1')).toBe(true);
  });

  it('never refills beyond capacity', () => {
    const clock = fakeClock();
    const limiter = new TokenBucketRateLimiter(2, 100, clock.now);

    clock.advance(60_000);
    expect(limiter.tryConsume('guild-1')).toBe(true);
    expect(limiter.tryConsume('guild-1')).toBe(true);
    expect(limiter.tryConsume('guild-1')).toBe(false);
  });

  it('tracks separate buckets per key', () => {
    const clock = fakeClock();
    const limiter = new TokenBucketRateLimiter(1, 1, clock.now);

    expect(limiter.tryConsume('guild-1')).toBe(true);
    expect(limiter.tryConsume('guild-2')).toBe(true);
    expect(limiter.tryConsume('guild-1')).toBe(false);
  });

  it('reset() clears a specific key', () => {
    const clock = fakeClock();
    const limiter = new TokenBucketRateLimiter(1, 1, clock.now);

    expect(limiter.tryConsume('guild-1')).toBe(true);
    expect(limiter.tryConsume('guild-1')).toBe(false);
    limiter.reset('guild-1');
    expect(limiter.tryConsume('guild-1')).toBe(true);
  });

  it('rejects a non-positive capacity or refill rate', () => {
    expect(() => new TokenBucketRateLimiter(0, 1)).toThrow();
    expect(() => new TokenBucketRateLimiter(1, 0)).toThrow();
  });
});
