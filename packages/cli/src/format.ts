import type { ScanResult } from '@antilink-guard/core';

const VERDICT_LABEL: Record<ScanResult['verdict'], string> = {
  ALLOW: 'ALLOW',
  WARN: 'WARN',
  BLOCK: 'BLOCK',
  QUARANTINE: 'QUARANTINE',
};

export function formatScanResult(result: ScanResult): string {
  const lines = [
    `Verdict: ${VERDICT_LABEL[result.verdict]}`,
    `Action:  ${result.action}`,
    `Score:   ${result.score}`,
  ];

  if (result.bypassed) {
    lines.push('Bypassed: true (role, user, or channel exemption)');
  }

  if (result.reasons.length > 0) {
    lines.push(`Reasons: ${result.reasons.join(', ')}`);
  }

  if (result.matchedLinks.length > 0) {
    lines.push('Links:');
    for (const match of result.matchedLinks) {
      const reasons = match.reasons.length > 0 ? match.reasons.join(', ') : 'none';
      lines.push(`  - ${match.link.normalizedUrl} (score ${match.score}, reasons: ${reasons})`);
    }
  }

  return lines.join('\n');
}
