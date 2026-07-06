import { describe, expect, it, vi } from 'vitest';
import type { Message } from 'discord.js';
import { MemoryStorageAdapter, createDefaultGuildConfig } from '@antilink-guard/storage';
import { TokenBucketRateLimiter } from '../src/rate-limit.js';
import type { BotContext } from '../src/context.js';
import { handleMessageCreate } from '../src/events/message-create.js';

interface FakeMessageOptions {
  content: string;
  isBot?: boolean;
  inGuild?: boolean;
  authorRoleIds?: string[];
  deletable?: boolean;
  moderatable?: boolean;
}

function makeMessage(opts: FakeMessageOptions): {
  message: Message;
  deleteFn: ReturnType<typeof vi.fn>;
  timeoutFn: ReturnType<typeof vi.fn>;
  sendFn: ReturnType<typeof vi.fn>;
} {
  const deleteFn = vi.fn().mockResolvedValue(undefined);
  const timeoutFn = vi.fn().mockResolvedValue(undefined);
  const sendFn = vi.fn().mockResolvedValue(undefined);

  const fake = {
    content: opts.content,
    author: { id: 'user-1', bot: opts.isBot ?? false },
    guildId: 'guild-1',
    channelId: 'channel-1',
    deletable: opts.deletable ?? true,
    delete: deleteFn,
    member: {
      moderatable: opts.moderatable ?? true,
      timeout: timeoutFn,
      roles: {
        cache: {
          map: (fn: (r: { id: string }) => string) =>
            (opts.authorRoleIds ?? []).map((id) => fn({ id })),
        },
      },
    },
    mentions: { users: { size: 0 }, roles: { size: 0 } },
    inGuild: () => opts.inGuild ?? true,
    client: {
      channels: { fetch: vi.fn().mockResolvedValue({ isTextBased: () => true, send: sendFn }) },
    },
  };

  return { message: fake as unknown as Message, deleteFn, timeoutFn, sendFn };
}

async function makeContext(): Promise<BotContext> {
  const storage = new MemoryStorageAdapter();
  await storage.init();
  return { storage, moderationRateLimiter: new TokenBucketRateLimiter(10, 10) };
}

describe('handleMessageCreate', () => {
  it('ignores messages from bots', async () => {
    const ctx = await makeContext();
    const { message, deleteFn } = makeMessage({ content: 'https://bad.com', isBot: true });
    await ctx.storage.upsertGuildConfig({
      ...createDefaultGuildConfig('guild-1'),
      mode: 'delete',
    });
    await handleMessageCreate(message, ctx);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('ignores messages outside of a guild (DMs)', async () => {
    const ctx = await makeContext();
    const { message, deleteFn } = makeMessage({ content: 'https://bad.com', inGuild: false });
    await handleMessageCreate(message, ctx);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('does nothing when the guild has moderation disabled', async () => {
    const ctx = await makeContext();
    await ctx.storage.upsertGuildConfig({ ...createDefaultGuildConfig('guild-1'), enabled: false });
    await ctx.storage.addBlocklistEntry({
      id: '1',
      guildId: 'guild-1',
      domain: 'bad.com',
      addedBy: 'u',
      createdAt: new Date(),
    });
    const { message, deleteFn } = makeMessage({ content: 'https://bad.com' });
    await handleMessageCreate(message, ctx);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('deletes a message matching the guild blocklist and records an audit entry', async () => {
    const ctx = await makeContext();
    await ctx.storage.upsertGuildConfig({ ...createDefaultGuildConfig('guild-1'), mode: 'delete' });
    await ctx.storage.addBlocklistEntry({
      id: '1',
      guildId: 'guild-1',
      domain: 'bad.com',
      addedBy: 'u',
      createdAt: new Date(),
    });
    const { message, deleteFn } = makeMessage({ content: 'check https://bad.com now' });

    await handleMessageCreate(message, ctx);

    expect(deleteFn).toHaveBeenCalledOnce();
    expect(await ctx.storage.listAuditLogEntries('guild-1')).toHaveLength(1);
  });

  it('does not enforce for a bypassed role', async () => {
    const ctx = await makeContext();
    await ctx.storage.upsertGuildConfig({
      ...createDefaultGuildConfig('guild-1'),
      mode: 'delete',
      bypassRoleIds: ['mod-role'],
    });
    await ctx.storage.addBlocklistEntry({
      id: '1',
      guildId: 'guild-1',
      domain: 'bad.com',
      addedBy: 'u',
      createdAt: new Date(),
    });
    const { message, deleteFn } = makeMessage({
      content: 'https://bad.com',
      authorRoleIds: ['mod-role'],
    });

    await handleMessageCreate(message, ctx);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('sends a mod-log message when a log channel is configured', async () => {
    const ctx = await makeContext();
    await ctx.storage.upsertGuildConfig({
      ...createDefaultGuildConfig('guild-1'),
      mode: 'delete',
      logChannelId: 'log-channel-1',
    });
    await ctx.storage.addBlocklistEntry({
      id: '1',
      guildId: 'guild-1',
      domain: 'bad.com',
      addedBy: 'u',
      createdAt: new Date(),
    });
    const { message, sendFn } = makeMessage({ content: 'https://bad.com' });

    await handleMessageCreate(message, ctx);
    expect(sendFn).toHaveBeenCalledOnce();
  });

  it('skips enforcement once the moderation rate limit is exhausted', async () => {
    const storage = new MemoryStorageAdapter();
    await storage.init();
    const ctx: BotContext = { storage, moderationRateLimiter: new TokenBucketRateLimiter(1, 1) };

    await storage.upsertGuildConfig({ ...createDefaultGuildConfig('guild-1'), mode: 'delete' });
    await storage.addBlocklistEntry({
      id: '1',
      guildId: 'guild-1',
      domain: 'bad.com',
      addedBy: 'u',
      createdAt: new Date(),
    });

    const first = makeMessage({ content: 'https://bad.com' });
    const second = makeMessage({ content: 'https://bad.com' });

    await handleMessageCreate(first.message, ctx);
    await handleMessageCreate(second.message, ctx);

    expect(first.deleteFn).toHaveBeenCalledOnce();
    expect(second.deleteFn).not.toHaveBeenCalled();
  });

  it('does not throw when message content has no links at all', async () => {
    const ctx = await makeContext();
    const { message } = makeMessage({ content: 'just chatting, no links here' });
    await expect(handleMessageCreate(message, ctx)).resolves.toBeUndefined();
  });
});
