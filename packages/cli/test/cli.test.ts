import { describe, expect, it, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProgram } from '../src/index.js';

async function run(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  process.exitCode = undefined;

  let stdout = '';
  let stderr = '';
  try {
    await createProgram().parseAsync(['node', 'antilink', ...args]);
  } finally {
    stdout = [
      ...stdoutSpy.mock.calls.map((c) => String(c[0])),
      ...logSpy.mock.calls.map((c) => c.join(' ')),
    ].join('\n');
    stderr = [
      ...stderrSpy.mock.calls.map((c) => String(c[0])),
      ...errorSpy.mock.calls.map((c) => c.join(' ')),
    ].join('\n');
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }

  const exitCode = process.exitCode ?? 0;
  process.exitCode = undefined;
  return { stdout, stderr, exitCode };
}

describe('antilink CLI', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'antilink-cli-e2e-'));
    tempDirs.push(dir);
    return dir;
  }

  it('scan reports ALLOW for a clean message with no config file', async () => {
    const { stdout, exitCode } = await run(['scan', 'hello world', '--json']);
    const result = JSON.parse(stdout);
    expect(result.verdict).toBe('ALLOW');
    expect(exitCode).toBe(0);
  });

  it('scan exits non-zero for a message hitting a blocklisted domain', async () => {
    const dir = await makeTempDir();
    const configPath = join(dir, 'antilink.config.json');
    await writeFile(
      configPath,
      JSON.stringify({ mode: 'delete', domainBlocklist: ['bad-site.com'] }),
      'utf8',
    );

    const { stdout, exitCode } = await run([
      'scan',
      'check out https://bad-site.com',
      '--config',
      configPath,
      '--json',
    ]);
    const result = JSON.parse(stdout);
    expect(result.verdict).toBe('BLOCK');
    expect(exitCode).toBe(1);
  });

  it('test-url classifies a single URL', async () => {
    const { stdout, exitCode } = await run(['test-url', 'https://bit.ly/abc', '--json']);
    const result = JSON.parse(stdout);
    expect(result.reasons).toContain('URL_SHORTENER');
    expect(exitCode).toBe(0);
  });

  it('init scaffolds .env.example and antilink.config.json without overwriting existing files', async () => {
    const dir = await makeTempDir();
    await run(['init', '--dir', dir]);

    expect(existsSync(join(dir, '.env.example'))).toBe(true);
    expect(existsSync(join(dir, 'antilink.config.json'))).toBe(true);

    await writeFile(join(dir, 'antilink.config.json'), '{"custom":true}', 'utf8');
    await run(['init', '--dir', dir]);
    const content = await readFile(join(dir, 'antilink.config.json'), 'utf8');
    expect(content).toBe('{"custom":true}');
  });

  it('doctor runs all checks and exits 0 in a healthy environment', async () => {
    const dir = await makeTempDir();
    const { exitCode } = await run(['doctor', '--db', join(dir, 'antilink.sqlite')]);
    expect(exitCode).toBe(0);
  });

  it('exports a guild config bundle then imports it into a fresh database', async () => {
    const dir = await makeTempDir();
    const sourceDb = join(dir, 'source.sqlite');
    const destDb = join(dir, 'dest.sqlite');
    const bundlePath = join(dir, 'bundle.json');

    await run(['export-config', '--guild', 'guild-123', '--db', sourceDb, '--out', bundlePath]);

    const bundleContent = await readFile(bundlePath, 'utf8');
    const bundle = JSON.parse(bundleContent);
    expect(bundle.guildConfig.guildId).toBe('guild-123');

    await run(['import-config', bundlePath, '--db', destDb]);

    const { SqliteStorageAdapter } = await import('@antilink-guard/storage');
    const adapter = new SqliteStorageAdapter({ filename: destDb });
    await adapter.init();
    const imported = await adapter.getGuildConfig('guild-123');
    await adapter.close();

    expect(imported?.guildId).toBe('guild-123');
  });
});
