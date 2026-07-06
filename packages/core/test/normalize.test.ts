import { describe, expect, it } from 'vitest';
import { normalizeUrl, stripZeroWidthChars, undefangText } from '../src/extraction/normalize.js';

describe('stripZeroWidthChars', () => {
  it('removes zero-width space characters injected mid-word', () => {
    const withZeroWidth = 'exa' + String.fromCharCode(0x200b) + 'mple.com';
    expect(stripZeroWidthChars(withZeroWidth)).toBe('example.com');
  });

  it('removes soft hyphen and BOM characters', () => {
    const text = String.fromCharCode(0xfeff) + 'exam' + String.fromCharCode(0x00ad) + 'ple.com';
    expect(stripZeroWidthChars(text)).toBe('example.com');
  });

  it('leaves normal text untouched', () => {
    expect(stripZeroWidthChars('hello world')).toBe('hello world');
  });
});

describe('undefangText', () => {
  it('reverses hxxp:// to http://', () => {
    expect(undefangText('visit hxxp://example.com now')).toContain('http://example.com');
  });

  it('reverses hxxps:// to https://', () => {
    expect(undefangText('visit hxxps://example.com now')).toContain('https://example.com');
  });

  it('reverses example[.]com bracket-dot defanging', () => {
    expect(undefangText('go to example[.]com/path')).toContain('example.com/path');
  });

  it('reverses example(.)com paren-dot defanging', () => {
    expect(undefangText('go to example(.)com')).toContain('example.com');
  });

  it('reverses defanged scheme separator [://]', () => {
    expect(undefangText('http[://]example.com')).toContain('http://example.com');
  });

  it('does not corrupt ordinary sentences with parentheses', () => {
    expect(undefangText('see the notes (draft version)')).toBe('see the notes (draft version)');
  });
});

describe('normalizeUrl', () => {
  it('lowercases the hostname', () => {
    const result = normalizeUrl('https://EXAMPLE.com/Path');
    expect(result?.hostname).toBe('example.com');
  });

  it('prepends http:// to scheme-less input', () => {
    const result = normalizeUrl('example.com');
    expect(result?.url.startsWith('http://')).toBe(true);
  });

  it('strips common tracking parameters', () => {
    const result = normalizeUrl('https://example.com/?utm_source=x&gclid=y&id=keep');
    expect(result?.url).not.toContain('utm_source');
    expect(result?.url).not.toContain('gclid');
    expect(result?.url).toContain('id=keep');
  });

  it('strips a bare trailing slash on the root path', () => {
    const result = normalizeUrl('https://example.com/');
    expect(result?.url).toBe('https://example.com');
  });

  it('returns undefined for garbage input', () => {
    expect(normalizeUrl('not a url at all ://')).toBeUndefined();
  });
});
