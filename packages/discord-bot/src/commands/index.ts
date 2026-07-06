import { antilinkCommand } from './antilink.js';
import { allowlistCommand } from './allowlist.js';
import { blocklistCommand } from './blocklist.js';
import { invitesCommand } from './invites.js';
import { logsCommand } from './logs.js';
import { testlinkCommand } from './testlink.js';
import { configCommand } from './config.js';
import type { SlashCommand } from './types.js';

export const allCommands: SlashCommand[] = [
  antilinkCommand,
  allowlistCommand,
  blocklistCommand,
  invitesCommand,
  logsCommand,
  testlinkCommand,
  configCommand,
];

export const commandsByName: ReadonlyMap<string, SlashCommand> = new Map(
  allCommands.map((command) => [command.name, command]),
);

export function getCommandJSONBodies(): unknown[] {
  return allCommands.map((command) => command.builder.toJSON());
}

export * from './types.js';
export { antilinkCommand } from './antilink.js';
export { allowlistCommand } from './allowlist.js';
export { blocklistCommand } from './blocklist.js';
export { invitesCommand, parseInviteCode } from './invites.js';
export { logsCommand } from './logs.js';
export { testlinkCommand } from './testlink.js';
export { configCommand, createConfigCommand } from './config.js';
export type { FetchLike } from './config.js';
