import { randomUUID } from 'node:crypto';
import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type { BotContext } from '../context.js';
import { requireGuild } from './types.js';
import type { SlashCommand } from './types.js';

const builder = new SlashCommandBuilder()
  .setName('allowlist')
  .setDescription('Manage the domain allowlist')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Allow a domain')
      .addStringOption((opt) =>
        opt
          .setName('domain')
          .setDescription('Domain to allow (e.g. example.com)')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Remove a domain from the allowlist')
      .addStringOption((opt) =>
        opt.setName('domain').setDescription('Domain to remove').setRequired(true),
      ),
  );

async function execute(interaction: ChatInputCommandInteraction, ctx: BotContext): Promise<void> {
  const guildId = await requireGuild(interaction);
  if (!guildId) return;

  const sub = interaction.options.getSubcommand(true);
  const domain = interaction.options.getString('domain', true).toLowerCase().trim();

  if (sub === 'add') {
    await ctx.storage.addAllowlistEntry({
      id: randomUUID(),
      guildId,
      domain,
      addedBy: interaction.user.id,
      createdAt: new Date(),
    });
    await interaction.reply({ ephemeral: true, content: `Added **${domain}** to the allowlist.` });
    return;
  }

  const entries = await ctx.storage.listAllowlistEntries(guildId);
  const match = entries.find((entry) => entry.domain === domain);
  if (!match) {
    await interaction.reply({
      ephemeral: true,
      content: `**${domain}** is not on the allowlist.`,
    });
    return;
  }
  await ctx.storage.removeAllowlistEntry(guildId, match.id);
  await interaction.reply({
    ephemeral: true,
    content: `Removed **${domain}** from the allowlist.`,
  });
}

export const allowlistCommand: SlashCommand = { name: 'allowlist', builder, execute };
