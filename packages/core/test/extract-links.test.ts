import { describe, expect, it } from 'vitest';
import { extractLinks } from '../src/extraction/extract-links.js';

describe('extractLinks', () => {
  it('extracts a plain https URL', () => {
    const links = extractLinks('check this out: https://example.com/page');
    expect(links).toHaveLength(1);
    expect(links[0]?.normalizedUrl).toBe('https://example.com/page');
    expect(links[0]?.isDefanged).toBe(false);
  });

  it('extracts a bare www. domain without a scheme', () => {
    const links = extractLinks('visit www.example.com today');
    expect(links).toHaveLength(1);
    expect(links[0]?.hostname).toBe('www.example.com');
  });

  it('extracts a markdown link and flags it', () => {
    const links = extractLinks('[click here](https://example.com/offer)');
    expect(links).toHaveLength(1);
    expect(links[0]?.isMarkdown).toBe(true);
    expect(links[0]?.normalizedUrl).toBe('https://example.com/offer');
  });

  it('extracts an hxxp:// defanged link and flags it as defanged', () => {
    const links = extractLinks('free nitro hxxps://scam-site.com/claim');
    expect(links).toHaveLength(1);
    expect(links[0]?.hostname).toBe('scam-site.com');
    expect(links[0]?.isDefanged).toBe(true);
  });

  it('extracts an example[.]com defanged domain and flags it as defanged', () => {
    const links = extractLinks('go to hxxps://free-nitro[.]ru/claim now');
    expect(links).toHaveLength(1);
    expect(links[0]?.hostname).toBe('free-nitro.ru');
    expect(links[0]?.isDefanged).toBe(true);
  });

  it('does not flag a plain link found verbatim in the original text as defanged', () => {
    const links = extractLinks('https://example.com/page');
    expect(links[0]?.isDefanged).toBe(false);
  });

  it('extracts a discord.gg invite and captures the invite code', () => {
    const links = extractLinks('join us at https://discord.gg/abc123');
    expect(links).toHaveLength(1);
    expect(links[0]?.isDiscordInvite).toBe(true);
    expect(links[0]?.inviteCode).toBe('abc123');
  });

  it('extracts a discord.com/invite style invite', () => {
    const links = extractLinks('https://discord.com/invite/xyz789');
    expect(links).toHaveLength(1);
    expect(links[0]?.isDiscordInvite).toBe(true);
    expect(links[0]?.inviteCode).toBe('xyz789');
  });

  it('reassembles a link broken up by zero-width characters', () => {
    const withZeroWidth = `https://exa${String.fromCharCode(0x200b)}mple.com`;
    const links = extractLinks(`check ${withZeroWidth} out`);
    expect(links).toHaveLength(1);
    expect(links[0]?.hostname).toBe('example.com');
  });

  it('deduplicates the same URL appearing twice', () => {
    const links = extractLinks('https://example.com and again https://example.com');
    expect(links).toHaveLength(1);
  });

  it('returns an empty array for messages with no links', () => {
    expect(extractLinks('just a normal message, no links here')).toHaveLength(0);
  });

  it('strips trailing punctuation from a matched URL', () => {
    const links = extractLinks('Check this out: https://example.com/page.');
    expect(links[0]?.normalizedUrl).toBe('https://example.com/page');
  });
});
