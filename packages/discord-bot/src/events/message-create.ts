import type { Message } from 'discord.js';
import { evaluateMessage } from '@antilink-guard/core';
import { createDefaultGuildConfig } from '@antilink-guard/storage';
import { buildPolicyConfig } from '../policy-from-config.js';
import { enforceScanResult } from '../moderation/enforce.js';
import { sendModLog } from '../moderation/mod-log.js';
import type { BotContext } from '../context.js';
import { logger } from '../logger.js';

const RATE_LIMIT_KEY_PREFIX = 'guild:';

export async function handleMessageCreate(message: Message, ctx: BotContext): Promise<void> {
  if (message.author.bot) return;
  if (!message.inGuild()) return;

  const guildId = message.guildId;

  try {
    const [guildConfig, allowlist, blocklist, inviteRules] = await Promise.all([
      ctx.storage.getGuildConfig(guildId),
      ctx.storage.listAllowlistEntries(guildId),
      ctx.storage.listBlocklistEntries(guildId),
      ctx.storage.listInviteRules(guildId),
    ]);

    const resolvedGuildConfig = guildConfig ?? createDefaultGuildConfig(guildId);
    if (!resolvedGuildConfig.enabled) return;

    const policy = buildPolicyConfig({
      guildConfig: resolvedGuildConfig,
      allowlist,
      blocklist,
      inviteRules,
    });

    const result = evaluateMessage(
      message.content,
      {
        guildId,
        channelId: message.channelId,
        authorId: message.author.id,
        authorRoleIds: message.member?.roles.cache.map((role) => role.id) ?? [],
        mentionCount: message.mentions.users.size + message.mentions.roles.size,
      },
      policy,
    );

    if (result.verdict === 'ALLOW' || result.bypassed) return;

    if (!ctx.moderationRateLimiter.tryConsume(`${RATE_LIMIT_KEY_PREFIX}${guildId}`)) {
      logger.warn({ guildId }, 'moderation rate limit exceeded, skipping enforcement');
      return;
    }

    const { auditEntry } = await enforceScanResult(message, result, ctx.storage);

    if (resolvedGuildConfig.logChannelId) {
      await sendModLog(message.client, resolvedGuildConfig.logChannelId, auditEntry);
    }
  } catch (error) {
    logger.error({ err: error, guildId }, 'failed to process message for moderation');
  }
}
