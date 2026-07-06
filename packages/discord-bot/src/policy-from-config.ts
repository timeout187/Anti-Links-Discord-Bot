import type { PolicyConfig } from '@antilink-guard/core';
import type {
  AllowlistEntry,
  BlocklistEntry,
  GuildConfig,
  InviteRule,
} from '@antilink-guard/storage';

export interface PolicyInputs {
  guildConfig: GuildConfig;
  allowlist: AllowlistEntry[];
  blocklist: BlocklistEntry[];
  inviteRules: InviteRule[];
}

/**
 * No known-phishing domain list is populated here by design - same principle as
 * @antilink-guard/core: this framework never claims a threat-intel database it
 * doesn't have. Blocklisted domains come entirely from what a guild's admins add.
 */
export function buildPolicyConfig(inputs: PolicyInputs): PolicyConfig {
  const { guildConfig, allowlist, blocklist, inviteRules } = inputs;

  return {
    enabled: guildConfig.enabled,
    mode: guildConfig.mode,
    bypassRoleIds: guildConfig.bypassRoleIds,
    bypassUserIds: guildConfig.bypassUserIds,
    domainAllowlist: allowlist.map((entry) => entry.domain),
    domainBlocklist: blocklist.map((entry) => entry.domain),
    inviteAllowlist: inviteRules.map((rule) => rule.inviteCode),
    blockAllInvites: guildConfig.blockAllInvites,
    requireAllowlist: guildConfig.requireAllowlist,
    flagUnknownDomains: guildConfig.flagUnknownDomains,
    massMentionThreshold: guildConfig.massMentionThreshold,
  };
}
