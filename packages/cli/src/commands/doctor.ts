import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { access, constants as fsConstants } from 'node:fs/promises';
import type { Command } from 'commander';
import Database from 'better-sqlite3';
import { DEFAULT_CONFIG_FILENAME } from '../load-policy.js';
import { policyConfigFileSchema } from '../policy-config-schema.js';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  message: string;
}

export function checkNodeVersion(): CheckResult {
  const [major] = process.versions.node.split('.').map(Number);
  if (major !== undefined && major >= 20) {
    return { name: 'Node.js version', status: 'pass', message: `v${process.versions.node}` };
  }
  return {
    name: 'Node.js version',
    status: 'fail',
    message: `v${process.versions.node} - AntiLink Guard OSS requires Node.js 20 or newer`,
  };
}

export function checkEnvFile(): CheckResult {
  if (existsSync('.env')) {
    return { name: '.env file', status: 'pass', message: 'found' };
  }
  return {
    name: '.env file',
    status: 'warn',
    message: 'not found - run `antilink init` and copy .env.example to .env',
  };
}

export function checkDiscordToken(): CheckResult {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    return { name: 'DISCORD_TOKEN', status: 'warn', message: 'not set in the current environment' };
  }
  if (token.length < 40) {
    return {
      name: 'DISCORD_TOKEN',
      status: 'warn',
      message: 'set, but shorter than a real Discord bot token - check for a placeholder value',
    };
  }
  return { name: 'DISCORD_TOKEN', status: 'pass', message: 'set' };
}

export async function checkPolicyConfigFile(): Promise<CheckResult> {
  if (!existsSync(DEFAULT_CONFIG_FILENAME)) {
    return {
      name: DEFAULT_CONFIG_FILENAME,
      status: 'warn',
      message: 'not found - built-in defaults will be used',
    };
  }
  try {
    const raw = await readFile(DEFAULT_CONFIG_FILENAME, 'utf8');
    policyConfigFileSchema.parse(JSON.parse(raw));
    return { name: DEFAULT_CONFIG_FILENAME, status: 'pass', message: 'found and valid' };
  } catch (error) {
    return {
      name: DEFAULT_CONFIG_FILENAME,
      status: 'fail',
      message: `invalid: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function checkSqliteBinding(): CheckResult {
  try {
    const db = new Database(':memory:');
    db.exec('SELECT 1');
    db.close();
    return {
      name: 'better-sqlite3 native binding',
      status: 'pass',
      message: 'loaded successfully',
    };
  } catch (error) {
    return {
      name: 'better-sqlite3 native binding',
      status: 'fail',
      message: `failed to load: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function checkSqliteDirectoryWritable(dbPath: string): Promise<CheckResult> {
  const dir = dirname(dbPath) || '.';
  try {
    await access(dir, fsConstants.W_OK);
    return { name: 'SQLite directory writable', status: 'pass', message: dir };
  } catch {
    return {
      name: 'SQLite directory writable',
      status: 'fail',
      message: `no write permission for ${dir}`,
    };
  }
}

const STATUS_ICON: Record<CheckStatus, string> = { pass: '✓', warn: '!', fail: '✗' };

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Run offline health checks against your local AntiLink Guard OSS setup')
    .option('--db <path>', 'path to the SQLite database file to check', './antilink.sqlite')
    .action(async (options: { db: string }) => {
      const checks: CheckResult[] = [
        checkNodeVersion(),
        checkEnvFile(),
        checkDiscordToken(),
        await checkPolicyConfigFile(),
        checkSqliteBinding(),
        await checkSqliteDirectoryWritable(options.db),
      ];

      for (const check of checks) {
        console.log(`[${STATUS_ICON[check.status]}] ${check.name}: ${check.message}`);
      }

      const hasFailure = checks.some((c) => c.status === 'fail');
      if (hasFailure) {
        console.log('\nOne or more checks failed.');
        process.exitCode = 1;
      } else {
        console.log('\nAll checks passed (warnings, if any, are non-blocking).');
      }
    });
}
