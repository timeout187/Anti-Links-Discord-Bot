import { readFile } from 'node:fs/promises';
import type { Command } from 'commander';
import {
  SqliteStorageAdapter,
  importGuildConfigBundle,
  parseConfigBundle,
} from '@antilink-guard/storage';

interface ImportConfigOptions {
  db: string;
  merge?: boolean;
}

export function registerImportConfigCommand(program: Command): void {
  program
    .command('import-config <file>')
    .description('Import a config bundle previously produced by export-config')
    .option('--db <path>', 'path to the SQLite database file', './antilink.sqlite')
    .option('--merge', 'merge into existing allow/block/invite lists instead of replacing them')
    .action(async (file: string, options: ImportConfigOptions) => {
      const raw = await readFile(file, 'utf8');
      const bundle = parseConfigBundle(JSON.parse(raw));

      const adapter = new SqliteStorageAdapter({ filename: options.db });
      await adapter.init();

      try {
        await importGuildConfigBundle(adapter, bundle, {
          replaceExisting: !(options.merge ?? false),
        });
        console.error(`Imported config for guild ${bundle.guildConfig.guildId} from ${file}`);
      } finally {
        await adapter.close();
      }
    });
}
