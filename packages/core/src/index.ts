export * from './types/index.js';
export { extractLinks } from './extraction/extract-links.js';
export { normalizeUrl, stripZeroWidthChars, undefangText } from './extraction/normalize.js';
export { classifyLink } from './classification/classify.js';
export { REASON_SEVERITY, VERDICT_THRESHOLDS } from './classification/reasons.js';
export { isPunycodeHostname, hasMixedScriptConfusables } from './classification/homoglyph.js';
export { evaluateMessage } from './policy/policy-engine.js';
