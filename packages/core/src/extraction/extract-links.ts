import type { ExtractedLink } from '../types/index.js';
import { normalizeUrl, stripZeroWidthChars, undefangText } from './normalize.js';

const MARKDOWN_LINK_PATTERN = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi;
const RAW_URL_PATTERN = /\bhttps?:\/\/[^\s<>"'\])]+/gi;
const BARE_WWW_PATTERN = /\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<>"']*)?/gi;
const DISCORD_INVITE_PATTERN =
  /\b(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/gi;

function stripTrailingPunctuation(match: string): string {
  return match.replace(/[.,;:!?)\]]+$/, '');
}

function wasObfuscated(originalText: string, matchedText: string): boolean {
  return !originalText.toLowerCase().includes(matchedText.toLowerCase());
}

export function extractLinks(rawText: string): ExtractedLink[] {
  const deobfuscated = undefangText(stripZeroWidthChars(rawText));
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();

  const addLink = (raw: string, isMarkdown: boolean): void => {
    const cleaned = stripTrailingPunctuation(raw);
    const inviteMatch = new RegExp(DISCORD_INVITE_PATTERN.source, 'i').exec(cleaned);

    if (inviteMatch?.[1]) {
      const inviteCode = inviteMatch[1];
      const key = `invite:${inviteCode}`;
      if (seen.has(key)) return;
      seen.add(key);
      links.push({
        raw: cleaned,
        normalizedUrl: `https://discord.gg/${inviteCode}`,
        hostname: 'discord.gg',
        isMarkdown,
        isDefanged: wasObfuscated(rawText, cleaned),
        isDiscordInvite: true,
        inviteCode,
      });
      return;
    }

    const normalized = normalizeUrl(cleaned);
    if (!normalized) return;
    if (seen.has(normalized.url)) return;
    seen.add(normalized.url);

    links.push({
      raw: cleaned,
      normalizedUrl: normalized.url,
      hostname: normalized.hostname,
      isMarkdown,
      isDefanged: wasObfuscated(rawText, cleaned),
      isDiscordInvite: false,
    });
  };

  for (const match of deobfuscated.matchAll(MARKDOWN_LINK_PATTERN)) {
    if (match[2]) addLink(match[2], true);
  }
  for (const match of deobfuscated.matchAll(DISCORD_INVITE_PATTERN)) {
    addLink(match[0], false);
  }
  for (const match of deobfuscated.matchAll(RAW_URL_PATTERN)) {
    addLink(match[0], false);
  }
  for (const match of deobfuscated.matchAll(BARE_WWW_PATTERN)) {
    addLink(match[0], false);
  }

  return links;
}
