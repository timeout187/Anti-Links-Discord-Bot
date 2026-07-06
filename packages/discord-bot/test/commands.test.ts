import { describe, expect, it, vi } from 'vitest';
import type { ChatInputCommandInteraction } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';
import { MemoryStorageAdapter, createDefaultGuildConfig } from '@antilink-guard/storage';
import { TokenBucketRateLimiter } from '../src/rate-limit.js';
import type { BotContext } from '../src/context.js';
import {
  allCommands,
  allowlistCommand,
  antilinkCommand,
  blocklistCommand,
  createConfigCommand,
  invitesCommand,
  logsCommand,
  parseInviteCode,
  testlinkCommand,
} from '../src/commands/index.js';

async function makeContext(): Promise<BotContext> {
  const storage = new MemoryStorageAdapter();
  await storage.init();
  return { storage, moderationRateLimiter: new TokenBucketRateLimiter(10, 10) };
}

interface FakeInteractionOptions {
  guildId?: string | null;
  subcommand?: string;
  strings?: Record<string, string | null>;
  booleans?: Record<string, boolean | null>;
  channel?: { id: string } | null;
  attachment?: { url: string } | null;
  userId?: string;
}

function makeInteraction(opts: FakeInteractionOptions = {}): ChatInputCommandInteraction {
  const reply = vi.fn().mockResolvedValue(undefined);
  const deferReply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);

  const fake = {
    guildId: opts.guildId === undefined ? 'guild-1' : opts.guildId,
    user: { id: opts.userId ?? 'user-1' },
    deferred: false,
    replied: false,
    reply,
    deferReply,
    editReply,
    options: {
      getSubcommand: () => opts.subcommand ?? '',
      getString: (name: string) => opts.strings?.[name] ?? null,
      getBoolean: (name: string) => opts.booleans?.[name] ?? null,
      getChannel: () => opts.channel ?? null,
      getAttachment: () => opts.attachment ?? null,
    },
  };

  return fake as unknown as ChatInputCommandInteraction;
}

describe('slash command JSON shapes', () => {
  it('defines exactly the required top-level commands', () => {
    const names = allCommands.map((c) => c.name).sort();
    expect(names).toEqual(
      ['allowlist', 'antilink', 'blocklist', 'config', 'invites', 'logs', 'testlink'].sort(),
    );
  });

  it('restricts admin commands to Manage Server by default', () => {
    for (const command of allCommands) {
      if (command.name === 'testlink') continue;
      const json = command.builder.toJSON() as { default_member_permissions?: string };
      expect(json.default_member_permissions).toBe(String(PermissionFlagsBits.ManageGuild));
    }
  });

  it('leaves testlink available to everyone', () => {
    const json = testlinkCommand.builder.toJSON() as { default_member_permissions?: string | null };
    expect(json.default_member_permissions).toBeFalsy();
  });

  it('antilink exposes status/enable/disable/mode subcommands', () => {
    const json = antilinkCommand.builder.toJSON() as { options?: { name: string }[] };
    const subNames = json.options?.map((o) => o.name) ?? [];
    expect(subNames).toEqual(['status', 'enable', 'disable', 'mode']);
  });

  it('allowlist and blocklist both expose add/remove with a required domain option', () => {
    for (const command of [allowlistCommand, blocklistCommand]) {
      const json = command.builder.toJSON() as {
        options?: { name: string; options?: { name: string; required?: boolean }[] }[];
      };
      const subNames = json.options?.map((o) => o.name) ?? [];
      expect(subNames).toEqual(['add', 'remove']);
      for (const sub of json.options ?? []) {
        expect(sub.options?.[0]?.name).toBe('domain');
        expect(sub.options?.[0]?.required).toBe(true);
      }
    }
  });

  it('invites exposes allow and block-all', () => {
    const json = invitesCommand.builder.toJSON() as { options?: { name: string }[] };
    expect(json.options?.map((o) => o.name)).toEqual(['allow', 'block-all']);
  });

  it('logs exposes set-channel with a required channel option', () => {
    const json = logsCommand.builder.toJSON() as {
      options?: { name: string; options?: { name: string; required?: boolean }[] }[];
    };
    expect(json.options?.[0]?.name).toBe('set-channel');
    expect(json.options?.[0]?.options?.[0]?.name).toBe('channel');
    expect(json.options?.[0]?.options?.[0]?.required).toBe(true);
  });

  it('config exposes export and import, with import requiring a file attachment', () => {
    const json = createConfigCommand().builder.toJSON() as {
      options?: { name: string; options?: { name: string; type: number; required?: boolean }[] }[];
    };
    const subNames = json.options?.map((o) => o.name) ?? [];
    expect(subNames).toEqual(['export', 'import']);
    const importSub = json.options?.find((o) => o.name === 'import');
    expect(importSub?.options?.[0]?.name).toBe('file');
    expect(importSub?.options?.[0]?.required).toBe(true);
  });
});

