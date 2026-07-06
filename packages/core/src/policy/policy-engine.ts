import type {
  DetectionReason,
  EnforcementMode,
  LinkClassification,
  ModerationActionType,
  PolicyConfig,
  ScanContext,
  ScanResult,
  Verdict,
} from '../types/index.js';
import { extractLinks } from '../extraction/extract-links.js';
import { classifyLink } from '../classification/classify.js';
import { REASON_SEVERITY, VERDICT_THRESHOLDS } from '../classification/reasons.js';

function emptyResult(bypassed = false): ScanResult {
  return { verdict: 'ALLOW', action: 'NONE', score: 0, reasons: [], matchedLinks: [], bypassed };
}

function isBypassed(context: ScanContext, policy: PolicyConfig): boolean {
  const roleBypass = (context.authorRoleIds ?? []).some((roleId) =>
    (policy.bypassRoleIds ?? []).includes(roleId),
  );
  const userBypass = (policy.bypassUserIds ?? []).includes(context.authorId);
  return roleBypass || userBypass;
}

function resolveChannelMode(
  context: ScanContext,
  policy: PolicyConfig,
): EnforcementMode | 'exempt' {
  const rule = (policy.channelRules ?? []).find((r) => r.channelId === context.channelId);
  return rule?.mode ?? policy.mode;
}

function scoreToVerdict(score: number): Verdict {
  if (score >= VERDICT_THRESHOLDS.quarantine) return 'QUARANTINE';
  if (score >= VERDICT_THRESHOLDS.block) return 'BLOCK';
  if (score >= VERDICT_THRESHOLDS.warn) return 'WARN';
  return 'ALLOW';
}

function verdictToAction(verdict: Verdict, mode: EnforcementMode): ModerationActionType {
  if (verdict === 'ALLOW') return 'NONE';
  if (verdict === 'WARN') return 'LOG';
  // verdict is BLOCK or QUARANTINE from here - `mode` decides the ceiling.
  if (mode === 'log') return 'LOG';
  if (mode === 'warn') return 'WARN';
  if (mode === 'delete') return 'DELETE';
  // mode === 'timeout'
  return verdict === 'QUARANTINE' ? 'TIMEOUT' : 'DELETE';
}

export function evaluateMessage(
  rawText: string,
  context: ScanContext,
  policy: PolicyConfig,
): ScanResult {
  if (!policy.enabled) return emptyResult();
  if (isBypassed(context, policy)) return emptyResult(true);

  const channelMode = resolveChannelMode(context, policy);
  if (channelMode === 'exempt') return emptyResult(true);

  const links = extractLinks(rawText);
  if (links.length === 0) return emptyResult();

  const matchedLinks: LinkClassification[] = links.map((link) =>
    classifyLink(link, policy, rawText),
  );

  let score = Math.max(0, ...matchedLinks.map((m) => m.score));
  const reasons = new Set<DetectionReason>();
  for (const m of matchedLinks) for (const r of m.reasons) reasons.add(r);

  const threshold = policy.massMentionThreshold ?? 0;
  const hasRiskyLink = matchedLinks.some((m) => m.score > 0);
  if (threshold > 0 && (context.mentionCount ?? 0) >= threshold && hasRiskyLink) {
    reasons.add('MASS_MENTION_WITH_LINK');
    score += REASON_SEVERITY.MASS_MENTION_WITH_LINK;
  }

  const verdict = scoreToVerdict(score);
  const action = verdictToAction(verdict, channelMode as EnforcementMode);

  return {
    verdict,
    action,
    score,
    reasons: Array.from(reasons),
    matchedLinks,
    bypassed: false,
  };
}
