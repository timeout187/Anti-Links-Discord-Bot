import mysql from 'mysql2/promise';
import type {
  AllowlistEntry,
  AuditLogEntry,
  BlocklistEntry,
  GuildConfig,
  InviteRule,
  ListOptions,
  ModerationActionRecord,
  ScanResultRecord,
  StorageAdapter,
} from '../types.js';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id VARCHAR(64) PRIMARY KEY,
    enabled TINYINT(1) NOT NULL,
    mode VARCHAR(16) NOT NULL,
    log_channel_id VARCHAR(64),
    bypass_role_ids TEXT NOT NULL,
    bypass_user_ids TEXT NOT NULL,
    block_all_invites TINYINT(1) NOT NULL,
    require_allowlist TINYINT(1) NOT NULL,
    flag_unknown_domains TINYINT(1) NOT NULL,
    mass_mention_threshold INT NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS allowlist_entries (
    id VARCHAR(64) PRIMARY KEY,
    guild_id VARCHAR(64) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    added_by VARCHAR(64) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_allowlist_guild (guild_id)
  )`,
  `CREATE TABLE IF NOT EXISTS blocklist_entries (
    id VARCHAR(64) PRIMARY KEY,
    guild_id VARCHAR(64) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    added_by VARCHAR(64) NOT NULL,
    reason VARCHAR(500),
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_blocklist_guild (guild_id)
  )`,
  `CREATE TABLE IF NOT EXISTS invite_rules (
    id VARCHAR(64) PRIMARY KEY,
    guild_id VARCHAR(64) NOT NULL,
    invite_code VARCHAR(64) NOT NULL,
    added_by VARCHAR(64) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_invite_rules_guild (guild_id)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log_entries (
    id VARCHAR(64) PRIMARY KEY,
    guild_id VARCHAR(64) NOT NULL,
    channel_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    normalized_url TEXT,
    hostname VARCHAR(255),
    verdict VARCHAR(16) NOT NULL,
    reasons TEXT NOT NULL,
    score INT NOT NULL,
    action VARCHAR(16) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_audit_log_guild (guild_id, created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS scan_results (
    id VARCHAR(64) PRIMARY KEY,
    guild_id VARCHAR(64),
    input TEXT NOT NULL,
    normalized_url TEXT,
    verdict VARCHAR(16) NOT NULL,
    reasons TEXT NOT NULL,
    score INT NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_scan_results_guild (guild_id, created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS moderation_actions (
    id VARCHAR(64) PRIMARY KEY,
    guild_id VARCHAR(64) NOT NULL,
    audit_log_entry_id VARCHAR(64),
    user_id VARCHAR(64) NOT NULL,
    channel_id VARCHAR(64) NOT NULL,
    action_type VARCHAR(16) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_moderation_actions_guild (guild_id, created_at)
  )`,
];

function toGuildConfig(row: Record<string, unknown>): GuildConfig {
  return {
    guildId: row.guild_id as string,
    enabled: Boolean(row.enabled),
    mode: row.mode as GuildConfig['mode'],
    logChannelId: (row.log_channel_id as string | null) ?? undefined,
    bypassRoleIds: JSON.parse(row.bypass_role_ids as string) as string[],
    bypassUserIds: JSON.parse(row.bypass_user_ids as string) as string[],
    blockAllInvites: Boolean(row.block_all_invites),
    requireAllowlist: Boolean(row.require_allowlist),
    flagUnknownDomains: Boolean(row.flag_unknown_domains),
    massMentionThreshold: Number(row.mass_mention_threshold),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function toAllowlistEntry(row: Record<string, unknown>): AllowlistEntry {
  return {
    id: row.id as string,
    guildId: row.guild_id as string,
    domain: row.domain as string,
    addedBy: row.added_by as string,
    createdAt: new Date(row.created_at as string),
  };
}

function toBlocklistEntry(row: Record<string, unknown>): BlocklistEntry {
  return {
    id: row.id as string,
    guildId: row.guild_id as string,
    domain: row.domain as string,
    addedBy: row.added_by as string,
    reason: (row.reason as string | null) ?? undefined,
    createdAt: new Date(row.created_at as string),
  };
}

function toInviteRule(row: Record<string, unknown>): InviteRule {
  return {
    id: row.id as string,
    guildId: row.guild_id as string,
    inviteCode: row.invite_code as string,
    addedBy: row.added_by as string,
    createdAt: new Date(row.created_at as string),
  };
}

function toAuditLogEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    guildId: row.guild_id as string,
    channelId: row.channel_id as string,
    userId: row.user_id as string,
    normalizedUrl: (row.normalized_url as string | null) ?? undefined,
    hostname: (row.hostname as string | null) ?? undefined,
    verdict: row.verdict as AuditLogEntry['verdict'],
    reasons: JSON.parse(row.reasons as string) as AuditLogEntry['reasons'],
    score: Number(row.score),
    action: row.action as AuditLogEntry['action'],
    createdAt: new Date(row.created_at as string),
  };
}

function toScanResultRecord(row: Record<string, unknown>): ScanResultRecord {
  return {
    id: row.id as string,
    guildId: (row.guild_id as string | null) ?? undefined,
    input: row.input as string,
    normalizedUrl: (row.normalized_url as string | null) ?? undefined,
    verdict: row.verdict as ScanResultRecord['verdict'],
    reasons: JSON.parse(row.reasons as string) as ScanResultRecord['reasons'],
    score: Number(row.score),
    createdAt: new Date(row.created_at as string),
  };
}

function toModerationActionRecord(row: Record<string, unknown>): ModerationActionRecord {
  return {
    id: row.id as string,
    guildId: row.guild_id as string,
    auditLogEntryId: (row.audit_log_entry_id as string | null) ?? undefined,
    userId: row.user_id as string,
    channelId: row.channel_id as string,
    actionType: row.action_type as ModerationActionRecord['actionType'],
    reason: row.reason as string,
    createdAt: new Date(row.created_at as string),
  };
}

export interface MysqlStorageAdapterOptions {
  uri: string;
}

export class MysqlStorageAdapter implements StorageAdapter {
  private pool: mysql.Pool;

  constructor(options: MysqlStorageAdapterOptions) {
    this.pool = mysql.createPool(options.uri);
  }

  async init(): Promise<void> {
    for (const statement of SCHEMA_STATEMENTS) {
      await this.pool.query(statement);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getGuildConfig(guildId: string): Promise<GuildConfig | undefined> {
    const [rows] = await this.pool.query('SELECT * FROM guild_configs WHERE guild_id = ?', [
      guildId,
    ]);
    const row = (rows as Record<string, unknown>[])[0];
    return row ? toGuildConfig(row) : undefined;
  }

  async upsertGuildConfig(config: GuildConfig): Promise<void> {
    await this.pool.query(
      `INSERT INTO guild_configs
        (guild_id, enabled, mode, log_channel_id, bypass_role_ids, bypass_user_ids,
         block_all_invites, require_allowlist, flag_unknown_domains, mass_mention_threshold,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         enabled = VALUES(enabled),
         mode = VALUES(mode),
         log_channel_id = VALUES(log_channel_id),
         bypass_role_ids = VALUES(bypass_role_ids),
         bypass_user_ids = VALUES(bypass_user_ids),
         block_all_invites = VALUES(block_all_invites),
         require_allowlist = VALUES(require_allowlist),
         flag_unknown_domains = VALUES(flag_unknown_domains),
         mass_mention_threshold = VALUES(mass_mention_threshold),
         updated_at = VALUES(updated_at)`,
      [
        config.guildId,
        config.enabled ? 1 : 0,
        config.mode,
        config.logChannelId ?? null,
        JSON.stringify(config.bypassRoleIds),
        JSON.stringify(config.bypassUserIds),
        config.blockAllInvites ? 1 : 0,
        config.requireAllowlist ? 1 : 0,
        config.flagUnknownDomains ? 1 : 0,
        config.massMentionThreshold,
        config.createdAt.toISOString(),
        config.updatedAt.toISOString(),
      ],
    );
  }

  async listAllowlistEntries(guildId: string): Promise<AllowlistEntry[]> {
    const [rows] = await this.pool.query(
      'SELECT * FROM allowlist_entries WHERE guild_id = ? ORDER BY created_at DESC',
      [guildId],
    );
    return (rows as Record<string, unknown>[]).map(toAllowlistEntry);
  }

  async addAllowlistEntry(entry: AllowlistEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO allowlist_entries (id, guild_id, domain, added_by, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [entry.id, entry.guildId, entry.domain, entry.addedBy, entry.createdAt.toISOString()],
    );
  }

  async removeAllowlistEntry(guildId: string, id: string): Promise<void> {
    await this.pool.query('DELETE FROM allowlist_entries WHERE guild_id = ? AND id = ?', [
      guildId,
      id,
    ]);
  }

  async listBlocklistEntries(guildId: string): Promise<BlocklistEntry[]> {
    const [rows] = await this.pool.query(
      'SELECT * FROM blocklist_entries WHERE guild_id = ? ORDER BY created_at DESC',
      [guildId],
    );
    return (rows as Record<string, unknown>[]).map(toBlocklistEntry);
  }

  async addBlocklistEntry(entry: BlocklistEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO blocklist_entries (id, guild_id, domain, added_by, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.guildId,
        entry.domain,
        entry.addedBy,
        entry.reason ?? null,
        entry.createdAt.toISOString(),
      ],
    );
  }

  async removeBlocklistEntry(guildId: string, id: string): Promise<void> {
    await this.pool.query('DELETE FROM blocklist_entries WHERE guild_id = ? AND id = ?', [
      guildId,
      id,
    ]);
  }

  async listInviteRules(guildId: string): Promise<InviteRule[]> {
    const [rows] = await this.pool.query(
      'SELECT * FROM invite_rules WHERE guild_id = ? ORDER BY created_at DESC',
      [guildId],
    );
    return (rows as Record<string, unknown>[]).map(toInviteRule);
  }

  async addInviteRule(rule: InviteRule): Promise<void> {
    await this.pool.query(
      `INSERT INTO invite_rules (id, guild_id, invite_code, added_by, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [rule.id, rule.guildId, rule.inviteCode, rule.addedBy, rule.createdAt.toISOString()],
    );
  }

  async removeInviteRule(guildId: string, id: string): Promise<void> {
    await this.pool.query('DELETE FROM invite_rules WHERE guild_id = ? AND id = ?', [guildId, id]);
  }

  async addAuditLogEntry(entry: AuditLogEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log_entries
        (id, guild_id, channel_id, user_id, normalized_url, hostname, verdict, reasons, score, action, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.guildId,
        entry.channelId,
        entry.userId,
        entry.normalizedUrl ?? null,
        entry.hostname ?? null,
        entry.verdict,
        JSON.stringify(entry.reasons),
        entry.score,
        entry.action,
        entry.createdAt.toISOString(),
      ],
    );
  }

  async listAuditLogEntries(guildId: string, options?: ListOptions): Promise<AuditLogEntry[]> {
    const limit = options?.limit ?? 1000;
    const [rows] = await this.pool.query(
      'SELECT * FROM audit_log_entries WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?',
      [guildId, limit],
    );
    return (rows as Record<string, unknown>[]).map(toAuditLogEntry);
  }

  async addScanResult(result: ScanResultRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO scan_results (id, guild_id, input, normalized_url, verdict, reasons, score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.id,
        result.guildId ?? null,
        result.input,
        result.normalizedUrl ?? null,
        result.verdict,
        JSON.stringify(result.reasons),
        result.score,
        result.createdAt.toISOString(),
      ],
    );
  }

  async listScanResults(guildId: string, options?: ListOptions): Promise<ScanResultRecord[]> {
    const limit = options?.limit ?? 1000;
    const [rows] = await this.pool.query(
      'SELECT * FROM scan_results WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?',
      [guildId, limit],
    );
    return (rows as Record<string, unknown>[]).map(toScanResultRecord);
  }

  async addModerationAction(action: ModerationActionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO moderation_actions
        (id, guild_id, audit_log_entry_id, user_id, channel_id, action_type, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        action.id,
        action.guildId,
        action.auditLogEntryId ?? null,
        action.userId,
        action.channelId,
        action.actionType,
        action.reason,
        action.createdAt.toISOString(),
      ],
    );
  }

  async listModerationActions(
    guildId: string,
    options?: ListOptions,
  ): Promise<ModerationActionRecord[]> {
    const limit = options?.limit ?? 1000;
    const [rows] = await this.pool.query(
      'SELECT * FROM moderation_actions WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?',
      [guildId, limit],
    );
    return (rows as Record<string, unknown>[]).map(toModerationActionRecord);
  }
}