describe('parseInviteCode', () => {
  it('extracts the code from a full discord.gg URL', () => {
    expect(parseInviteCode('https://discord.gg/abc123')).toBe('abc123');
  });

  it('extracts the code from a discord.com/invite URL', () => {
    expect(parseInviteCode('https://discord.com/invite/xyz789')).toBe('xyz789');
  });

  it('passes through a bare invite code unchanged', () => {
    expect(parseInviteCode('bare-code')).toBe('bare-code');
  });
});

describe('command execute() behavior', () => {
  it('antilink status reports the default config for a fresh guild', async () => {
    const ctx = await makeContext();
    const interaction = makeInteraction({ subcommand: 'status' });
    await antilinkCommand.execute(interaction, ctx);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Enabled:** true') }),
    );
  });

  it('antilink enable/disable persists the change', async () => {
    const ctx = await makeContext();
    await antilinkCommand.execute(makeInteraction({ subcommand: 'disable' }), ctx);
    const config = await ctx.storage.getGuildConfig('guild-1');
    expect(config?.enabled).toBe(false);
  });

  it('antilink mode "block" is stored internally as the "delete" enforcement mode', async () => {
    const ctx = await makeContext();
    await antilinkCommand.execute(
      makeInteraction({ subcommand: 'mode', strings: { value: 'block' } }),
      ctx,
    );
    const config = await ctx.storage.getGuildConfig('guild-1');
    expect(config?.mode).toBe('delete');
  });

  it('antilink mode "warn" and "log" map directly', async () => {
    const ctx = await makeContext();
    await antilinkCommand.execute(
      makeInteraction({ subcommand: 'mode', strings: { value: 'warn' } }),
      ctx,
    );
    expect((await ctx.storage.getGuildConfig('guild-1'))?.mode).toBe('warn');

    await antilinkCommand.execute(
      makeInteraction({ subcommand: 'mode', strings: { value: 'log' } }),
      ctx,
    );
    expect((await ctx.storage.getGuildConfig('guild-1'))?.mode).toBe('log');
  });

  it('refuses to run any admin command outside a guild', async () => {
    const ctx = await makeContext();
    const interaction = makeInteraction({ guildId: null, subcommand: 'status' });
    await antilinkCommand.execute(interaction, ctx);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('only be used in a server') }),
    );
  });

  it('allowlist add then remove round-trips a domain', async () => {
    const ctx = await makeContext();
    await allowlistCommand.execute(
      makeInteraction({ subcommand: 'add', strings: { domain: 'example.com' } }),
      ctx,
    );
    expect(await ctx.storage.listAllowlistEntries('guild-1')).toHaveLength(1);

    await allowlistCommand.execute(
      makeInteraction({ subcommand: 'remove', strings: { domain: 'example.com' } }),
      ctx,
    );
    expect(await ctx.storage.listAllowlistEntries('guild-1')).toHaveLength(0);
  });

  it('allowlist remove replies gracefully when the domain is not present', async () => {
    const ctx = await makeContext();
    const interaction = makeInteraction({ subcommand: 'remove', strings: { domain: 'nope.com' } });
    await allowlistCommand.execute(interaction, ctx);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('not on the allowlist') }),
    );
  });

  it('blocklist add then remove round-trips a domain', async () => {
    const ctx = await makeContext();
    await blocklistCommand.execute(
      makeInteraction({ subcommand: 'add', strings: { domain: 'bad.com' } }),
      ctx,
    );
    expect(await ctx.storage.listBlocklistEntries('guild-1')).toHaveLength(1);

    await blocklistCommand.execute(
      makeInteraction({ subcommand: 'remove', strings: { domain: 'bad.com' } }),
      ctx,
    );
    expect(await ctx.storage.listBlocklistEntries('guild-1')).toHaveLength(0);
  });

  it('invites allow stores a parsed invite code', async () => {
    const ctx = await makeContext();
    await invitesCommand.execute(
      makeInteraction({ subcommand: 'allow', strings: { invite: 'https://discord.gg/abc123' } }),
      ctx,
    );
    const rules = await ctx.storage.listInviteRules('guild-1');
    expect(rules[0]?.inviteCode).toBe('abc123');
  });

  it('invites block-all defaults to enabling when no boolean is given', async () => {
    const ctx = await makeContext();
    await invitesCommand.execute(makeInteraction({ subcommand: 'block-all' }), ctx);
    expect((await ctx.storage.getGuildConfig('guild-1'))?.blockAllInvites).toBe(true);
  });

  it('invites block-all can be explicitly disabled', async () => {
    const ctx = await makeContext();
    await invitesCommand.execute(
      makeInteraction({ subcommand: 'block-all', booleans: { enabled: false } }),
      ctx,
    );
    expect((await ctx.storage.getGuildConfig('guild-1'))?.blockAllInvites).toBe(false);
  });

  it('logs set-channel persists the channel id', async () => {
    const ctx = await makeContext();
    await logsCommand.execute(
      makeInteraction({ subcommand: 'set-channel', channel: { id: 'channel-99' } }),
      ctx,
    );
    expect((await ctx.storage.getGuildConfig('guild-1'))?.logChannelId).toBe('channel-99');
  });

  it('testlink reports a shortener domain for a bit.ly URL', async () => {
    const ctx = await makeContext();
    const interaction = makeInteraction({ strings: { url: 'https://bit.ly/abc' } });
    await testlinkCommand.execute(interaction, ctx);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('URL_SHORTENER') }),
    );
  });

  it('testlink handles unparseable input gracefully', async () => {
    const ctx = await makeContext();
    const interaction = makeInteraction({ strings: { url: 'not a url ://' } });
    await testlinkCommand.execute(interaction, ctx);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Could not parse') }),
    );
  });

  it('config export attaches a JSON file scoped to the current guild', async () => {
    const ctx = await makeContext();
    const command = createConfigCommand();
    const interaction = makeInteraction({ subcommand: 'export' });
    await command.execute(interaction, ctx);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array) }),
    );
  });

  it('config import forces the imported guildId to the current guild, ignoring the file', async () => {
    const ctx = await makeContext();
    const foreignBundle = {
      version: 1,
      guildConfig: { ...createDefaultGuildConfig('some-other-guild'), mode: 'timeout' },
      allowlist: [],
      blocklist: [],
      inviteRules: [],
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ text: async () => JSON.stringify(foreignBundle) });
    const command = createConfigCommand(fetchImpl);

    const interaction = makeInteraction({
      subcommand: 'import',
      attachment: { url: 'https://cdn.discord.com/fake.json' },
    });
    await command.execute(interaction, ctx);

    expect(await ctx.storage.getGuildConfig('some-other-guild')).toBeUndefined();
    const ownConfig = await ctx.storage.getGuildConfig('guild-1');
    expect(ownConfig?.mode).toBe('timeout');
  });

  it('config import replies with an error for an invalid file', async () => {
    const ctx = await makeContext();
    const fetchImpl = vi.fn().mockResolvedValue({ text: async () => 'not valid json' });
    const command = createConfigCommand(fetchImpl);

    const interaction = makeInteraction({
      subcommand: 'import',
      attachment: { url: 'https://cdn.discord.com/fake.json' },
    });
    await command.execute(interaction, ctx);

    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Import failed'));
  });
});
