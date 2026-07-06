import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type {
  AllowlistEntry,
  AuditLogEntry,
  BlocklistEntry,
  InviteRule,
  ModerationActionRecord,
  ScanResultRecord,
  StorageAdapter,
} from '../src/types.js';
import { createDefaultGuildConfig } from '../src/types.js';

/**
 * A shared behavioral contract every StorageAdapter implementation must satisfy.
 * Run this against each adapter so memory/SQLite/MySQL/Postgres stay interchangeable.
 */
export function runStorageAdapterContractTests(
  adapterName: string,
  createAdapter: () => Promise<StorageAdapter>,
): void {
  describe(`StorageAdapter contract: ${adapterName}`, () => {
    async function withAdapter(fn: (adapter: StorageAdapter) => Promise<void>): Promise<void> {
      const adapter = await createAdapter();
      await adapter.init();
      try {
        await fn(adapter);
      } finally {
        await adapter.close();
      }
    }

    it('returns undefined for a guild with no stored config', async () => {
      await withAdapter(async (adapter) => {
        const config = await adapter.getGuildConfig(`guild-${randomUUID()}`);
        expect(config).toBeUndefined();
      });
    });

    it('round-trips a guild config through upsert and get', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        const config = {
          ...createDefaultGuildConfig(guildId),
          logChannelId: 'channel-123',
          bypassRoleIds: ['role-1', 'role-2'],
          mode: 'timeout' as const,
        };

        await adapter.upsertGuildConfig(config);
        const fetched = await adapter.getGuildConfig(guildId);

        expect(fetched?.guildId).toBe(guildId);
        expect(fetched?.logChannelId).toBe('channel-123');
        expect(fetched?.bypassRoleIds).toEqual(['role-1', 'role-2']);
        expect(fetched?.mode).toBe('timeout');
      });
    });

    it('updates an existing guild config on a second upsert rather than duplicating it', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        const config = createDefaultGuildConfig(guildId);

        await adapter.upsertGuildConfig(config);
        await adapter.upsertGuildConfig({ ...config, enabled: false, mode: 'log' });

        const fetched = await adapter.getGuildConfig(guildId);
        expect(fetched?.enabled).toBe(false);
        expect(fetched?.mode).toBe('log');
      });
    });

    it('adds and lists allowlist entries scoped to a guild', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        const otherGuildId = `guild-${randomUUID()}`;
        const entry: AllowlistEntry = {
          id: randomUUID(),
          guildId,
          domain: 'example.com',
          addedBy: 'user-1',
          createdAt: new Date(),
        };

        await adapter.addAllowlistEntry(entry);
        await adapter.addAllowlistEntry({ ...entry, id: randomUUID(), guildId: otherGuildId });

        const entries = await adapter.listAllowlistEntries(guildId);
        expect(entries).toHaveLength(1);
        expect(entries[0]?.domain).toBe('example.com');
      });
    });

    it('removes an allowlist entry by id', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        const entry: AllowlistEntry = {
          id: randomUUID(),
          guildId,
          domain: 'example.com',
          addedBy: 'user-1',
          createdAt: new Date(),
        };
        await adapter.addAllowlistEntry(entry);
        await adapter.removeAllowlistEntry(guildId, entry.id);
        expect(await adapter.listAllowlistEntries(guildId)).toHaveLength(0);
      });
    });

    it('adds and lists blocklist entries with an optional reason', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        const entry: BlocklistEntry = {
          id: randomUUID(),
          guildId,
          domain: 'bad-site.com',
          addedBy: 'user-1',
          reason: 'reported phishing',
          createdAt: new Date(),
        };
        await adapter.addBlocklistEntry(entry);
        const entries = await adapter.listBlocklistEntries(guildId);
        expect(entries[0]?.reason).toBe('reported phishing');
      });
    });

    it('removes a blocklist entry by id', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        const entry: BlocklistEntry = {
          id: randomUUID(),
          guildId,
          domain: 'bad-site.com',
          addedBy: 'user-1',
          createdAt: new Date(),
        };
        await adapter.addBlocklistEntry(entry);
        await adapter.removeBlocklistEntry(guildId, entry.id);
        expect(await adapter.listBlocklistEntries(guildId)).toHaveLength(0);
      });
    });

    it('adds, lists, and removes invite rules', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        const rule: InviteRule = {
          id: randomUUID(),
          guildId,
          inviteCode: 'abc123',
          addedBy: 'user-1',
          createdAt: new Date(),
        };
        await adapter.addInviteRule(rule);
        expect(await adapter.listInviteRules(guildId)).toHaveLength(1);

        await adapter.removeInviteRule(guildId, rule.id);
        expect(await adapter.listInviteRules(guildId)).toHaveLength(0);
      });
    });

    it('stores and lists audit log entries newest-first, without message content', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        const older: AuditLogEntry = {
          id: randomUUID(),
          guildId,
          channelId: 'channel-1',
          userId: 'user-1',
          normalizedUrl: 'https://bad-site.com',
          hostname: 'bad-site.com',
          verdict: 'BLOCK',
          reasons: ['BLOCKLIST_MATCH'],
          score: 50,
          action: 'DELETE',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        };
        const newer: AuditLogEntry = {
          ...older,
          id: randomUUID(),
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
        };

        await adapter.addAuditLogEntry(older);
        await adapter.addAuditLogEntry(newer);

        const entries = await adapter.listAuditLogEntries(guildId);
        expect(entries).toHaveLength(2);
        expect(entries[0]?.id).toBe(newer.id);
        expect(entries.every((e) => !('content' in e))).toBe(true);
      });
    });

    it('respects the limit option when listing audit log entries', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        for (let i = 0; i < 5; i++) {
          await adapter.addAuditLogEntry({
            id: randomUUID(),
            guildId,
            channelId: 'channel-1',
            userId: 'user-1',
            verdict: 'WARN',
            reasons: ['UNKNOWN_DOMAIN'],
            score: 5,
            action: 'LOG',
            createdAt: new Date(),
          });
        }
        const entries = await adapter.listAuditLogEntries(guildId, { limit: 2 });
        expect(entries).toHaveLength(2);
      });
    });

    it('stores and lists scan results, including guild-less CLI scans', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        const record: ScanResultRecord = {
          id: randomUUID(),
          guildId,
          input: 'https://example.com',
          normalizedUrl: 'https://example.com',
          verdict: 'ALLOW',
          reasons: [],
          score: 0,
          createdAt: new Date(),
        };
        await adapter.addScanResult(record);
        const results = await adapter.listScanResults(guildId);
        expect(results).toHaveLength(1);
        expect(results[0]?.verdict).toBe('ALLOW');
      });
    });

    it('stores and lists moderation actions', async () => {
      await withAdapter(async (adapter) => {
        const guildId = `guild-${randomUUID()}`;
        const action: ModerationActionRecord = {
          id: randomUUID(),
          guildId,
          userId: 'user-1',
          channelId: 'channel-1',
          actionType: 'DELETE',
          reason: 'blocklisted domain',
          createdAt: new Date(),
        };
        await adapter.addModerationAction(action);
        const actions = await adapter.listModerationActions(guildId);
        expect(actions).toHaveLength(1);
        expect(actions[0]?.actionType).toBe('DELETE');
      });
    });
  });
}
