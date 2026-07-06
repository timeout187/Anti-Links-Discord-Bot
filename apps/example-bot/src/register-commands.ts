import 'dotenv/config';
import { registerCommands } from '@antilink-guard/discord-bot';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set to register commands.');
  process.exit(1);
}

await registerCommands({ token, clientId, guildId: guildId || undefined });
console.log(
  guildId
    ? `Slash commands registered to guild ${guildId} (updates instantly).`
    : 'Slash commands registered globally (may take up to an hour to propagate).',
);
