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
  .setName('blocklist')
  .setDescription('Manage the domain blocklist')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Block a domain')
      .addStringOption((opt) =>
        opt
          .setName('domain')
          .setDescription('Domain to block (e.g. bad-site.com)')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Remove a domain from the blocklist')
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
    await ctx.storage.addBlocklistEntry({
      id: randomUUID(),
      guildId,
      domain,
      addedBy: interaction.user.id,
      createdAt: new Date(),
    });
    await interaction.reply({ ephemeral: true, content: `Added **${domain}** to the blocklist.` });
    return;
  }

  const entries = await ctx.storage.listBlocklistEntries(guildId);
  const match = entries.find((entry) => entry.domain === domain);
  if (!match) {
    await interaction.reply({
      ephemeral: true,
      content: `**${domain}** is not on the blocklist.`,
    });
    return;
  }
  await ctx.storage.removeBlocklistEntry(guildId, match.id);
  await interaction.reply({
    ephemeral: true,
    content: `Removed **${domain}** from the blocklist.`,
  });
}

export const blocklistCommand: SlashCommand = { name: 'blocklist', builder, execute };
