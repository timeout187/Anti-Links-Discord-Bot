import Database from 'better-sqlite3';
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

const SCHEMA = `
CREATE TABLE IF NOT EXISTS guild_configs (
  guild_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL,
  mode TEXT NOT NULL,
  log_channel_id TEXT,
  bypass_role_ids TEXT NOT NULL,
  bypass_user_ids TEXT NOT NULL,
  block_all_invites INTEGER NOT NULL,
  require_allowlist INTEGER NOT NULL,
  flag_unknown_domains INTEGER NOT NULL,
  mass_mention_threshold INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS allowlist_entries (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  added_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_allowlist_guild ON allowlist_entries(guild_id);

CREATE TABLE IF NOT EXISTS blocklist_entries (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  added_by TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blocklist_guild ON blocklist_entries(guild_id);

CREATE TABLE IF NOT EXISTS invite_rules (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  invite_code TEXT NOT NULL,
  added_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invite_rules_guild ON invite_rules(guild_id);

CREATE TABLE IF NOT EXISTS audit_log_entries (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  normalized_url TEXT,
  hostname TEXT,
  verdict TEXT NOT NULL,
  reasons TEXT NOT NULL,
  score INTEGER NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_guild ON audit_log_entries(guild_id, created_at DESC);

CREATE TABLE IF NOT EXISTS scan_results (
  id TEXT PRIMARY KEY,
  guild_id TEXT,
  input TEXT NOT NULL,
  normalized_url TEXT,
  verdict TEXT NOT NULL,
  reasons TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scan_results_guild ON scan_results(guild_id, created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  audit_log_entry_id TEXT,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_guild ON moderation_actions(guild_id, created_at DESC);
`;

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
    massMentionThreshold: row.mass_mention_threshold as number,
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
    score: row.score as number,
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
    score: row.score as number,
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

export interface SqliteStorageAdapterOptions {
  /** Path to the SQLite file, or ':memory:' for an ephemeral in-process database. */
  filename: string;
}

export class SqliteStorageAdapter implements StorageAdapter {
  private db: Database.Database;

  constructor(options: SqliteStorageAdapterOptions) {
    this.db = new Database(options.filename);
    this.db.pragma('journal_mode = WAL');
  }

