import 'dotenv/config';
import { createBot } from '@antilink-guard/discord-bot';
import { createStorageFromEnv } from './create-storage.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const storage = createStorageFromEnv(process.env);
await storage.init();

const client = createBot({ storage });
await client.login(token);
