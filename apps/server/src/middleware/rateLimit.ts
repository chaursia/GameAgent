/**
 * Action Rate Limiter
 *
 * A simple token-bucket rate limiter keyed by (sessionId + playerId).
 * Prevents clients from sending actions faster than the game tick rate.
 *
 * The bucket for each player refills at `refillRate` tokens/second.
 * Each action consumes 1 token. If the bucket is empty, the action
 * is rejected with HTTP 429.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

// Max tokens per player-session (burst allowance)
const MAX_TOKENS = 10;
// Refill rate: tokens per second
const REFILL_RATE = 8;

/**
 * Check if an action from `playerId` in `sessionId` is allowed.
 * Returns true if allowed (consumed 1 token), false if rate-limited.
 */
export function checkActionRate(sessionId: string, playerId: string): boolean {
  const key = `${sessionId}:${playerId}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + elapsed * REFILL_RATE);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    return false; // Rate limited
  }

  bucket.tokens -= 1;
  return true;
}

/**
 * Clean up buckets for a session (call when session ends).
 */
export function clearSessionBuckets(sessionId: string): void {
  for (const key of buckets.keys()) {
    if (key.startsWith(`${sessionId}:`)) {
      buckets.delete(key);
    }
  }
}

/**
 * Periodic cleanup of stale buckets (older than 5 minutes).
 * Called automatically on import.
 */
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) {
      buckets.delete(key);
    }
  }
}, 60_000);
