import { describe, expect, it, vi } from 'vitest';
import type { ScanResult } from '@antilink-guard/core';
import { MemoryStorageAdapter } from '@antilink-guard/storage';
import { enforceScanResult, type EnforceableMessage } from '../src/moderation/enforce.js';

function makeMessage(overrides: Partial<EnforceableMessage> = {}): EnforceableMessage {
  return {
    guildId: 'guild-1',
    channelId: 'channel-1',
    author: { id: 'user-1' },
    deletable: true,
    delete: vi.fn().mockResolvedValue(undefined),
    member: {
      moderatable: true,
      timeout: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

function makeResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    verdict: 'BLOCK',
    action: 'DELETE',
    score: 50,
    reasons: ['BLOCKLIST_MATCH'],
    matchedLinks: [],
    bypassed: false,
    ...overrides,
  };
}

describe('enforceScanResult', () => {
  it('deletes the message and records DELETE for a BLOCK verdict in delete mode', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const message = makeMessage();

    const { actionTaken } = await enforceScanResult(message, makeResult(), storage);

    expect(actionTaken).toBe('DELETE');
    expect(message.delete).toHaveBeenCalledOnce();
    const audits = await storage.listAuditLogEntries('guild-1');
    expect(audits[0]?.action).toBe('DELETE');
  });

  it('does not call delete() when the bot lacks permission (message.deletable is false)', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const message = makeMessage({ deletable: false });

    const { actionTaken } = await enforceScanResult(message, makeResult(), storage);

    expect(actionTaken).toBe('NONE');
    expect(message.delete).not.toHaveBeenCalled();
  });

  it('deletes and times out for a QUARANTINE verdict with a TIMEOUT action', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const message = makeMessage();
    const result = makeResult({ verdict: 'QUARANTINE', action: 'TIMEOUT', score: 100 });

    const { actionTaken } = await enforceScanResult(message, result, storage);

    expect(actionTaken).toBe('TIMEOUT');
    expect(message.delete).toHaveBeenCalledOnce();
    expect(message.member?.timeout).toHaveBeenCalledOnce();
  });

  it('deletes but does not time out when the member is not moderatable', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const message = makeMessage({ member: { moderatable: false, timeout: vi.fn() } });
    const result = makeResult({ verdict: 'QUARANTINE', action: 'TIMEOUT', score: 100 });

    const { actionTaken } = await enforceScanResult(message, result, storage);

    expect(actionTaken).toBe('DELETE');
    expect(message.delete).toHaveBeenCalledOnce();
    expect(message.member?.timeout).not.toHaveBeenCalled();
  });

  it('does not time out when message.member is null (e.g. the author left the server)', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const message = makeMessage({ member: null });
    const result = makeResult({ verdict: 'QUARANTINE', action: 'TIMEOUT', score: 100 });

    const { actionTaken } = await enforceScanResult(message, result, storage);

    expect(actionTaken).toBe('DELETE');
  });

  it('takes no Discord action for a LOG-mode result but still records the audit entry', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const message = makeMessage();
    const result = makeResult({ action: 'LOG' });

    const { actionTaken, auditEntry } = await enforceScanResult(message, result, storage);

    expect(actionTaken).toBe('LOG');
    expect(message.delete).not.toHaveBeenCalled();
    expect(auditEntry.guildId).toBe('guild-1');
    expect(auditEntry.action).toBe('LOG');
  });

  it('takes no Discord action for a WARN-mode result and records it distinctly from LOG', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const message = makeMessage();
    const result = makeResult({ action: 'WARN' });

    const { actionTaken } = await enforceScanResult(message, result, storage);

    expect(actionTaken).toBe('WARN');
    expect(message.delete).not.toHaveBeenCalled();
  });

  it('records a ModerationActionRecord alongside the audit log entry', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const message = makeMessage();

    await enforceScanResult(message, makeResult(), storage);

    const actions = await storage.listModerationActions('guild-1');
    expect(actions).toHaveLength(1);
    expect(actions[0]?.actionType).toBe('DELETE');
    expect(actions[0]?.userId).toBe('user-1');
  });

  it('uses a custom timeout duration when provided', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const message = makeMessage();
    const result = makeResult({ verdict: 'QUARANTINE', action: 'TIMEOUT' });

    await enforceScanResult(message, result, storage, { timeoutDurationMs: 60_000 });

    expect(message.member?.timeout).toHaveBeenCalledWith(60_000, expect.any(String));
  });

  it('never stores message content in the audit entry', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const message = makeMessage();

    const { auditEntry } = await enforceScanResult(message, makeResult(), storage);

    expect(auditEntry).not.toHaveProperty('content');
    expect(Object.keys(auditEntry)).not.toContain('message');
  });
});
