import { writeFile } from 'node:fs/promises';
import type { Command } from 'commander';
import { SqliteStorageAdapter, exportGuildConfigBundle } from '@antilink-guard/storage';

interface ExportConfigOptions {
  guild: string;
  db: string;
  out?: string;
}

export function registerExportConfigCommand(program: Command): void {
  program
    .command('export-config')
    .description("Export a guild's configuration, allowlist, blocklist, and invite rules as JSON")
    .requiredOption('-g, --guild <id>', 'Discord guild (server) ID to export')
    .option('--db <path>', 'path to the SQLite database file', './antilink.sqlite')
    .option('-o, --out <path>', 'write to a file instead of stdout')
    .action(async (options: ExportConfigOptions) => {
      const adapter = new SqliteStorageAdapter({ filename: options.db });
      await adapter.init();

      try {
        const bundle = await exportGuildConfigBundle(adapter, options.guild);
        const json = `${JSON.stringify(bundle, null, 2)}\n`;

        if (options.out) {
          await writeFile(options.out, json, 'utf8');
          console.error(`Wrote config bundle for guild ${options.guild} to ${options.out}`);
        } else {
          process.stdout.write(json);
        }
      } finally {
        await adapter.close();
      }
    });
}
