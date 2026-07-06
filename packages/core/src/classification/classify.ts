import type {
  DetectionReason,
  ExtractedLink,
  LinkClassification,
  PolicyConfig,
} from '../types/index.js';
import { DEFAULT_URL_SHORTENER_DOMAINS } from '../types/index.js';
import { toUnicodeHostname } from '../extraction/normalize.js';
import { hasMixedScriptConfusables, isPunycodeHostname } from './homoglyph.js';
import { REASON_SEVERITY } from './reasons.js';

function domainMatches(hostname: string, entry: string): boolean {
  const normalizedEntry = entry.toLowerCase().replace(/^\*\./, '');
  return hostname === normalizedEntry || hostname.endsWith(`.${normalizedEntry}`);
}

function matchesAnyDomain(hostname: string, list: readonly string[] | undefined): boolean {
  return (list ?? []).some((entry) => domainMatches(hostname, entry));
}

function matchesInviteAllowlist(link: ExtractedLink, list: readonly string[] | undefined): boolean {
  if (!link.inviteCode) return false;
  return (list ?? []).some((entry) => {
    const trimmed = entry.trim().toLowerCase();
    const code = trimmed.replace(
      /^https?:\/\/(www\.)?(discord\.gg|discord(?:app)?\.com\/invite)\//,
      '',
    );
    return code === link.inviteCode?.toLowerCase();
  });
}

export function classifyLink(
  link: ExtractedLink,
  policy: PolicyConfig,
  rawMessageText: string,
): LinkClassification {
  const reasons: DetectionReason[] = [];
  let score = 0;

  if (link.isDiscordInvite) {
    if (matchesInviteAllowlist(link, policy.inviteAllowlist)) {
      return { link, reasons: ['ALLOWLIST_MATCH'], score: REASON_SEVERITY.ALLOWLIST_MATCH };
    }
    reasons.push('DISCORD_INVITE');
    if (policy.blockAllInvites) {
      score += REASON_SEVERITY.DISCORD_INVITE;
    }
    return applyRegexRules(link, policy, rawMessageText, reasons, score);
  }

  if (matchesAnyDomain(link.hostname, policy.domainAllowlist)) {
    return { link, reasons: ['ALLOWLIST_MATCH'], score: REASON_SEVERITY.ALLOWLIST_MATCH };
  }

  if (matchesAnyDomain(link.hostname, policy.knownPhishingDomains)) {
    reasons.push('KNOWN_PHISHING_DOMAIN');
    score += REASON_SEVERITY.KNOWN_PHISHING_DOMAIN;
  }

  if (matchesAnyDomain(link.hostname, policy.domainBlocklist)) {
    reasons.push('BLOCKLIST_MATCH');
    score += REASON_SEVERITY.BLOCKLIST_MATCH;
  }

  const shortenerDomains = policy.urlShortenerDomains ?? DEFAULT_URL_SHORTENER_DOMAINS;
  if (matchesAnyDomain(link.hostname, shortenerDomains)) {
    reasons.push('URL_SHORTENER');
    score += REASON_SEVERITY.URL_SHORTENER;
  }

  if (isPunycodeHostname(link.hostname)) {
    reasons.push('PUNYCODE_SUSPICIOUS');
    score += REASON_SEVERITY.PUNYCODE_SUSPICIOUS;
  }

  const unicodeHostname = toUnicodeHostname(link.hostname);
  if (hasMixedScriptConfusables(unicodeHostname)) {
    reasons.push('HOMOGLYPH_SUSPICIOUS');
    score += REASON_SEVERITY.HOMOGLYPH_SUSPICIOUS;
  }

  const hasHardMatch = reasons.some((r) =>
    (
      [
        'KNOWN_PHISHING_DOMAIN',
        'BLOCKLIST_MATCH',
        'URL_SHORTENER',
        'PUNYCODE_SUSPICIOUS',
        'HOMOGLYPH_SUSPICIOUS',
      ] as const
    ).includes(r as never),
  );

  if (!hasHardMatch) {
    if (policy.requireAllowlist) {
      reasons.push('NOT_IN_ALLOWLIST');
      score += REASON_SEVERITY.NOT_IN_ALLOWLIST;
    } else if (policy.flagUnknownDomains) {
      reasons.push('UNKNOWN_DOMAIN');
      score += REASON_SEVERITY.UNKNOWN_DOMAIN;
    }
  }

  return applyRegexRules(link, policy, rawMessageText, reasons, score);
}

function applyRegexRules(
  link: ExtractedLink,
  policy: PolicyConfig,
  rawMessageText: string,
  reasons: DetectionReason[],
  score: number,
): LinkClassification {
  let finalScore = score;
  const finalReasons = [...reasons];

  for (const rule of policy.regexRules ?? []) {
    try {
      const regex = new RegExp(rule.pattern, rule.flags ?? 'i');
      const target = rule.target === 'message' ? rawMessageText : link.normalizedUrl;
      if (regex.test(target)) {
        finalReasons.push('REGEX_RULE_MATCH');
        finalScore += rule.score ?? REASON_SEVERITY.REGEX_RULE_MATCH;
      }
    } catch {
      // Invalid user-supplied regex is ignored rather than crashing the scan.
    }
  }

  return { link, reasons: finalReasons, score: finalScore };
}
