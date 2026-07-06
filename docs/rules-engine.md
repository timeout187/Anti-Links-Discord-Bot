# Rules Engine

How `packages/core` turns a raw Discord message into a verdict and an
action. This document describes the actual implementation - every
function and constant named here exists in the code.

## Pipeline overview

```
message text
     │
     ▼
extractLinks()        - find every URL/invite, de-obfuscating along the way
     │
     ▼
classifyLink()         - score each link against allow/blocklists, shorteners,
     │                    punycode/homoglyphs, and custom regex rules
     ▼
evaluateMessage()       - apply bypasses, aggregate scores, resolve a verdict
     │                    and an action for the configured enforcement mode
     ▼
{ verdict, action, score, reasons, matchedLinks, bypassed }
```

## 1. Extraction (`extractLinks`)

Finds, in order: markdown links, `discord.gg`/`discord.com/invite` invites,
plain `https?://` URLs, and bare `www.` domains. Before matching, the text
is de-obfuscated:

- Zero-width characters (`U+00AD`, `U+180E`, `U+200B-200D`, `U+2060`,
  `U+FEFF`) are stripped, so `exa​mple.com` (zero-width space mid-word) is
  read as `example.com`.
- `hxxp://` / `hxxps://` are reversed to `http://` / `https://`.
- `example[.]com`, `example(.)com`, and `http[://]example.com` style
  defanging is reversed.

Each extracted link records whether it was found in a defanged/obfuscated
form (`isDefanged`), whether it's a Discord invite (`isDiscordInvite`), and
its normalized URL (lowercased host, tracking parameters like `utm_*`,
`gclid`, `fbclid` stripped).

## 2. Classification (`classifyLink`)

Each link is checked, in this order, against the guild's policy:

1. **Domain allowlist** - an exact or subdomain match short-circuits
   everything else and allows the link (`ALLOWLIST_MATCH`).
2. **Known-phishing domains** - `KNOWN_PHISHING_DOMAIN` (see note below on
   why this list is empty by default).
3. **Domain blocklist** - `BLOCKLIST_MATCH`.
4. **URL shorteners** - a small built-in default list (`bit.ly`, `tinyurl.com`,
   `t.co`, `is.gd`, `buff.ly`, `ow.ly`, `rebrand.ly`, `cutt.ly`, `shorturl.at`,
   `rb.gy`, `tiny.cc`, `lnkd.in`, `v.gd`), overridable via
   `urlShortenerDomains` - `URL_SHORTENER`.
5. **Punycode hostnames** (any label starting `xn--`) - `PUNYCODE_SUSPICIOUS`.
6. **Homoglyphs** - the (punycode-decoded) hostname mixes Latin letters with
   Cyrillic or Greek ones (e.g. a Cyrillic "а" standing in for a Latin "a")
   - `HOMOGLYPH_SUSPICIOUS`.
7. If none of the above matched: `NOT_IN_ALLOWLIST` (only if
   `requireAllowlist` is on) or `UNKNOWN_DOMAIN` (only if
   `flagUnknownDomains` is on). Neither is applied by default, so an
   unrecognized, otherwise-unremarkable domain is allowed by default.
8. **Custom regex rules** always run last, against either the normalized
   URL or the full message text (`target: "url" | "message"`) -
   `REGEX_RULE_MATCH`.

Discord invites follow a parallel path: an invite on the invite allowlist
is `ALLOWLIST_MATCH`; otherwise it's tagged `DISCORD_INVITE`, and only
scored if `blockAllInvites` is on.

### Detection reasons

| Reason                   | Meaning                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `ALLOWLIST_MATCH`        | Domain or invite explicitly allowed - overrides everything          |
| `DISCORD_INVITE`         | An invite link was found                                            |
| `BLOCKLIST_MATCH`        | Domain is on this guild's blocklist                                 |
| `KNOWN_PHISHING_DOMAIN`  | Domain is in `knownPhishingDomains`                                 |
| `URL_SHORTENER`          | Domain is a known link shortener                                    |
| `PUNYCODE_SUSPICIOUS`    | Hostname contains an `xn--` (punycode) label                        |
| `HOMOGLYPH_SUSPICIOUS`   | Hostname mixes Latin with Cyrillic/Greek letters                    |
| `NOT_IN_ALLOWLIST`       | `requireAllowlist` is on and the domain isn't listed                |
| `UNKNOWN_DOMAIN`         | `flagUnknownDomains` is on and the domain is unrecognized           |
| `REGEX_RULE_MATCH`       | A custom regex rule matched                                         |
| `MASS_MENTION_WITH_LINK` | The message both pinged many users/roles and contained a risky link |

### Why `knownPhishingDomains` is always empty out of the box

This project does not bundle, and does not claim to maintain, a
threat-intelligence database of phishing domains. `knownPhishingDomains` is
entirely guild-supplied (via the local policy file - see
[configuration.md](./configuration.md)). If you want one, point it at a feed
you trust; this framework won't pretend to be that feed itself.

## 3. Scoring and policy (`evaluateMessage`)

Each reason has a fixed severity score:

| Reason                                         | Score                            |
| ---------------------------------------------- | -------------------------------- |
| `ALLOWLIST_MATCH`                              | -1000 (forces ALLOW)             |
| `UNKNOWN_DOMAIN`                               | 5                                |
| `NOT_IN_ALLOWLIST`                             | 10                               |
| `URL_SHORTENER`                                | 15                               |
| `DISCORD_INVITE`                               | 20                               |
| `MASS_MENTION_WITH_LINK`                       | 25                               |
| `PUNYCODE_SUSPICIOUS` / `HOMOGLYPH_SUSPICIOUS` | 30 each                          |
| `REGEX_RULE_MATCH`                             | 40 (or a rule-specific override) |
| `BLOCKLIST_MATCH`                              | 50                               |
| `KNOWN_PHISHING_DOMAIN`                        | 100                              |

A message's score is the **maximum** across all its links (not a sum -
one bad link is enough), plus a one-time `MASS_MENTION_WITH_LINK` bonus if
the message both pings at least `massMentionThreshold` users/roles and
contains at least one already-risky link.

### Verdict thresholds

| Score | Verdict      |
| ----- | ------------ |
| < 1   | `ALLOW`      |
| ≥ 1   | `WARN`       |
| ≥ 30  | `BLOCK`      |
| ≥ 60  | `QUARANTINE` |

### From verdict to action

The guild's `mode` sets a ceiling on what the bot will actually do:

| Verdict      | `log` mode | `warn` mode | `delete` mode | `timeout` mode       |
| ------------ | ---------- | ----------- | ------------- | -------------------- |
| `ALLOW`      | none       | none        | none          | none                 |
| `WARN`       | log        | log         | log           | log                  |
| `BLOCK`      | log        | **warn**    | **delete**    | delete               |
| `QUARANTINE` | log        | **warn**    | delete        | **delete + timeout** |

A `WARN` verdict is always just logged, regardless of mode - only `mode`
determines how far the bot goes for `BLOCK`/`QUARANTINE` content.

## 4. Bypasses (checked before any scanning happens)

In order, `evaluateMessage` short-circuits to `ALLOW` (with `bypassed: true`)
if:

1. The policy is disabled (`enabled: false`).
2. The author has a bypass role or is a bypass user.
3. The channel has a rule with `mode: "exempt"`.

Only after these checks does the message actually get scanned.

## Trying it yourself

```bash
antilink scan "check out hxxps://free-nitro[.]ru/claim" --json
antilink test-url https://xn--e1aybc.xn--p1ai
```

See [api-reference.md](./api-reference.md) for calling `evaluateMessage`
directly from TypeScript.
