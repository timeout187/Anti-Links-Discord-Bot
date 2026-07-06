import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { createDefaultGuildConfig } from '@antilink-guard/storage';
import type { BotContext } from '../context.js';
import { requireGuild } from './types.js';
import type { SlashCommand } from './types.js';

const builder = new SlashCommandBuilder()
  .setName('logs')
  .setDescription('Configure the moderation log channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('set-channel')
      .setDescription('Set where moderation actions are logged')
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription('Text channel to post mod-log messages to')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      ),
  );

async function execute(interaction: ChatInputCommandInteraction, ctx: BotContext): Promise<void> {
  const guildId = await requireGuild(interaction);
  if (!guildId) return;

  const channel = interaction.options.getChannel('channel', true);
  const existing = (await ctx.storage.getGuildConfig(guildId)) ?? createDefaultGuildConfig(guildId);
  await ctx.storage.upsertGuildConfig({
    ...existing,
    logChannelId: channel.id,
    updatedAt: new Date(),
  });
  await interaction.reply({
    ephemeral: true,
    content: `Moderation log channel set to <#${channel.id}>.`,
  });
}

export const logsCommand: SlashCommand = { name: 'logs', builder, execute };
