import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { MemoryStorageAdapter, createDefaultGuildConfig } from '@antilink-guard/storage';
import { createDashboardServer } from '../src/server.js';

describe('dashboard-lite server', () => {
  let storage: MemoryStorageAdapter;
  let server: ReturnType<typeof createDashboardServer>;
  let baseUrl: string;

  beforeEach(async () => {
    storage = new MemoryStorageAdapter();
    await storage.init();
    server = createDashboardServer(storage);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('serves the dashboard HTML at /', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('dashboard-lite');
  });

  it('returns 404 for an unknown route', async () => {
    const res = await fetch(`${baseUrl}/not-a-real-route`);
    expect(res.status).toBe(404);
  });

  it('returns default guild config and zeroed counts for a fresh guild', async () => {
    const res = await fetch(`${baseUrl}/api/guild/guild-1/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.guildConfig.guildId).toBe('guild-1');
    expect(body.counts).toEqual({ allowlist: 0, blocklist: 0, inviteRules: 0 });
    expect(body.lastAuditAt).toBeNull();
  });

  it('reflects a stored guild config in /status and /config', async () => {
    await storage.upsertGuildConfig({
      ...createDefaultGuildConfig('guild-1'),
      mode: 'timeout',
      logChannelId: 'channel-99',
    });

    const status = await (await fetch(`${baseUrl}/api/guild/guild-1/status`)).json();
    expect(status.guildConfig.mode).toBe('timeout');
    expect(status.guildConfig.logChannelId).toBe('channel-99');

    const config = await (await fetch(`${baseUrl}/api/guild/guild-1/config`)).json();
    expect(config.mode).toBe('timeout');
  });

  it('lists allowlist entries for a guild', async () => {
    await storage.addAllowlistEntry({
      id: '1',
      guildId: 'guild-1',
      domain: 'example.com',
      addedBy: 'user-1',
      createdAt: new Date(),
    });

    const res = await fetch(`${baseUrl}/api/guild/guild-1/allowlist`);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].domain).toBe('example.com');
  });

  it('lists blocklist entries with their reason for a guild', async () => {
    await storage.addBlocklistEntry({
      id: '1',
      guildId: 'guild-1',
      domain: 'bad.com',
      addedBy: 'user-1',
      reason: 'phishing report',
      createdAt: new Date(),
    });

    const res = await fetch(`${baseUrl}/api/guild/guild-1/blocklist`);
    const body = await res.json();
    expect(body[0].reason).toBe('phishing report');
  });

  it('lists recent audit log entries, respecting the limit parameter', async () => {
    for (let i = 0; i < 5; i++) {
      await storage.addAuditLogEntry({
        id: `entry-${i}`,
        guildId: 'guild-1',
        channelId: 'channel-1',
        userId: 'user-1',
        verdict: 'BLOCK',
        reasons: ['BLOCKLIST_MATCH'],
        score: 50,
        action: 'DELETE',
        createdAt: new Date(),
      });
    }

    const res = await fetch(`${baseUrl}/api/guild/guild-1/audit-logs?limit=2`);
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it('scopes every resource to the requested guild only', async () => {
    await storage.addAllowlistEntry({
      id: '1',
      guildId: 'other-guild',
      domain: 'not-mine.com',
      addedBy: 'user-1',
      createdAt: new Date(),
    });

    const res = await fetch(`${baseUrl}/api/guild/guild-1/allowlist`);
    expect(await res.json()).toHaveLength(0);
  });
});
