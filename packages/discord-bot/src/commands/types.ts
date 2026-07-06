import type { ChatInputCommandInteraction } from 'discord.js';
import type { BotContext } from '../context.js';

export interface SlashCommand {
  name: string;
  builder: { toJSON(): unknown };
  execute(interaction: ChatInputCommandInteraction, ctx: BotContext): Promise<void>;
}

export async function requireGuild(
  interaction: ChatInputCommandInteraction,
): Promise<string | undefined> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
    return undefined;
  }
  return interaction.guildId;
}
