import { domainToUnicode } from 'node:url';

// Invisible characters used to break up scam URLs so naive scanners miss them:
// soft hyphen, Mongolian vowel separator, zero-width space/non-joiner/joiner,
// word joiner, and the zero-width no-break space (BOM). Built from explicit
// code points rather than literal characters so the pattern stays reviewable.
const ZERO_WIDTH_CODEPOINTS = [0x00ad, 0x180e, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff];
const ZERO_WIDTH_PATTERN = new RegExp(
  `[${ZERO_WIDTH_CODEPOINTS.map((cp) => String.fromCharCode(cp)).join('')}]`,
  'g',
);

const TRACKING_PARAM_PREFIXES = ['utm_'];
const TRACKING_PARAM_EXACT = new Set([
  'gclid',
  'fbclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ref',
  'ref_src',
  'spm',
]);

export function stripZeroWidthChars(text: string): string {
  return text.replace(ZERO_WIDTH_PATTERN, '');
}

export function undefangText(text: string): string {
  let result = text.replace(/h\s*x\s*x\s*p(s?)/gi, 'http$1');
  result = result.replace(/([a-z0-9-])\s?[[({]\s?\.\s?[\])}]\s?([a-z0-9-])/gi, '$1.$2');
  result = result.replace(/[[({]\s?:\s?\/\s?\/\s?[\])}]/gi, '://');
  return result;
}

export function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    TRACKING_PARAM_EXACT.has(lower) || TRACKING_PARAM_PREFIXES.some((p) => lower.startsWith(p))
  );
}

export function stripTrackingParams(url: URL): URL {
  const keysToDelete: string[] = [];
  for (const key of url.searchParams.keys()) {
    if (isTrackingParam(key)) keysToDelete.push(key);
  }
  for (const key of keysToDelete) url.searchParams.delete(key);
  return url;
}

export function toUnicodeHostname(hostname: string): string {
  try {
    return domainToUnicode(hostname);
  } catch {
    return hostname;
  }
}

export interface NormalizedUrl {
  url: string;
  hostname: string;
}

export function normalizeUrl(rawUrl: string): NormalizedUrl | undefined {
  let candidate = rawUrl.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    candidate = `http://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return undefined;
  }

  parsed.hostname = parsed.hostname.toLowerCase();
  stripTrackingParams(parsed);

  let serialized = parsed.toString();
  if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
    serialized = serialized.replace(/\/$/, '');
  }

  return { url: serialized, hostname: parsed.hostname };
}
