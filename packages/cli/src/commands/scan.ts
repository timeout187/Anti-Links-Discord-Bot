import type { Command } from 'commander';
import { evaluateMessage } from '@antilink-guard/core';
import { loadPolicyConfig } from '../load-policy.js';
import { formatScanResult } from '../format.js';

interface ScanOptions {
  config?: string;
  json?: boolean;
}

export function registerScanCommand(program: Command): void {
  program
    .command('scan <message>')
    .description('Scan a message string through the detection and policy engine')
    .option('-c, --config <path>', 'path to antilink.config.json')
    .option('--json', 'print raw JSON instead of a formatted report')
    .action(async (message: string, options: ScanOptions) => {
      const policy = await loadPolicyConfig(options.config);
      const result = evaluateMessage(
        message,
        { guildId: 'cli', channelId: 'cli', authorId: 'cli' },
        policy,
      );

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatScanResult(result));
      }

      if (result.verdict === 'BLOCK' || result.verdict === 'QUARANTINE') {
        process.exitCode = 1;
      }
    });
}
