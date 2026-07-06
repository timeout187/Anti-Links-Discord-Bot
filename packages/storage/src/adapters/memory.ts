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

function sortByCreatedAtDesc<T extends { createdAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function applyLimit<T>(items: T[], options?: ListOptions): T[] {
  return options?.limit ? items.slice(0, options.limit) : items;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private guildConfigs = new Map<string, GuildConfig>();
  private allowlistEntries: AllowlistEntry[] = [];
  private blocklistEntries: BlocklistEntry[] = [];
  private inviteRules: InviteRule[] = [];
  private auditLogEntries: AuditLogEntry[] = [];
  private scanResults: ScanResultRecord[] = [];
  private moderationActions: ModerationActionRecord[] = [];

  async init(): Promise<void> {}

  async close(): Promise<void> {}

  async getGuildConfig(guildId: string): Promise<GuildConfig | undefined> {
    return this.guildConfigs.get(guildId);
  }

  async upsertGuildConfig(config: GuildConfig): Promise<void> {
    this.guildConfigs.set(config.guildId, { ...config });
  }

  async listAllowlistEntries(guildId: string): Promise<AllowlistEntry[]> {
    return this.allowlistEntries.filter((e) => e.guildId === guildId);
  }

  async addAllowlistEntry(entry: AllowlistEntry): Promise<void> {
    this.allowlistEntries.push({ ...entry });
  }

  async removeAllowlistEntry(guildId: string, id: string): Promise<void> {
    this.allowlistEntries = this.allowlistEntries.filter(
      (e) => !(e.guildId === guildId && e.id === id),
    );
  }

  async listBlocklistEntries(guildId: string): Promise<BlocklistEntry[]> {
    return this.blocklistEntries.filter((e) => e.guildId === guildId);
  }

  async addBlocklistEntry(entry: BlocklistEntry): Promise<void> {
    this.blocklistEntries.push({ ...entry });
  }

  async removeBlocklistEntry(guildId: string, id: string): Promise<void> {
    this.blocklistEntries = this.blocklistEntries.filter(
      (e) => !(e.guildId === guildId && e.id === id),
    );
  }

  async listInviteRules(guildId: string): Promise<InviteRule[]> {
    return this.inviteRules.filter((e) => e.guildId === guildId);
  }

  async addInviteRule(rule: InviteRule): Promise<void> {
    this.inviteRules.push({ ...rule });
  }

  async removeInviteRule(guildId: string, id: string): Promise<void> {
    this.inviteRules = this.inviteRules.filter((e) => !(e.guildId === guildId && e.id === id));
  }

  async addAuditLogEntry(entry: AuditLogEntry): Promise<void> {
    this.auditLogEntries.push({ ...entry });
  }

  async listAuditLogEntries(guildId: string, options?: ListOptions): Promise<AuditLogEntry[]> {
    const entries = sortByCreatedAtDesc(this.auditLogEntries.filter((e) => e.guildId === guildId));
    return applyLimit(entries, options);
  }

  async addScanResult(result: ScanResultRecord): Promise<void> {
    this.scanResults.push({ ...result });
  }

  async listScanResults(guildId: string, options?: ListOptions): Promise<ScanResultRecord[]> {
    const entries = sortByCreatedAtDesc(this.scanResults.filter((e) => e.guildId === guildId));
    return applyLimit(entries, options);
  }

  async addModerationAction(action: ModerationActionRecord): Promise<void> {
    this.moderationActions.push({ ...action });
  }

  async listModerationActions(
    guildId: string,
    options?: ListOptions,
  ): Promise<ModerationActionRecord[]> {
    const entries = sortByCreatedAtDesc(
      this.moderationActions.filter((e) => e.guildId === guildId),
    );
    return applyLimit(entries, options);
  }
}
