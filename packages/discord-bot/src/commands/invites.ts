import { randomUUID } from 'node:crypto';
import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { createDefaultGuildConfig } from '@antilink-guard/storage';
import type { BotContext } from '../context.js';
import { requireGuild } from './types.js';
import type { SlashCommand } from './types.js';

const INVITE_URL_PREFIX =
  /^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\//i;

export function parseInviteCode(input: string): string {
  return input.trim().replace(INVITE_URL_PREFIX, '').replace(/\/$/, '');
}

const builder = new SlashCommandBuilder()
  .setName('invites')
  .setDescription('Manage Discord invite link handling')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('allow')
      .setDescription('Allow a specific Discord invite')
      .addStringOption((opt) =>
        opt.setName('invite').setDescription('Invite URL or code').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('block-all')
      .setDescription('Block all Discord invites except explicitly allowed ones')
      .addBooleanOption((opt) =>
        opt.setName('enabled').setDescription('Enable (default) or disable invite blocking'),
      ),
  );

async function execute(interaction: ChatInputCommandInteraction, ctx: BotContext): Promise<void> {
  const guildId = await requireGuild(interaction);
  if (!guildId) return;

  const sub = interaction.options.getSubcommand(true);

  if (sub === 'allow') {
    const inviteCode = parseInviteCode(interaction.options.getString('invite', true));
    await ctx.storage.addInviteRule({
      id: randomUUID(),
      guildId,
      inviteCode,
      addedBy: interaction.user.id,
      createdAt: new Date(),
    });
    await interaction.reply({
      ephemeral: true,
      content: `Allowed invite **${inviteCode}**.`,
    });
    return;
  }

  const enabled = interaction.options.getBoolean('enabled') ?? true;
  const existing = (await ctx.storage.getGuildConfig(guildId)) ?? createDefaultGuildConfig(guildId);
  await ctx.storage.upsertGuildConfig({
    ...existing,
    blockAllInvites: enabled,
    updatedAt: new Date(),
  });
  await interaction.reply({
    ephemeral: true,
    content: `Blocking all invites (except allowed ones) is now **${enabled ? 'on' : 'off'}**.`,
  });
}

export const invitesCommand: SlashCommand = { name: 'invites', builder, execute };
