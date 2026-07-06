import { describe, expect, it, vi } from 'vitest';
import type { AuditLogEntry } from '@antilink-guard/storage';
import {
  buildModLogEmbed,
  sendModLog,
  type ModLogChannelSource,
} from '../src/moderation/mod-log.js';

function makeEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: 'entry-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    userId: 'user-1',
    normalizedUrl: 'https://bad-site.com',
    hostname: 'bad-site.com',
    verdict: 'BLOCK',
    reasons: ['BLOCKLIST_MATCH'],
    score: 50,
    action: 'DELETE',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('buildModLogEmbed', () => {
  it('includes the user, channel, action, verdict, score, and reasons', () => {
    const embed = buildModLogEmbed(makeEntry());
    const json = embed.toJSON();
    const fieldNames = json.fields?.map((f) => f.name) ?? [];

    expect(fieldNames).toEqual(
      expect.arrayContaining(['User', 'Channel', 'Action', 'Verdict', 'Score', 'Reasons', 'URL']),
    );
  });

  it('omits the URL field when there is no normalized URL', () => {
    const embed = buildModLogEmbed(makeEntry({ normalizedUrl: undefined }));
    const fieldNames = embed.toJSON().fields?.map((f) => f.name) ?? [];
    expect(fieldNames).not.toContain('URL');
  });

  it('sets the embed timestamp to the entry creation time', () => {
    const entry = makeEntry();
    const embed = buildModLogEmbed(entry);
    expect(embed.toJSON().timestamp).toBe(entry.createdAt.toISOString());
  });
});

describe('sendModLog', () => {
  it('sends an embed to a fetched text-based channel', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const client: ModLogChannelSource = {
      channels: {
        fetch: vi.fn().mockResolvedValue({ isTextBased: () => true, send }),
      },
    };

    await sendModLog(client, 'log-channel-1', makeEntry());

    expect(send).toHaveBeenCalledOnce();
  });

  it('does nothing when the channel cannot be found', async () => {
    const client: ModLogChannelSource = {
      channels: { fetch: vi.fn().mockResolvedValue(null) },
    };

    await expect(sendModLog(client, 'missing-channel', makeEntry())).resolves.toBeUndefined();
  });

  it('does nothing when the channel is not text-based', async () => {
    const send = vi.fn();
    const client: ModLogChannelSource = {
      channels: {
        fetch: vi.fn().mockResolvedValue({ isTextBased: () => false, send }),
      },
    };

    await sendModLog(client, 'voice-channel-1', makeEntry());
    expect(send).not.toHaveBeenCalled();
  });

  it('swallows an error thrown while fetching the channel', async () => {
    const client: ModLogChannelSource = {
      channels: { fetch: vi.fn().mockRejectedValue(new Error('network error')) },
    };

    await expect(sendModLog(client, 'log-channel-1', makeEntry())).resolves.toBeUndefined();
  });
});
