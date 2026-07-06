import { describe, expect, it, vi } from 'vitest';
import type { Interaction } from 'discord.js';
import { MemoryStorageAdapter } from '@antilink-guard/storage';
import { TokenBucketRateLimiter } from '../src/rate-limit.js';
import type { BotContext } from '../src/context.js';
import { handleInteractionCreate } from '../src/events/interaction-create.js';

async function makeContext(): Promise<BotContext> {
  const storage = new MemoryStorageAdapter();
  await storage.init();
  return { storage, moderationRateLimiter: new TokenBucketRateLimiter(10, 10) };
}

describe('handleInteractionCreate', () => {
  it('ignores interactions that are not chat input commands', async () => {
    const ctx = await makeContext();
    const interaction = { isChatInputCommand: () => false } as unknown as Interaction;
    await expect(handleInteractionCreate(interaction, ctx)).resolves.toBeUndefined();
  });

  it('ignores an unrecognized command name', async () => {
    const ctx = await makeContext();
    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'not-a-real-command',
    } as unknown as Interaction;
    await expect(handleInteractionCreate(interaction, ctx)).resolves.toBeUndefined();
  });

  it('routes a recognized command to its handler', async () => {
    const ctx = await makeContext();
    const reply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'antilink',
      guildId: 'guild-1',
      options: { getSubcommand: () => 'status' },
      reply,
    } as unknown as Interaction;

    await handleInteractionCreate(interaction, ctx);
    expect(reply).toHaveBeenCalledOnce();
  });

  it('replies with a generic error and does not throw when a handler fails', async () => {
    const ctx = await makeContext();
    const reply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'antilink',
      guildId: 'guild-1',
      deferred: false,
      replied: false,
      options: {
        getSubcommand: () => {
          throw new Error('boom');
        },
      },
      reply,
    } as unknown as Interaction;

    await expect(handleInteractionCreate(interaction, ctx)).resolves.toBeUndefined();
    expect(reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('went wrong') }),
    );
  });

  it('uses followUp instead of reply when the interaction was already replied to', async () => {
    const ctx = await makeContext();
    const followUp = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      isChatInputCommand: () => true,
      commandName: 'antilink',
      guildId: 'guild-1',
      deferred: false,
      replied: true,
      options: {
        getSubcommand: () => {
          throw new Error('boom');
        },
      },
      followUp,
    } as unknown as Interaction;

    await handleInteractionCreate(interaction, ctx);
    expect(followUp).toHaveBeenCalledOnce();
  });
});
