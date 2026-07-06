import type {
  DetectionReason,
  EnforcementMode,
  ModerationActionType,
  Verdict,
} from '@antilink-guard/core';

export interface GuildConfig {
  guildId: string;
  enabled: boolean;
  mode: EnforcementMode;
  logChannelId?: string;
  bypassRoleIds: string[];
  bypassUserIds: string[];
  blockAllInvites: boolean;
  requireAllowlist: boolean;
  flagUnknownDomains: boolean;
  massMentionThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export function createDefaultGuildConfig(guildId: string): GuildConfig {
  const now = new Date();
  return {
    guildId,
    enabled: true,
    mode: 'delete',
    bypassRoleIds: [],
    bypassUserIds: [],
    blockAllInvites: false,
    requireAllowlist: false,
    flagUnknownDomains: false,
    massMentionThreshold: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export interface AllowlistEntry {
  id: string;
  guildId: string;
  domain: string;
  addedBy: string;
  createdAt: Date;
}

export interface BlocklistEntry {
  id: string;
  guildId: string;
  domain: string;
  addedBy: string;
  reason?: string;
  createdAt: Date;
}

export interface InviteRule {
  id: string;
  guildId: string;
  inviteCode: string;
  addedBy: string;
  createdAt: Date;
}

/** A metadata-only record of a moderation-relevant scan. Never includes message content. */
export interface AuditLogEntry {
  id: string;
  guildId: string;
  channelId: string;
  userId: string;
  normalizedUrl?: string;
  hostname?: string;
  verdict: Verdict;
  reasons: DetectionReason[];
  score: number;
  action: ModerationActionType;
  createdAt: Date;
}

/** A persisted scan outcome, e.g. from /testlink or the CLI - not tied to a moderated message. */
export interface ScanResultRecord {
  id: string;
  guildId?: string;
  input: string;
  normalizedUrl?: string;
  verdict: Verdict;
  reasons: DetectionReason[];
  score: number;
  createdAt: Date;
}

export interface ModerationActionRecord {
  id: string;
  guildId: string;
  auditLogEntryId?: string;
  userId: string;
  channelId: string;
  actionType: ModerationActionType;
  reason: string;
  createdAt: Date;
}

export interface ListOptions {
  limit?: number;
}

export interface StorageAdapter {
  init(): Promise<void>;
  close(): Promise<void>;

  getGuildConfig(guildId: string): Promise<GuildConfig | undefined>;
  upsertGuildConfig(config: GuildConfig): Promise<void>;

  listAllowlistEntries(guildId: string): Promise<AllowlistEntry[]>;
  addAllowlistEntry(entry: AllowlistEntry): Promise<void>;
  removeAllowlistEntry(guildId: string, id: string): Promise<void>;

  listBlocklistEntries(guildId: string): Promise<BlocklistEntry[]>;
  addBlocklistEntry(entry: BlocklistEntry): Promise<void>;
  removeBlocklistEntry(guildId: string, id: string): Promise<void>;

  listInviteRules(guildId: string): Promise<InviteRule[]>;
  addInviteRule(rule: InviteRule): Promise<void>;
  removeInviteRule(guildId: string, id: string): Promise<void>;

  addAuditLogEntry(entry: AuditLogEntry): Promise<void>;
  listAuditLogEntries(guildId: string, options?: ListOptions): Promise<AuditLogEntry[]>;

  addScanResult(result: ScanResultRecord): Promise<void>;
  listScanResults(guildId: string, options?: ListOptions): Promise<ScanResultRecord[]>;

  addModerationAction(action: ModerationActionRecord): Promise<void>;
  listModerationActions(guildId: string, options?: ListOptions): Promise<ModerationActionRecord[]>;
}
