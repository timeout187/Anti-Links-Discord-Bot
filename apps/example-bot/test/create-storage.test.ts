import { describe, expect, it, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MysqlStorageAdapter,
  PostgresStorageAdapter,
  SqliteStorageAdapter,
} from '@antilink-guard/storage';
import { createStorageFromEnv } from '../src/create-storage.js';

describe('createStorageFromEnv', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('defaults to SQLite when DATABASE_DRIVER is unset', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'example-bot-storage-'));
    tempDirs.push(dir);

    const storage = createStorageFromEnv({ DATABASE_SQLITE_PATH: join(dir, 'db.sqlite') });
    expect(storage).toBeInstanceOf(SqliteStorageAdapter);
    await storage.close();
  });

  it('creates the SQLite data directory if it does not exist yet', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'example-bot-storage-'));
    tempDirs.push(dir);
    const dbPath = join(dir, 'nested', 'subdir', 'db.sqlite');

    const storage = createStorageFromEnv({
      DATABASE_DRIVER: 'sqlite',
      DATABASE_SQLITE_PATH: dbPath,
    });
    await storage.init();
    await storage.close();
  });

  it('creates a MysqlStorageAdapter when configured', () => {
    const storage = createStorageFromEnv({
      DATABASE_DRIVER: 'mysql',
      DATABASE_MYSQL_URL: 'mysql://user:pass@localhost:3306/db',
    });
    expect(storage).toBeInstanceOf(MysqlStorageAdapter);
  });

  it('throws when DATABASE_DRIVER=mysql is missing its URL', () => {
    expect(() => createStorageFromEnv({ DATABASE_DRIVER: 'mysql' })).toThrow(/DATABASE_MYSQL_URL/);
  });

  it('creates a PostgresStorageAdapter when configured', () => {
    const storage = createStorageFromEnv({
      DATABASE_DRIVER: 'postgres',
      DATABASE_POSTGRES_URL: 'postgres://user:pass@localhost:5432/db',
    });
    expect(storage).toBeInstanceOf(PostgresStorageAdapter);
  });

  it('accepts "postgresql" as an alias for the driver name', () => {
    const storage = createStorageFromEnv({
      DATABASE_DRIVER: 'postgresql',
      DATABASE_POSTGRES_URL: 'postgres://user:pass@localhost:5432/db',
    });
    expect(storage).toBeInstanceOf(PostgresStorageAdapter);
  });

  it('throws when DATABASE_DRIVER=postgres is missing its URL', () => {
    expect(() => createStorageFromEnv({ DATABASE_DRIVER: 'postgres' })).toThrow(
      /DATABASE_POSTGRES_URL/,
    );
  });

  it('throws on an unrecognized driver name', () => {
    expect(() => createStorageFromEnv({ DATABASE_DRIVER: 'mongodb' })).toThrow(
      /Unknown DATABASE_DRIVER/,
    );
  });
});
