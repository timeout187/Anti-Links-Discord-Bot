import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SqliteStorageAdapter } from '@antilink-guard/storage';
import { createBot } from '@antilink-guard/discord-bot';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const dbPath = resolve(process.env.DATABASE_SQLITE_PATH ?? './data/antilink.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });

const storage = new SqliteStorageAdapter({ filename: dbPath });
await storage.init();

const client = createBot({ storage });
await client.login(token);
