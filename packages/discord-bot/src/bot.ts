import { Client, Events, GatewayIntentBits } from 'discord.js';
import type { StorageAdapter } from '@antilink-guard/storage';
import { TokenBucketRateLimiter } from './rate-limit.js';
import { handleMessageCreate } from './events/message-create.js';
import { handleInteractionCreate } from './events/interaction-create.js';
import type { BotContext } from './context.js';
import { logger } from './logger.js';

export interface ModerationRateLimitOptions {
  capacity: number;
  refillPerSecond: number;
}

export interface CreateBotOptions {
  storage: StorageAdapter;
  moderationRateLimit?: ModerationRateLimitOptions;
}

export function createBot(options: CreateBotOptions): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const ctx: BotContext = {
    storage: options.storage,
    moderationRateLimiter: new TokenBucketRateLimiter(
      options.moderationRateLimit?.capacity ?? 10,
      options.moderationRateLimit?.refillPerSecond ?? 2,
    ),
  };

  client.once(Events.ClientReady, (readyClient) => {
    logger.info({ user: readyClient.user.tag }, 'AntiLink Guard OSS is ready');
  });

  client.on(Events.MessageCreate, (message) => {
    handleMessageCreate(message, ctx).catch((error: unknown) => {
      logger.error({ err: error }, 'unhandled error in message-create handler');
    });
  });

  client.on(Events.InteractionCreate, (interaction) => {
    handleInteractionCreate(interaction, ctx).catch((error: unknown) => {
      logger.error({ err: error }, 'unhandled error in interaction-create handler');
    });
  });

  return client;
}
