import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { Command } from 'commander';
import { DEFAULT_CONFIG_FILENAME } from '../load-policy.js';
import { EXAMPLE_POLICY_CONFIG } from '../policy-config-schema.js';

const ENV_TEMPLATE = `# AntiLink Guard OSS - environment configuration
# Copy this file's values into your real .env and never commit that file.

# Required: your Discord bot token (Developer Portal -> Bot -> Token)
DISCORD_TOKEN=

# Optional: comma-separated Discord application/guild IDs to restrict slash-command
# registration to, useful for local development. Leave blank to register globally.
DISCORD_GUILD_IDS=

# Storage: defaults to a local SQLite file. See docs/self-hosting.md for
# MySQL/PostgreSQL connection strings.
DATABASE_DRIVER=sqlite
DATABASE_SQLITE_PATH=./antilink.sqlite
`;

interface InitOptions {
  force?: boolean;
  dir?: string;
}

async function writeIfAbsent(path: string, content: string, force: boolean): Promise<string> {
  if (!force && existsSync(path)) {
    return `skipped (already exists): ${path}`;
  }
  await writeFile(path, content, 'utf8');
  return `wrote ${path}`;
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Scaffold a .env and antilink.config.json in the current directory')
    .option('-f, --force', 'overwrite existing files')
    .option('-d, --dir <path>', 'directory to scaffold into', '.')
    .action(async (options: InitOptions) => {
      const dir = options.dir ?? '.';
      const force = options.force ?? false;

      const envResult = await writeIfAbsent(`${dir}/.env.example`, ENV_TEMPLATE, force);
      const configResult = await writeIfAbsent(
        `${dir}/${DEFAULT_CONFIG_FILENAME}`,
        `${JSON.stringify(EXAMPLE_POLICY_CONFIG, null, 2)}\n`,
        force,
      );

      console.log(envResult);
      console.log(configResult);
      console.log('\nNext steps:');
      console.log('  1. Copy .env.example to .env and fill in DISCORD_TOKEN.');
      console.log(`  2. Adjust ${DEFAULT_CONFIG_FILENAME} to your server's rules.`);
      console.log('  3. Run `antilink doctor` to verify your setup.');
    });
}
