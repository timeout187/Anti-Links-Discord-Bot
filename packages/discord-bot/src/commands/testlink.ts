import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { classifyLink, extractLinks } from '@antilink-guard/core';
import { createDefaultGuildConfig } from '@antilink-guard/storage';
import { buildPolicyConfig } from '../policy-from-config.js';
import type { BotContext } from '../context.js';
import { requireGuild } from './types.js';
import type { SlashCommand } from './types.js';

const builder = new SlashCommandBuilder()
  .setName('testlink')
  .setDescription('Check how a URL would be classified without posting it')
  .addStringOption((opt) => opt.setName('url').setDescription('URL to test').setRequired(true));

async function execute(interaction: ChatInputCommandInteraction, ctx: BotContext): Promise<void> {
  const guildId = await requireGuild(interaction);
  if (!guildId) return;

  const url = interaction.options.getString('url', true);
  const [link] = extractLinks(url);
  if (!link) {
    await interaction.reply({ ephemeral: true, content: `Could not parse \`${url}\` as a URL.` });
    return;
  }

  const [guildConfig, allowlist, blocklist, inviteRules] = await Promise.all([
    ctx.storage.getGuildConfig(guildId),
    ctx.storage.listAllowlistEntries(guildId),
    ctx.storage.listBlocklistEntries(guildId),
    ctx.storage.listInviteRules(guildId),
  ]);

  const policy = buildPolicyConfig({
    guildConfig: guildConfig ?? createDefaultGuildConfig(guildId),
    allowlist,
    blocklist,
    inviteRules,
  });

  const classification = classifyLink(link, policy, url);
  const reasons = classification.reasons.length > 0 ? classification.reasons.join(', ') : 'none';

  await interaction.reply({
    ephemeral: true,
    content: [
      `**URL:** ${classification.link.normalizedUrl}`,
      `**Score:** ${classification.score}`,
      `**Reasons:** ${reasons}`,
    ].join('\n'),
  });
}

export const testlinkCommand: SlashCommand = { name: 'testlink', builder, execute };
