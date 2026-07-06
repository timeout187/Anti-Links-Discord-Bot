import type { StorageAdapter } from '@antilink-guard/storage';
import type { TokenBucketRateLimiter } from './rate-limit.js';

export interface BotContext {
  storage: StorageAdapter;
  moderationRateLimiter: TokenBucketRateLimiter;
}