  async init(): Promise<void> {
    this.db.exec(SCHEMA);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async getGuildConfig(guildId: string): Promise<GuildConfig | undefined> {
    const row = this.db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?').get(guildId) as
      Record<string, unknown> | undefined;
    return row ? toGuildConfig(row) : undefined;
  }

  async upsertGuildConfig(config: GuildConfig): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO guild_configs
          (guild_id, enabled, mode, log_channel_id, bypass_role_ids, bypass_user_ids,
           block_all_invites, require_allowlist, flag_unknown_domains, mass_mention_threshold,
           created_at, updated_at)
         VALUES (@guildId, @enabled, @mode, @logChannelId, @bypassRoleIds, @bypassUserIds,
           @blockAllInvites, @requireAllowlist, @flagUnknownDomains, @massMentionThreshold,
           @createdAt, @updatedAt)
         ON CONFLICT(guild_id) DO UPDATE SET
           enabled = excluded.enabled,
           mode = excluded.mode,
           log_channel_id = excluded.log_channel_id,
           bypass_role_ids = excluded.bypass_role_ids,
           bypass_user_ids = excluded.bypass_user_ids,
           block_all_invites = excluded.block_all_invites,
           require_allowlist = excluded.require_allowlist,
           flag_unknown_domains = excluded.flag_unknown_domains,
           mass_mention_threshold = excluded.mass_mention_threshold,
           updated_at = excluded.updated_at`,
      )
      .run({
        guildId: config.guildId,
        enabled: config.enabled ? 1 : 0,
        mode: config.mode,
        logChannelId: config.logChannelId ?? null,
        bypassRoleIds: JSON.stringify(config.bypassRoleIds),
        bypassUserIds: JSON.stringify(config.bypassUserIds),
        blockAllInvites: config.blockAllInvites ? 1 : 0,
        requireAllowlist: config.requireAllowlist ? 1 : 0,
        flagUnknownDomains: config.flagUnknownDomains ? 1 : 0,
        massMentionThreshold: config.massMentionThreshold,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      });
  }

  async listAllowlistEntries(guildId: string): Promise<AllowlistEntry[]> {
    const rows = this.db
      .prepare('SELECT * FROM allowlist_entries WHERE guild_id = ? ORDER BY created_at DESC')
      .all(guildId) as Record<string, unknown>[];
    return rows.map(toAllowlistEntry);
  }

  async addAllowlistEntry(entry: AllowlistEntry): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO allowlist_entries (id, guild_id, domain, added_by, created_at)
         VALUES (@id, @guildId, @domain, @addedBy, @createdAt)`,
      )
      .run({ ...entry, createdAt: entry.createdAt.toISOString() });
  }

  async removeAllowlistEntry(guildId: string, id: string): Promise<void> {
    this.db.prepare('DELETE FROM allowlist_entries WHERE guild_id = ? AND id = ?').run(guildId, id);
  }

  async listBlocklistEntries(guildId: string): Promise<BlocklistEntry[]> {
    const rows = this.db
      .prepare('SELECT * FROM blocklist_entries WHERE guild_id = ? ORDER BY created_at DESC')
      .all(guildId) as Record<string, unknown>[];
    return rows.map(toBlocklistEntry);
  }

  async addBlocklistEntry(entry: BlocklistEntry): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO blocklist_entries (id, guild_id, domain, added_by, reason, created_at)
         VALUES (@id, @guildId, @domain, @addedBy, @reason, @createdAt)`,
      )
      .run({ ...entry, reason: entry.reason ?? null, createdAt: entry.createdAt.toISOString() });
  }

  async removeBlocklistEntry(guildId: string, id: string): Promise<void> {
    this.db.prepare('DELETE FROM blocklist_entries WHERE guild_id = ? AND id = ?').run(guildId, id);
  }

  async listInviteRules(guildId: string): Promise<InviteRule[]> {
    const rows = this.db
      .prepare('SELECT * FROM invite_rules WHERE guild_id = ? ORDER BY created_at DESC')
      .all(guildId) as Record<string, unknown>[];
    return rows.map(toInviteRule);
  }

  async addInviteRule(rule: InviteRule): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO invite_rules (id, guild_id, invite_code, added_by, created_at)
         VALUES (@id, @guildId, @inviteCode, @addedBy, @createdAt)`,
      )
      .run({ ...rule, createdAt: rule.createdAt.toISOString() });
  }

  async removeInviteRule(guildId: string, id: string): Promise<void> {
    this.db.prepare('DELETE FROM invite_rules WHERE guild_id = ? AND id = ?').run(guildId, id);
  }

  async addAuditLogEntry(entry: AuditLogEntry): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO audit_log_entries
          (id, guild_id, channel_id, user_id, normalized_url, hostname, verdict, reasons, score, action, created_at)
         VALUES (@id, @guildId, @channelId, @userId, @normalizedUrl, @hostname, @verdict, @reasons, @score, @action, @createdAt)`,
      )
      .run({
        ...entry,
        normalizedUrl: entry.normalizedUrl ?? null,
        hostname: entry.hostname ?? null,
        reasons: JSON.stringify(entry.reasons),
        createdAt: entry.createdAt.toISOString(),
      });
  }

  async listAuditLogEntries(guildId: string, options?: ListOptions): Promise<AuditLogEntry[]> {
    const limit = options?.limit ?? 1000;
    const rows = this.db
      .prepare(
        'SELECT * FROM audit_log_entries WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?',
      )
      .all(guildId, limit) as Record<string, unknown>[];
    return rows.map(toAuditLogEntry);
  }

  async addScanResult(result: ScanResultRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO scan_results (id, guild_id, input, normalized_url, verdict, reasons, score, created_at)
         VALUES (@id, @guildId, @input, @normalizedUrl, @verdict, @reasons, @score, @createdAt)`,
      )
      .run({
        ...result,
        guildId: result.guildId ?? null,
        normalizedUrl: result.normalizedUrl ?? null,
        reasons: JSON.stringify(result.reasons),
        createdAt: result.createdAt.toISOString(),
      });
  }

  async listScanResults(guildId: string, options?: ListOptions): Promise<ScanResultRecord[]> {
    const limit = options?.limit ?? 1000;
    const rows = this.db
      .prepare('SELECT * FROM scan_results WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(guildId, limit) as Record<string, unknown>[];
    return rows.map(toScanResultRecord);
  }

  async addModerationAction(action: ModerationActionRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO moderation_actions
          (id, guild_id, audit_log_entry_id, user_id, channel_id, action_type, reason, created_at)
         VALUES (@id, @guildId, @auditLogEntryId, @userId, @channelId, @actionType, @reason, @createdAt)`,
      )
      .run({
        ...action,
        auditLogEntryId: action.auditLogEntryId ?? null,
        createdAt: action.createdAt.toISOString(),
      });
  }

  async listModerationActions(
    guildId: string,
    options?: ListOptions,
  ): Promise<ModerationActionRecord[]> {
    const limit = options?.limit ?? 1000;
    const rows = this.db
      .prepare(
        'SELECT * FROM moderation_actions WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?',
      )
      .all(guildId, limit) as Record<string, unknown>[];
    return rows.map(toModerationActionRecord);
  }
}
