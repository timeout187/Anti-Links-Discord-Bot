import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  MysqlStorageAdapter,
  PostgresStorageAdapter,
  SqliteStorageAdapter,
  type StorageAdapter,
} from '@antilink-guard/storage';

export interface StorageEnv {
  DATABASE_DRIVER?: string;
  DATABASE_SQLITE_PATH?: string;
  DATABASE_MYSQL_URL?: string;
  DATABASE_POSTGRES_URL?: string;
}

export function createStorageFromEnv(env: StorageEnv): StorageAdapter {
  const driver = (env.DATABASE_DRIVER ?? 'sqlite').toLowerCase();

  if (driver === 'mysql') {
    if (!env.DATABASE_MYSQL_URL) {
      throw new Error('DATABASE_DRIVER=mysql requires DATABASE_MYSQL_URL to be set.');
    }
    return new MysqlStorageAdapter({ uri: env.DATABASE_MYSQL_URL });
  }

  if (driver === 'postgres' || driver === 'postgresql') {
    if (!env.DATABASE_POSTGRES_URL) {
      throw new Error('DATABASE_DRIVER=postgres requires DATABASE_POSTGRES_URL to be set.');
    }
    return new PostgresStorageAdapter({ connectionString: env.DATABASE_POSTGRES_URL });
  }

  if (driver !== 'sqlite') {
    throw new Error(`Unknown DATABASE_DRIVER "${driver}". Expected sqlite, mysql, or postgres.`);
  }

  const dbPath = resolve(env.DATABASE_SQLITE_PATH ?? './data/antilink.sqlite');
  mkdirSync(dirname(dbPath), { recursive: true });
  return new SqliteStorageAdapter({ filename: dbPath });
}
