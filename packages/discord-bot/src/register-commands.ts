import { REST, Routes } from 'discord.js';
import { getCommandJSONBodies } from './commands/index.js';
import { logger } from './logger.js';

export interface RegisterCommandsOptions {
  token: string;
  clientId: string;
  /** If provided, registers commands to a single guild (updates instantly) instead of globally (~1hr propagation). */
  guildId?: string;
}

export async function registerCommands(options: RegisterCommandsOptions): Promise<void> {
  const rest = new REST().setToken(options.token);
  const body = getCommandJSONBodies();
  const route = options.guildId
    ? Routes.applicationGuildCommands(options.clientId, options.guildId)
    : Routes.applicationCommands(options.clientId);

  await rest.put(route, { body });
  logger.info(
    { count: body.length, scope: options.guildId ? `guild:${options.guildId}` : 'global' },
    'registered slash commands',
  );
}
