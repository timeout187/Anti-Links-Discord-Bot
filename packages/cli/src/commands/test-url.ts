import type { Command } from 'commander';
import { classifyLink, extractLinks, VERDICT_THRESHOLDS } from '@antilink-guard/core';
import { loadPolicyConfig } from '../load-policy.js';

interface TestUrlOptions {
  config?: string;
  json?: boolean;
}

export function registerTestUrlCommand(program: Command): void {
  program
    .command('test-url <url>')
    .description('Classify a single URL without running the full message pipeline')
    .option('-c, --config <path>', 'path to antilink.config.json')
    .option('--json', 'print raw JSON instead of a formatted report')
    .action(async (url: string, options: TestUrlOptions) => {
      const policy = await loadPolicyConfig(options.config);
      const [link] = extractLinks(url);

      if (!link) {
        console.error(`Could not parse "${url}" as a URL.`);
        process.exitCode = 1;
        return;
      }

      const classification = classifyLink(link, policy, url);

      if (options.json) {
        console.log(JSON.stringify(classification, null, 2));
      } else {
        const reasons =
          classification.reasons.length > 0 ? classification.reasons.join(', ') : 'none';
        console.log(`URL:     ${classification.link.normalizedUrl}`);
        console.log(`Score:   ${classification.score}`);
        console.log(`Reasons: ${reasons}`);
      }

      if (classification.score >= VERDICT_THRESHOLDS.block) {
        process.exitCode = 1;
      }
    });
}
