function buildRange(startCodePoint: number, endCodePoint: number): RegExp {
  const start = String.fromCharCode(startCodePoint);
  const end = String.fromCharCode(endCodePoint);
  return new RegExp(`[${start}-${end}]`);
}

// Cyrillic (U+0400-04FF) and Greek (U+0370-03FF) blocks contain letters that are
// visually near-identical to Latin ones (e.g. Cyrillic 'а' vs Latin 'a'). Built
// from explicit code points (not literal glyphs) so the ranges stay unambiguous.
const CYRILLIC_RANGE = buildRange(0x0400, 0x04ff);
const GREEK_RANGE = buildRange(0x0370, 0x03ff);
const LATIN_LETTER_RANGE = /[a-zA-Z]/;

export function isPunycodeHostname(hostname: string): boolean {
  return hostname.split('.').some((label) => label.startsWith('xn--'));
}

export function hasMixedScriptConfusables(unicodeHostname: string): boolean {
  const hasLatin = LATIN_LETTER_RANGE.test(unicodeHostname);
  const hasCyrillic = CYRILLIC_RANGE.test(unicodeHostname);
  const hasGreek = GREEK_RANGE.test(unicodeHostname);
  return hasLatin && (hasCyrillic || hasGreek);
}
