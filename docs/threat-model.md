# Threat Model

What AntiLink Guard OSS actually defends against, what it doesn't, and how
it fails when it fails. Read this before relying on it as your only line of
defense - see also [SECURITY.md](../SECURITY.md) for reporting a
vulnerability in the project itself.

## What this project detects

Everything here is implemented in `packages/core` - see
[rules-engine.md](./rules-engine.md) for the exact mechanics:

- Links to domains you've explicitly blocklisted
- Links to domains on a known-phishing list **you supply** (none is bundled)
- Discord invite links, if you choose to restrict them
- Common URL shorteners (a small built-in list, extendable)
- Punycode (`xn--`) hostnames
- Homoglyph domains mixing Latin with Cyrillic/Greek letters
- Links obfuscated with `hxxp://`, `example[.]com`, or zero-width characters
- Custom patterns you define via regex rules
- A message that both pings many users/roles and contains a risky link

## What this project does not detect

- **Zero-day phishing domains not on any list.** There is no heuristic
  content analysis of the destination page, no machine learning
  classifier, and no bundled threat-intelligence feed. A brand-new
  phishing domain that isn't on your blocklist and doesn't trip any other
  reason above will be allowed.
- **Direct messages.** The bot only processes `messageCreate` events for
  guild (server) messages - it never reads or scans DMs.
- **Non-text phishing vectors**: images, embedded QR codes, voice/video,
  or links posted as plain text with no `http(s)://`/`www.` prefix and no
  recognizable defanging pattern.
- **Attachments.** File uploads aren't scanned.
- **Edited messages.** The pipeline runs on `messageCreate` only - if a
  message is edited _after_ being posted to add a malicious link, it is
  not re-scanned (see [ROADMAP.md](../ROADMAP.md)).
- **Sophisticated, targeted social engineering** that doesn't rely on a
  link at all (e.g. a scammer asking a victim to screen-share).

## Trust boundaries

- **The bot trusts its own database.** Anything in your `AllowlistEntry`/
  `BlocklistEntry`/`InviteRule` tables is trusted as configured. If your
  database is compromised, so is your moderation policy - protect it like
  any other credential store.
- **The bot trusts Discord's permission model for command access**, not
  its own. Every admin slash command (`/antilink`, `/allowlist`,
  `/blocklist`, `/invites`, `/logs`, `/config`) is registered with
  `default_member_permissions` requiring **Manage Server** - Discord
  enforces this, the bot doesn't re-check it. `/testlink` is intentionally
  open to everyone (read-only, low risk).
- **The bot does not trust its own Discord permissions blindly.** Before
  deleting a message or timing out a member, it checks discord.js's own
  `message.deletable` / `member.moderatable` signals first (see
  [rules-engine.md](./rules-engine.md) and `packages/discord-bot`'s
  `moderation/enforce.ts`). If the bot lacks a permission, it logs a
  warning and skips that action instead of crashing or silently pretending
  to have succeeded.
- **`/config import` is guild-scoped defensively.** Even if the uploaded
  JSON file claims a different guild ID (from another server, or crafted by
  hand), the bot always overwrites it with the guild the command was run
  in - an admin can never accidentally or maliciously import data into a
  server that isn't theirs.

## Failure modes

| Failure                                           | Behavior                                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bot lacks Manage Messages                         | Logs a warning, does not delete, still records an audit log entry                                                                                                                    |
| Bot lacks Moderate Members / role hierarchy issue | Logs a warning, does not time out (message may still be deleted)                                                                                                                     |
| Mod-log channel deleted or bot lacks access       | Logs a warning, moderation still proceeds without the embed                                                                                                                          |
| Malformed custom regex rule                       | The rule is silently skipped for that message rather than crashing the scan                                                                                                          |
| Database briefly unavailable                      | The message-processing error is caught and logged; that one message is not moderated, the bot keeps running                                                                          |
| A raid/spam wave                                  | The moderation-action rate limiter (see `packages/discord-bot`'s `rate-limit.ts`) caps enforcement actions per guild so the bot doesn't hammer Discord's API into its own rate limit |

## `apps/dashboard-lite` has no authentication

This is a deliberate, documented limitation, not an oversight - see its
[README](../apps/dashboard-lite/README.md) and
[privacy.md](./privacy.md#appsdashboard-lite). Do not expose it beyond
`localhost` without adding your own authentication layer in front of it.

## Reporting an issue with this threat model

If you find a gap here - a real attack this project should defend against
but doesn't, or a case where it fails unsafely rather than safely - please
report it per [SECURITY.md](../SECURITY.md) if it's exploitable, or open a
regular issue if it's a documentation gap.
