import type { DetectionReason } from '../types/index.js';

/** Score contribution per detection reason. Higher = more severe. */
export const REASON_SEVERITY: Record<DetectionReason, number> = {
  ALLOWLIST_MATCH: -1000,
  UNKNOWN_DOMAIN: 5,
  NOT_IN_ALLOWLIST: 10,
  DISCORD_INVITE: 20,
  URL_SHORTENER: 15,
  PUNYCODE_SUSPICIOUS: 30,
  HOMOGLYPH_SUSPICIOUS: 30,
  REGEX_RULE_MATCH: 40,
  BLOCKLIST_MATCH: 50,
  KNOWN_PHISHING_DOMAIN: 100,
  MASS_MENTION_WITH_LINK: 25,
};

export const VERDICT_THRESHOLDS = {
  warn: 1,
  block: 30,
  quarantine: 60,
} as const;
