import 'dotenv/config';
import { SqliteStorageAdapter } from '@antilink-guard/storage';
import { createDashboardServer } from './server.js';

const dbPath = process.env.DATABASE_SQLITE_PATH ?? '../example-bot/data/antilink.sqlite';
const port = Number(process.env.PORT ?? 4000);

const storage = new SqliteStorageAdapter({ filename: dbPath });
await storage.init();

const server = createDashboardServer(storage);
server.listen(port, () => {
  console.log(`AntiLink Guard OSS dashboard-lite listening on http://localhost:${port}`);
  console.log(
    'This is a local, unauthenticated read-only tool - do not expose it to the internet.',
  );
});
