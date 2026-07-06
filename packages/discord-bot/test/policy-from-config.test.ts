import { describe, expect, it } from 'vitest';
import { createDefaultGuildConfig } from '@antilink-guard/storage';
import { buildPolicyConfig } from '../src/policy-from-config.js';

describe('buildPolicyConfig', () => {
  it('maps guild config fields directly onto the policy', () => {
    const guildConfig = {
      ...createDefaultGuildConfig('guild-1'),
      enabled: false,
      mode: 'timeout' as const,
      blockAllInvites: true,
      requireAllowlist: true,
      flagUnknownDomains: true,
      massMentionThreshold: 7,
      bypassRoleIds: ['role-1'],
      bypassUserIds: ['user-1'],
    };

    const policy = buildPolicyConfig({
      guildConfig,
      allowlist: [],
      blocklist: [],
      inviteRules: [],
    });

    expect(policy.enabled).toBe(false);
    expect(policy.mode).toBe('timeout');
    expect(policy.blockAllInvites).toBe(true);
    expect(policy.requireAllowlist).toBe(true);
    expect(policy.flagUnknownDomains).toBe(true);
    expect(policy.massMentionThreshold).toBe(7);
    expect(policy.bypassRoleIds).toEqual(['role-1']);
    expect(policy.bypassUserIds).toEqual(['user-1']);
  });

  it('maps allowlist/blocklist entries to their domain strings', () => {
    const policy = buildPolicyConfig({
      guildConfig: createDefaultGuildConfig('guild-1'),
      allowlist: [
        { id: '1', guildId: 'guild-1', domain: 'good.com', addedBy: 'u', createdAt: new Date() },
      ],
      blocklist: [
        { id: '2', guildId: 'guild-1', domain: 'bad.com', addedBy: 'u', createdAt: new Date() },
      ],
      inviteRules: [],
    });

    expect(policy.domainAllowlist).toEqual(['good.com']);
    expect(policy.domainBlocklist).toEqual(['bad.com']);
  });

  it('maps invite rules to invite codes', () => {
    const policy = buildPolicyConfig({
      guildConfig: createDefaultGuildConfig('guild-1'),
      allowlist: [],
      blocklist: [],
      inviteRules: [
        { id: '1', guildId: 'guild-1', inviteCode: 'abc123', addedBy: 'u', createdAt: new Date() },
      ],
    });

    expect(policy.inviteAllowlist).toEqual(['abc123']);
  });

  it('never populates a known-phishing domain list on its own', () => {
    const policy = buildPolicyConfig({
      guildConfig: createDefaultGuildConfig('guild-1'),
      allowlist: [],
      blocklist: [],
      inviteRules: [],
    });

    expect(policy.knownPhishingDomains).toBeUndefined();
  });
});
