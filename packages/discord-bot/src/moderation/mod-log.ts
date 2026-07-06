import { EmbedBuilder } from 'discord.js';
import type { Verdict } from '@antilink-guard/core';
import type { AuditLogEntry } from '@antilink-guard/storage';
import { logger } from '../logger.js';

const DEFAULT_COLOR = 0x95a5a6;

const VERDICT_COLOR: Record<Verdict, number> = {
  ALLOW: 0x2ecc71,
  WARN: 0xf1c40f,
  BLOCK: 0xe67e22,
  QUARANTINE: 0xe74c3c,
};

export function buildModLogEmbed(entry: AuditLogEntry): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('AntiLink Guard - action taken')
    .setColor(VERDICT_COLOR[entry.verdict] ?? DEFAULT_COLOR)
    .addFields(
      { name: 'User', value: `<@${entry.userId}>`, inline: true },
      { name: 'Channel', value: `<#${entry.channelId}>`, inline: true },
      { name: 'Action', value: entry.action, inline: true },
      { name: 'Verdict', value: entry.verdict, inline: true },
      { name: 'Score', value: String(entry.score), inline: true },
      { name: 'Reasons', value: entry.reasons.length > 0 ? entry.reasons.join(', ') : 'none' },
    )
    .setTimestamp(entry.createdAt);

  if (entry.normalizedUrl) {
    embed.addFields({ name: 'URL', value: entry.normalizedUrl });
  }

  return embed;
}

interface SendableChannel {
  send(payload: { embeds: EmbedBuilder[] }): Promise<unknown>;
}

function isSendableChannel(channel: unknown): channel is SendableChannel {
  if (typeof channel !== 'object' || channel === null) return false;
  const candidate = channel as { isTextBased?: unknown; send?: unknown };
  return (
    typeof candidate.isTextBased === 'function' &&
    (candidate.isTextBased as () => boolean)() === true &&
    typeof candidate.send === 'function'
  );
}

/** The minimal shape needed from a discord.js Client to post a mod-log message. */
export interface ModLogChannelSource {
  channels: {
    fetch(channelId: string): Promise<unknown>;
  };
}

export async function sendModLog(
  client: ModLogChannelSource,
  logChannelId: string,
  entry: AuditLogEntry,
): Promise<void> {
  try {
    const channel = await client.channels.fetch(logChannelId);
    if (!isSendableChannel(channel)) {
      logger.warn({ logChannelId }, 'configured log channel is missing or not text-based');
      return;
    }
    await channel.send({ embeds: [buildModLogEmbed(entry)] });
  } catch (error) {
    logger.warn({ err: error, logChannelId }, 'failed to send mod-log message');
  }
}
