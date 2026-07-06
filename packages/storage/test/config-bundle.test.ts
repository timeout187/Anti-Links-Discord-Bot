import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { MemoryStorageAdapter } from '../src/adapters/memory.js';
import { createDefaultGuildConfig } from '../src/types.js';
import {
  configBundleSchema,
  exportGuildConfigBundle,
  importGuildConfigBundle,
  parseConfigBundle,
} from '../src/config-bundle.js';

describe('config bundle export/import', () => {
  it('exports the default config for a guild with no stored data', async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.init();
    const guildId = `guild-${randomUUID()}`;

    const bundle = await exportGuildConfigBundle(adapter, guildId);

    expect(bundle.version).toBe(1);
    expect(bundle.guildConfig.guildId).toBe(guildId);
    expect(bundle.allowlist).toHaveLength(0);
    expect(bundle.blocklist).toHaveLength(0);
    expect(bundle.inviteRules).toHaveLength(0);
  });

  it('round-trips a full bundle through export, JSON serialization, and import into a fresh adapter', async () => {
    const source = new MemoryStorageAdapter();
    await source.init();
    const guildId = `guild-${randomUUID()}`;

    await source.upsertGuildConfig({
      ...createDefaultGuildConfig(guildId),
      mode: 'timeout',
      logChannelId: 'channel-log',
    });
    await source.addAllowlistEntry({
      id: randomUUID(),
      guildId,
      domain: 'example.com',
      addedBy: 'user-1',
      createdAt: new Date(),
    });
    await source.addBlocklistEntry({
      id: randomUUID(),
      guildId,
      domain: 'bad-site.com',
      addedBy: 'user-1',
      reason: 'phishing report',
      createdAt: new Date(),
    });
    await source.addInviteRule({
      id: randomUUID(),
      guildId,
      inviteCode: 'abc123',
      addedBy: 'user-1',
      createdAt: new Date(),
    });

    const exported = await exportGuildConfigBundle(source, guildId);

    // Simulate writing to a file and reading it back.
    const roundTripped = parseConfigBundle(JSON.parse(JSON.stringify(exported)));

    const destination = new MemoryStorageAdapter();
    await destination.init();
    await importGuildConfigBundle(destination, roundTripped);

    const reExported = await exportGuildConfigBundle(destination, guildId);
    expect(reExported.guildConfig.mode).toBe('timeout');
    expect(reExported.guildConfig.logChannelId).toBe('channel-log');
    expect(reExported.allowlist).toHaveLength(1);
    expect(reExported.allowlist[0]?.domain).toBe('example.com');
    expect(reExported.blocklist[0]?.reason).toBe('phishing report');
    expect(reExported.inviteRules[0]?.inviteCode).toBe('abc123');
  });

  it('replaces existing entries on import by default rather than duplicating them', async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.init();
    const guildId = `guild-${randomUUID()}`;

    await adapter.addAllowlistEntry({
      id: randomUUID(),
      guildId,
      domain: 'old-domain.com',
      addedBy: 'user-1',
      createdAt: new Date(),
    });

    const bundle = {
      version: 1 as const,
      guildConfig: createDefaultGuildConfig(guildId),
      allowlist: [
        {
          id: randomUUID(),
          guildId,
          domain: 'new-domain.com',
          addedBy: 'user-1',
          createdAt: new Date(),
        },
      ],
      blocklist: [],
      inviteRules: [],
    };

    await importGuildConfigBundle(adapter, bundle);

    const entries = await adapter.listAllowlistEntries(guildId);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.domain).toBe('new-domain.com');
  });

  it('rejects a malformed bundle via schema validation', () => {
    expect(() => parseConfigBundle({ version: 1, guildConfig: {} })).toThrow();
  });

  it('rejects an unsupported bundle version', () => {
    const validShape = {
      version: 2,
      guildConfig: createDefaultGuildConfig('guild-1'),
      allowlist: [],
      blocklist: [],
      inviteRules: [],
    };
    expect(() => configBundleSchema.parse(validShape)).toThrow();
  });
});
