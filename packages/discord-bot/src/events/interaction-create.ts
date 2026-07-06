import type { Interaction } from 'discord.js';
import { commandsByName } from '../commands/index.js';
import type { BotContext } from '../context.js';
import { logger } from '../logger.js';

export async function handleInteractionCreate(
  interaction: Interaction,
  ctx: BotContext,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = commandsByName.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, ctx);
  } catch (error) {
    logger.error({ err: error, command: interaction.commandName }, 'command execution failed');
    const payload = { content: 'Something went wrong running that command.', ephemeral: true };
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch (replyError) {
      logger.error({ err: replyError }, 'failed to send error reply for a failed command');
    }
  }
}
