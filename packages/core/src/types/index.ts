export type Verdict = 'ALLOW' | 'WARN' | 'BLOCK' | 'QUARANTINE';

export type DetectionReason =
  | 'DISCORD_INVITE'
  | 'UNKNOWN_DOMAIN'
  | 'KNOWN_PHISHING_DOMAIN'
  | 'URL_SHORTENER'
  | 'PUNYCODE_SUSPICIOUS'
  | 'HOMOGLYPH_SUSPICIOUS'
  | 'MASS_MENTION_WITH_LINK'
  | 'BLOCKLIST_MATCH'
  | 'ALLOWLIST_MATCH'
  | 'REGEX_RULE_MATCH'
  | 'NOT_IN_ALLOWLIST';

export type EnforcementMode = 'log' | 'delete' | 'timeout';

export type ModerationActionType = 'NONE' | 'LOG' | 'DELETE' | 'TIMEOUT';

export interface ExtractedLink {
  /** The exact substring matched in the de-obfuscated text. */
  raw: string;
  /** Normalized, absolute URL (scheme + lowercase host + stripped tracking params). */
  normalizedUrl: string;
  hostname: string;
  isMarkdown: boolean;
  isDefanged: boolean;
  isDiscordInvite: boolean;
  inviteCode?: string;
}

export interface LinkClassification {
  link: ExtractedLink;
  reasons: DetectionReason[];
  score: number;
}

export interface RegexRule {
  id: string;
  pattern: string;
  flags?: string;
  /** Score contribution when this rule matches. Defaults to 40. */
  score?: number;
  /** What the rule tests against. Defaults to 'url'. */
  target?: 'url' | 'message';
}

export interface ChannelRule {
  channelId: string;
  /** 'exempt' disables scanning entirely in this channel. */
  mode: 'exempt' | EnforcementMode;
}

export interface PolicyConfig {
  enabled: boolean;
  mode: EnforcementMode;
  channelRules?: ChannelRule[];
  bypassRoleIds?: string[];
  bypassUserIds?: string[];
  domainAllowlist?: string[];
  domainBlocklist?: string[];
  knownPhishingDomains?: string[];
  inviteAllowlist?: string[];
  blockAllInvites?: boolean;
  regexRules?: RegexRule[];
  urlShortenerDomains?: string[];
  /** Only ALLOW links whose domain is explicitly allowlisted. Off by default. */
  requireAllowlist?: boolean;
  /** Flag domains never seen on the allow/block lists with a low-severity WARN. */
  flagUnknownDomains?: boolean;
  /** Number of user mentions in a message (with a link) that triggers MASS_MENTION_WITH_LINK. 0 disables. */
  massMentionThreshold?: number;
}

export interface ScanContext {
  guildId: string;
  channelId: string;
  authorId: string;
  authorRoleIds?: string[];
  isBot?: boolean;
  mentionCount?: number;
}

export interface ScanResult {
  verdict: Verdict;
  action: ModerationActionType;
  score: number;
  reasons: DetectionReason[];
  matchedLinks: LinkClassification[];
  bypassed: boolean;
}

export const DEFAULT_URL_SHORTENER_DOMAINS: readonly string[] = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'is.gd',
  'buff.ly',
  'ow.ly',
  'rebrand.ly',
  'cutt.ly',
  'shorturl.at',
  'rb.gy',
  'tiny.cc',
  'lnkd.in',
  'v.gd',
];
