import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { createDefaultGuildConfig } from '@antilink-guard/storage';
import type { BotContext } from '../context.js';
import { requireGuild } from './types.js';
import type { SlashCommand } from './types.js';

const MODE_CHOICES = [
  { name: 'Block (delete matching messages)', value: 'block' },
  { name: 'Warn (notify, do not delete)', value: 'warn' },
  { name: 'Log only (take no action)', value: 'log' },
] as const;

function toEnforcementMode(choice: string): 'delete' | 'warn' | 'log' {
  return choice === 'block' ? 'delete' : (choice as 'warn' | 'log');
}

const builder = new SlashCommandBuilder()
  .setName('antilink')
  .setDescription('Manage AntiLink Guard protection for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub.setName('status').setDescription('Show the current AntiLink configuration'),
  )
  .addSubcommand((sub) => sub.setName('enable').setDescription('Turn on link moderation'))
  .addSubcommand((sub) => sub.setName('disable').setDescription('Turn off link moderation'))
  .addSubcommand((sub) =>
    sub
      .setName('mode')
      .setDescription('Set the enforcement mode')
      .addStringOption((opt) =>
        opt
          .setName('value')
          .setDescription('Enforcement mode')
          .setRequired(true)
          .addChoices(...MODE_CHOICES),
      ),
  );

async function execute(interaction: ChatInputCommandInteraction, ctx: BotContext): Promise<void> {
  const guildId = await requireGuild(interaction);
  if (!guildId) return;

  const sub = interaction.options.getSubcommand(true);
  const existing = (await ctx.storage.getGuildConfig(guildId)) ?? createDefaultGuildConfig(guildId);

  if (sub === 'status') {
    await interaction.reply({
      ephemeral: true,
      content: [
        `**Enabled:** ${existing.enabled}`,
        `**Mode:** ${existing.mode}`,
        `**Log channel:** ${existing.logChannelId ? `<#${existing.logChannelId}>` : 'not set'}`,
        `**Block all invites:** ${existing.blockAllInvites}`,
      ].join('\n'),
    });
    return;
  }

  if (sub === 'enable' || sub === 'disable') {
    await ctx.storage.upsertGuildConfig({
      ...existing,
      enabled: sub === 'enable',
      updatedAt: new Date(),
    });
    await interaction.reply({
      ephemeral: true,
      content: `AntiLink Guard is now **${sub === 'enable' ? 'enabled' : 'disabled'}**.`,
    });
    return;
  }

  const choice = interaction.options.getString('value', true);
  const mode = toEnforcementMode(choice);
  await ctx.storage.upsertGuildConfig({ ...existing, mode, updatedAt: new Date() });
  await interaction.reply({ ephemeral: true, content: `Enforcement mode set to **${mode}**.` });
}

export const antilinkCommand: SlashCommand = { name: 'antilink', builder, execute };
