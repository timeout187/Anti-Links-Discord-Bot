import pg from 'pg';
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

const { Pool } = pg;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS guild_configs (
  guild_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL,
  mode TEXT NOT NULL,
  log_channel_id TEXT,
  bypass_role_ids TEXT NOT NULL,
  bypass_user_ids TEXT NOT NULL,
  block_all_invites BOOLEAN NOT NULL,
  require_allowlist BOOLEAN NOT NULL,
  flag_unknown_domains BOOLEAN NOT NULL,
  mass_mention_threshold INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS allowlist_entries (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  added_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_allowlist_guild ON allowlist_entries(guild_id);

CREATE TABLE IF NOT EXISTS blocklist_entries (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  added_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_blocklist_guild ON blocklist_entries(guild_id);

CREATE TABLE IF NOT EXISTS invite_rules (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  invite_code TEXT NOT NULL,
  added_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
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
  created_at TIMESTAMPTZ NOT NULL
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
  created_at TIMESTAMPTZ NOT NULL
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
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_guild ON moderation_actions(guild_id, created_at DESC);
`;

function toGuildConfig(row: Record<string, unknown>): GuildConfig {
  return {
    guildId: row.guild_id as string,
    enabled: row.enabled as boolean,
    mode: row.mode as GuildConfig['mode'],
    logChannelId: (row.log_channel_id as string | null) ?? undefined,
    bypassRoleIds: JSON.parse(row.bypass_role_ids as string) as string[],
    bypassUserIds: JSON.parse(row.bypass_user_ids as string) as string[],
    blockAllInvites: row.block_all_invites as boolean,
    requireAllowlist: row.require_allowlist as boolean,
    flagUnknownDomains: row.flag_unknown_domains as boolean,
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

export interface PostgresStorageAdapterOptions {
  connectionString: string;
}

export class PostgresStorageAdapter implements StorageAdapter {
  private pool: pg.Pool;

  constructor(options: PostgresStorageAdapterOptions) {
    this.pool = new Pool({ connectionString: options.connectionString });
  }

  async init(): Promise<void> {
    await this.pool.query(SCHEMA);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async getGuildConfig(guildId: string): Promise<GuildConfig | undefined> {
    const result = await this.pool.query('SELECT * FROM guild_configs WHERE guild_id = $1', [
      guildId,
    ]);
    return result.rows[0] ? toGuildConfig(result.rows[0]) : undefined;
  }

  async upsertGuildConfig(config: GuildConfig): Promise<void> {
    await this.pool.query(
      `INSERT INTO guild_configs
        (guild_id, enabled, mode, log_channel_id, bypass_role_ids, bypass_user_ids,
         block_all_invites, require_allowlist, flag_unknown_domains, mass_mention_threshold,
         created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (guild_id) DO UPDATE SET
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
      [
        config.guildId,
        config.enabled,
        config.mode,
        config.logChannelId ?? null,
        JSON.stringify(config.bypassRoleIds),
        JSON.stringify(config.bypassUserIds),
        config.blockAllInvites,
        config.requireAllowlist,
        config.flagUnknownDomains,
        config.massMentionThreshold,
        config.createdAt.toISOString(),
        config.updatedAt.toISOString(),
      ],
    );
  }

  async listAllowlistEntries(guildId: string): Promise<AllowlistEntry[]> {
    const result = await this.pool.query(
      'SELECT * FROM allowlist_entries WHERE guild_id = $1 ORDER BY created_at DESC',
      [guildId],
    );
    return result.rows.map(toAllowlistEntry);
  }

  async addAllowlistEntry(entry: AllowlistEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO allowlist_entries (id, guild_id, domain, added_by, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [entry.id, entry.guildId, entry.domain, entry.addedBy, entry.createdAt.toISOString()],
    );
  }

  async removeAllowlistEntry(guildId: string, id: string): Promise<void> {
    await this.pool.query('DELETE FROM allowlist_entries WHERE guild_id = $1 AND id = $2', [
      guildId,
      id,
    ]);
  }

  async listBlocklistEntries(guildId: string): Promise<BlocklistEntry[]> {
    const result = await this.pool.query(
      'SELECT * FROM blocklist_entries WHERE guild_id = $1 ORDER BY created_at DESC',
      [guildId],
    );
    return result.rows.map(toBlocklistEntry);
  }

  async addBlocklistEntry(entry: BlocklistEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO blocklist_entries (id, guild_id, domain, added_by, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
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
    await this.pool.query('DELETE FROM blocklist_entries WHERE guild_id = $1 AND id = $2', [
      guildId,
      id,
    ]);
  }

  async listInviteRules(guildId: string): Promise<InviteRule[]> {
    const result = await this.pool.query(
      'SELECT * FROM invite_rules WHERE guild_id = $1 ORDER BY created_at DESC',
      [guildId],
    );
    return result.rows.map(toInviteRule);
  }

  async addInviteRule(rule: InviteRule): Promise<void> {
    await this.pool.query(
      `INSERT INTO invite_rules (id, guild_id, invite_code, added_by, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [rule.id, rule.guildId, rule.inviteCode, rule.addedBy, rule.createdAt.toISOString()],
    );
  }

  async removeInviteRule(guildId: string, id: string): Promise<void> {
    await this.pool.query('DELETE FROM invite_rules WHERE guild_id = $1 AND id = $2', [
      guildId,
      id,
    ]);
  }

  async addAuditLogEntry(entry: AuditLogEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_log_entries
        (id, guild_id, channel_id, user_id, normalized_url, hostname, verdict, reasons, score, action, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
    const result = await this.pool.query(
      'SELECT * FROM audit_log_entries WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
      [guildId, limit],
    );
    return result.rows.map(toAuditLogEntry);
  }

  async addScanResult(scanResult: ScanResultRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO scan_results (id, guild_id, input, normalized_url, verdict, reasons, score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        scanResult.id,
        scanResult.guildId ?? null,
        scanResult.input,
        scanResult.normalizedUrl ?? null,
        scanResult.verdict,
        JSON.stringify(scanResult.reasons),
        scanResult.score,
        scanResult.createdAt.toISOString(),
      ],
    );
  }

  async listScanResults(guildId: string, options?: ListOptions): Promise<ScanResultRecord[]> {
    const limit = options?.limit ?? 1000;
    const result = await this.pool.query(
      'SELECT * FROM scan_results WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
      [guildId, limit],
    );
    return result.rows.map(toScanResultRecord);
  }

  async addModerationAction(action: ModerationActionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO moderation_actions
        (id, guild_id, audit_log_entry_id, user_id, channel_id, action_type, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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
    const result = await this.pool.query(
      'SELECT * FROM moderation_actions WHERE guild_id = $1 ORDER BY created_at DESC LIMIT $2',
      [guildId, limit],
    );
    return result.rows.map(toModerationActionRecord);
  }
}
