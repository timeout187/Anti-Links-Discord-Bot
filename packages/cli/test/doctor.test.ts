import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checkDiscordToken,
  checkNodeVersion,
  checkSqliteBinding,
  checkSqliteDirectoryWritable,
} from '../src/commands/doctor.js';

describe('doctor checks', () => {
  it('checkNodeVersion passes on the Node version running the tests (>=20)', () => {
    const result = checkNodeVersion();
    expect(result.status).toBe('pass');
  });

  it('checkSqliteBinding passes when better-sqlite3 loads', () => {
    const result = checkSqliteBinding();
    expect(result.status).toBe('pass');
  });

  describe('checkDiscordToken', () => {
    const original = process.env.DISCORD_TOKEN;

    afterEach(() => {
      if (original === undefined) delete process.env.DISCORD_TOKEN;
      else process.env.DISCORD_TOKEN = original;
    });

    it('warns when DISCORD_TOKEN is unset', () => {
      delete process.env.DISCORD_TOKEN;
      expect(checkDiscordToken().status).toBe('warn');
    });

    it('warns when DISCORD_TOKEN looks like a placeholder', () => {
      process.env.DISCORD_TOKEN = 'your-token-here';
      expect(checkDiscordToken().status).toBe('warn');
    });

    it('passes when DISCORD_TOKEN looks like a real token', () => {
      process.env.DISCORD_TOKEN = 'x'.repeat(59);
      expect(checkDiscordToken().status).toBe('pass');
    });
  });

  describe('checkSqliteDirectoryWritable', () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'antilink-doctor-'));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it('passes when the directory is writable', async () => {
      const result = await checkSqliteDirectoryWritable(join(dir, 'antilink.sqlite'));
      expect(result.status).toBe('pass');
    });

    it('fails when the directory does not exist', async () => {
      const result = await checkSqliteDirectoryWritable(
        join(dir, 'missing-subdir', 'antilink.sqlite'),
      );
      expect(result.status).toBe('fail');
    });
  });
});
