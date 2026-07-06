import { describe, expect, it } from 'vitest';
import { extractLinks } from '../src/extraction/extract-links.js';
import { classifyLink } from '../src/classification/classify.js';
import type { PolicyConfig } from '../src/types/index.js';

const basePolicy: PolicyConfig = { enabled: true, mode: 'delete' };

function classifyFirst(text: string, policy: PolicyConfig = basePolicy) {
  const [link] = extractLinks(text);
  if (!link) throw new Error('expected a link to be extracted');
  return classifyLink(link, policy, text);
}

describe('classifyLink', () => {
  it('allows a domain on the allowlist and short-circuits other checks', () => {
    const result = classifyFirst('https://bit.ly/abc', {
      ...basePolicy,
      domainAllowlist: ['bit.ly'],
    });
    expect(result.reasons).toEqual(['ALLOWLIST_MATCH']);
    expect(result.score).toBeLessThan(0);
  });

  it('allows a subdomain of an allowlisted root domain', () => {
    const result = classifyFirst('https://cdn.example.com/file', {
      ...basePolicy,
      domainAllowlist: ['example.com'],
    });
    expect(result.reasons).toEqual(['ALLOWLIST_MATCH']);
  });

  it('flags a domain on the custom blocklist', () => {
    const result = classifyFirst('https://bad-site.com/x', {
      ...basePolicy,
      domainBlocklist: ['bad-site.com'],
    });
    expect(result.reasons).toContain('BLOCKLIST_MATCH');
    expect(result.score).toBeGreaterThan(0);
  });

  it('flags a domain on the known-phishing list with the highest severity', () => {
    const result = classifyFirst('https://phish.example/x', {
      ...basePolicy,
      knownPhishingDomains: ['phish.example'],
    });
    expect(result.reasons).toContain('KNOWN_PHISHING_DOMAIN');
    expect(result.score).toBeGreaterThanOrEqual(100);
  });

  it('flags a default URL shortener domain', () => {
    const result = classifyFirst('https://bit.ly/abc');
    expect(result.reasons).toContain('URL_SHORTENER');
  });

  it('flags a punycode hostname as suspicious', () => {
    const result = classifyFirst('https://xn--e1aybc.xn--p1ai/login');
    expect(result.reasons).toContain('PUNYCODE_SUSPICIOUS');
  });

  it('flags a mixed Latin/Cyrillic hostname as a homoglyph', () => {
    const cyrillicA = String.fromCharCode(0x0430);
    const result = classifyFirst(`https://p${cyrillicA}ypal.com/login`);
    expect(result.reasons).toContain('HOMOGLYPH_SUSPICIOUS');
  });

  it('does not flag an ordinary ASCII domain as a homoglyph', () => {
    const result = classifyFirst('https://example.com', {
      ...basePolicy,
      flagUnknownDomains: true,
    });
    expect(result.reasons).not.toContain('HOMOGLYPH_SUSPICIOUS');
  });

  it('applies NOT_IN_ALLOWLIST when requireAllowlist is on and the domain is absent', () => {
    const result = classifyFirst('https://example.com', {
      ...basePolicy,
      requireAllowlist: true,
    });
    expect(result.reasons).toContain('NOT_IN_ALLOWLIST');
  });

  it('applies UNKNOWN_DOMAIN when flagUnknownDomains is on', () => {
    const result = classifyFirst('https://example.com', {
      ...basePolicy,
      flagUnknownDomains: true,
    });
    expect(result.reasons).toContain('UNKNOWN_DOMAIN');
  });

  it('stays clean (no reasons) for an unrecognized domain by default', () => {
    const result = classifyFirst('https://example.com');
    expect(result.reasons).toHaveLength(0);
    expect(result.score).toBe(0);
  });

  it('matches a custom regex rule against the URL', () => {
    const result = classifyFirst('https://example.com/free-nitro-gift', {
      ...basePolicy,
      regexRules: [{ id: 'nitro-scam', pattern: 'free-nitro', target: 'url' }],
    });
    expect(result.reasons).toContain('REGEX_RULE_MATCH');
  });

  it('matches a custom regex rule against the raw message text', () => {
    const result = classifyFirst('claim your free nitro now https://example.com', {
      ...basePolicy,
      regexRules: [{ id: 'nitro-word', pattern: 'free nitro', target: 'message' }],
    });
    expect(result.reasons).toContain('REGEX_RULE_MATCH');
  });

  it('ignores an invalid user-supplied regex instead of throwing', () => {
    expect(() =>
      classifyFirst('https://example.com', {
        ...basePolicy,
        regexRules: [{ id: 'broken', pattern: '(unterminated' }],
      }),
    ).not.toThrow();
  });

  it('allows a discord invite on the invite allowlist', () => {
    const result = classifyFirst('https://discord.gg/abc123', {
      ...basePolicy,
      inviteAllowlist: ['abc123'],
    });
    expect(result.reasons).toEqual(['ALLOWLIST_MATCH']);
  });

  it('blocks a discord invite not on the allowlist when blockAllInvites is set', () => {
    const result = classifyFirst('https://discord.gg/xyz999', {
      ...basePolicy,
      blockAllInvites: true,
    });
    expect(result.reasons).toContain('DISCORD_INVITE');
    expect(result.score).toBeGreaterThan(0);
  });

  it('tags but does not score a discord invite when blockAllInvites is off', () => {
    const result = classifyFirst('https://discord.gg/xyz999', basePolicy);
    expect(result.reasons).toContain('DISCORD_INVITE');
    expect(result.score).toBe(0);
  });
});
