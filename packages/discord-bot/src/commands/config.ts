import {
  AttachmentBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import {
  exportGuildConfigBundle,
  importGuildConfigBundle,
  parseConfigBundle,
} from '@antilink-guard/storage';
import type { BotContext } from '../context.js';
import { requireGuild } from './types.js';
import type { SlashCommand } from './types.js';

export type FetchLike = (url: string) => Promise<{ text(): Promise<string> }>;

const builder = new SlashCommandBuilder()
  .setName('config')
  .setDescription("Export or import this server's AntiLink Guard configuration")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub.setName('export').setDescription('Export the current configuration as a JSON file'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('import')
      .setDescription('Import a configuration JSON file exported from this bot')
      .addAttachmentOption((opt) =>
        opt.setName('file').setDescription('Config bundle JSON file').setRequired(true),
      ),
  );

export function createConfigCommand(fetchImpl: FetchLike = fetch): SlashCommand {
  async function execute(interaction: ChatInputCommandInteraction, ctx: BotContext): Promise<void> {
    const guildId = await requireGuild(interaction);
    if (!guildId) return;

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'export') {
      const bundle = await exportGuildConfigBundle(ctx.storage, guildId);
      const attachment = new AttachmentBuilder(
        Buffer.from(JSON.stringify(bundle, null, 2), 'utf8'),
        {
          name: `antilink-config-${guildId}.json`,
        },
      );
      await interaction.reply({ ephemeral: true, files: [attachment] });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const attachment = interaction.options.getAttachment('file', true);

    try {
      const response = await fetchImpl(attachment.url);
      const raw = JSON.parse(await response.text());
      const bundle = parseConfigBundle(raw);
      // Always scope the import to the guild running the command, regardless of what
      // guildId the uploaded file claims - never let an import write another guild's config.
      const scopedBundle = { ...bundle, guildConfig: { ...bundle.guildConfig, guildId } };
      await importGuildConfigBundle(ctx.storage, scopedBundle);
      await interaction.editReply('Configuration imported successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await interaction.editReply(`Import failed: invalid config file (${message}).`);
    }
  }

  return { name: 'config', builder, execute };
}

export const configCommand: SlashCommand = createConfigCommand();
