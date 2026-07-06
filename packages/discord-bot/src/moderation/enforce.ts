import { randomUUID } from 'node:crypto';
import type { ModerationActionType, ScanResult } from '@antilink-guard/core';
import type {
  AuditLogEntry,
  ModerationActionRecord,
  StorageAdapter,
} from '@antilink-guard/storage';
import { logger } from '../logger.js';

export const DEFAULT_TIMEOUT_DURATION_MS = 10 * 60 * 1000;

/**
 * The minimal shape enforce.ts needs from a discord.js Message. Depending on
 * this narrow interface (rather than the full discord.js Message class) keeps
 * this module testable with plain fakes instead of a live Discord connection.
 */
export interface EnforceableMessage {
  guildId: string;
  channelId: string;
  author: { id: string };
  deletable: boolean;
  delete(): Promise<unknown>;
  member: {
    moderatable: boolean;
    timeout(durationMs: number, reason?: string): Promise<unknown>;
  } | null;
}

export interface EnforceOptions {
  timeoutDurationMs?: number;
}

export interface EnforcementOutcome {
  actionTaken: ModerationActionType;
  auditEntry: AuditLogEntry;
}

export async function enforceScanResult(
  message: EnforceableMessage,
  result: ScanResult,
  storage: StorageAdapter,
  options: EnforceOptions = {},
): Promise<EnforcementOutcome> {
  const timeoutDurationMs = options.timeoutDurationMs ?? DEFAULT_TIMEOUT_DURATION_MS;
  const topLink = result.matchedLinks[0]?.link;
  const reasonText = result.reasons.length > 0 ? result.reasons.join(', ') : 'policy match';

  let actionTaken: ModerationActionType = 'NONE';

  if (result.action === 'DELETE' || result.action === 'TIMEOUT') {
    if (message.deletable) {
      try {
        await message.delete();
        actionTaken = 'DELETE';
      } catch (error) {
        logger.warn({ err: error, guildId: message.guildId }, 'failed to delete message');
      }
    } else {
      logger.warn(
        { guildId: message.guildId, channelId: message.channelId },
        'missing permission to delete message, skipping',
      );
    }
  }

  if (result.action === 'TIMEOUT') {
    if (message.member?.moderatable) {
      try {
        await message.member.timeout(timeoutDurationMs, reasonText);
        actionTaken = 'TIMEOUT';
      } catch (error) {
        logger.warn({ err: error, guildId: message.guildId }, 'failed to time out member');
      }
    } else {
      logger.warn(
        { guildId: message.guildId, userId: message.author.id },
        'missing permission or role hierarchy to time out member, skipping',
      );
    }
  }

  if ((result.action === 'LOG' || result.action === 'WARN') && actionTaken === 'NONE') {
    actionTaken = result.action;
  }

  const auditEntry: AuditLogEntry = {
    id: randomUUID(),
    guildId: message.guildId,
    channelId: message.channelId,
    userId: message.author.id,
    normalizedUrl: topLink?.normalizedUrl,
    hostname: topLink?.hostname,
    verdict: result.verdict,
    reasons: result.reasons,
    score: result.score,
    action: actionTaken,
    createdAt: new Date(),
  };
  await storage.addAuditLogEntry(auditEntry);

  const moderationAction: ModerationActionRecord = {
    id: randomUUID(),
    guildId: message.guildId,
    auditLogEntryId: auditEntry.id,
    userId: message.author.id,
    channelId: message.channelId,
    actionType: actionTaken,
    reason: reasonText,
    createdAt: new Date(),
  };
  await storage.addModerationAction(moderationAction);

  return { actionTaken, auditEntry };
}
