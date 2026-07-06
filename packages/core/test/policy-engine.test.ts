import { describe, expect, it } from 'vitest';
import { evaluateMessage } from '../src/policy/policy-engine.js';
import type { PolicyConfig, ScanContext } from '../src/types/index.js';

const context: ScanContext = {
  guildId: 'guild-1',
  channelId: 'channel-1',
  authorId: 'user-1',
  authorRoleIds: [],
};

const basePolicy: PolicyConfig = { enabled: true, mode: 'delete' };

describe('evaluateMessage', () => {
  it('allows a message with no links', () => {
    const result = evaluateMessage('hello world', context, basePolicy);
    expect(result.verdict).toBe('ALLOW');
    expect(result.action).toBe('NONE');
    expect(result.bypassed).toBe(false);
  });

  it('does nothing at all when the policy is disabled', () => {
    const result = evaluateMessage('https://bad-site.com', context, {
      ...basePolicy,
      enabled: false,
      domainBlocklist: ['bad-site.com'],
    });
    expect(result.verdict).toBe('ALLOW');
    expect(result.reasons).toHaveLength(0);
  });

  it('bypasses scanning for a whitelisted role', () => {
    const result = evaluateMessage(
      'https://bad-site.com',
      { ...context, authorRoleIds: ['mod-role'] },
      { ...basePolicy, bypassRoleIds: ['mod-role'], domainBlocklist: ['bad-site.com'] },
    );
    expect(result.bypassed).toBe(true);
    expect(result.verdict).toBe('ALLOW');
  });

  it('bypasses scanning for a whitelisted user', () => {
    const result = evaluateMessage('https://bad-site.com', context, {
      ...basePolicy,
      bypassUserIds: ['user-1'],
      domainBlocklist: ['bad-site.com'],
    });
    expect(result.bypassed).toBe(true);
  });

  it('exempts a channel configured with mode "exempt"', () => {
    const result = evaluateMessage('https://bad-site.com', context, {
      ...basePolicy,
      channelRules: [{ channelId: 'channel-1', mode: 'exempt' }],
      domainBlocklist: ['bad-site.com'],
    });
    expect(result.bypassed).toBe(true);
  });

  it('returns WARN for a low-severity unknown domain when flagUnknownDomains is on', () => {
    const result = evaluateMessage('https://example.com', context, {
      ...basePolicy,
      flagUnknownDomains: true,
    });
    expect(result.verdict).toBe('WARN');
    expect(result.action).toBe('LOG');
  });

  it('returns BLOCK and a DELETE action for a blocklisted domain in delete mode', () => {
    const result = evaluateMessage('https://bad-site.com', context, {
      ...basePolicy,
      domainBlocklist: ['bad-site.com'],
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.action).toBe('DELETE');
  });

  it('returns QUARANTINE for a known-phishing domain', () => {
    const result = evaluateMessage('https://phish.example', context, {
      ...basePolicy,
      knownPhishingDomains: ['phish.example'],
    });
    expect(result.verdict).toBe('QUARANTINE');
  });

  it('caps the action at LOG when mode is "log", even for a QUARANTINE verdict', () => {
    const result = evaluateMessage('https://phish.example', context, {
      ...basePolicy,
      mode: 'log',
      knownPhishingDomains: ['phish.example'],
    });
    expect(result.verdict).toBe('QUARANTINE');
    expect(result.action).toBe('LOG');
  });

  it('escalates a QUARANTINE verdict to TIMEOUT only in timeout mode', () => {
    const result = evaluateMessage('https://phish.example', context, {
      ...basePolicy,
      mode: 'timeout',
      knownPhishingDomains: ['phish.example'],
    });
    expect(result.action).toBe('TIMEOUT');
  });

  it('returns a WARN action (not DELETE) for a BLOCK verdict in warn mode', () => {
    const result = evaluateMessage('https://bad-site.com', context, {
      ...basePolicy,
      mode: 'warn',
      domainBlocklist: ['bad-site.com'],
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.action).toBe('WARN');
  });

  it('returns a WARN action for a QUARANTINE verdict in warn mode (no timeout)', () => {
    const result = evaluateMessage('https://phish.example', context, {
      ...basePolicy,
      mode: 'warn',
      knownPhishingDomains: ['phish.example'],
    });
    expect(result.verdict).toBe('QUARANTINE');
    expect(result.action).toBe('WARN');
  });

  it('still returns a plain LOG action for a WARN-severity verdict in warn mode', () => {
    const result = evaluateMessage('https://example.com', context, {
      ...basePolicy,
      mode: 'warn',
      flagUnknownDomains: true,
    });
    expect(result.verdict).toBe('WARN');
    expect(result.action).toBe('LOG');
  });

  it('only deletes (does not time out) a plain BLOCK verdict in timeout mode', () => {
    const result = evaluateMessage('https://bad-site.com', context, {
      ...basePolicy,
      mode: 'timeout',
      domainBlocklist: ['bad-site.com'],
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.action).toBe('DELETE');
  });

  it('adds MASS_MENTION_WITH_LINK when mention count meets the threshold alongside a risky link', () => {
    const result = evaluateMessage(
      'https://bad-site.com',
      { ...context, mentionCount: 10 },
      {
        ...basePolicy,
        domainBlocklist: ['bad-site.com'],
        massMentionThreshold: 5,
      },
    );
    expect(result.reasons).toContain('MASS_MENTION_WITH_LINK');
  });

  it('does not add MASS_MENTION_WITH_LINK when there is no risky link', () => {
    const result = evaluateMessage(
      'https://example.com',
      { ...context, mentionCount: 10 },
      {
        ...basePolicy,
        massMentionThreshold: 5,
      },
    );
    expect(result.reasons).not.toContain('MASS_MENTION_WITH_LINK');
  });

  it('allows a message whose only link is on the domain allowlist', () => {
    const result = evaluateMessage('https://example.com', context, {
      ...basePolicy,
      domainAllowlist: ['example.com'],
      requireAllowlist: true,
    });
    expect(result.verdict).toBe('ALLOW');
  });

  it('uses a per-channel mode override instead of the guild-wide mode', () => {
    const result = evaluateMessage('https://bad-site.com', context, {
      ...basePolicy,
      mode: 'log',
      channelRules: [{ channelId: 'channel-1', mode: 'delete' }],
      domainBlocklist: ['bad-site.com'],
    });
    expect(result.action).toBe('DELETE');
  });
});
