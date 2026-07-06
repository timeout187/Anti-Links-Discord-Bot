# Privacy

AntiLink Guard OSS is self-hosted: **you run it, you control the database,
and no data goes to any third party operated by this project** - there is
no "phone home" telemetry anywhere in this codebase.

## What is stored, and where

Everything lives in the database you configure (SQLite by default; see
[self-hosting.md](./self-hosting.md)). The models, defined in
`packages/storage`:

| Model                               | What it holds                                                          |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `GuildConfig`                       | Your server's settings: enabled/mode/log channel/bypass lists          |
| `AllowlistEntry` / `BlocklistEntry` | A domain, who added it, when, and (blocklist only) an optional reason  |
| `InviteRule`                        | An allowed Discord invite code, who added it, when                     |
| `AuditLogEntry`                     | **Metadata about a moderation decision** - see below                   |
| `ScanResultRecord`                  | The outcome of a `/testlink` or CLI `test-url`/`scan` check            |
| `ModerationActionRecord`            | The action actually taken (delete/timeout/warn/log) for an audit entry |

## What an audit log entry contains - and what it deliberately does not

```ts
interface AuditLogEntry {
  id: string;
  guildId: string;
  channelId: string;
  userId: string;
  normalizedUrl?: string; // the link that triggered the entry, normalized
  hostname?: string;
  verdict: Verdict;
  reasons: DetectionReason[];
  score: number;
  action: ModerationActionType;
  createdAt: Date;
}
```

**There is no `content` or `message` field.** The full text of a scanned
message is never written to the database - only the specific link that
triggered a non-ALLOW verdict, plus the classification metadata needed to
show a mod-log entry. This is enforced by the type itself, not just a
convention: `AuditLogEntry` has no field capable of holding arbitrary
message text. `packages/storage`'s shared adapter contract test suite
(run against all four storage backends) includes an explicit assertion
that audit entries never carry a `content` property.

## What's sent to Discord

- Slash command replies (ephemeral where the code marks them so)
- Mod-log embeds, if you configure a log channel (`/logs set-channel`) -
  these contain the same metadata as the audit log entry above: user
  mention, channel mention, verdict, action, score, reasons, and the
  triggering URL

Deleted messages are removed via the normal Discord API `DELETE` message
call; this project doesn't retain a copy of what was deleted.

## `apps/dashboard-lite`

Reads directly from your database and displays exactly what's described
above - guild config, lists, and audit log entries. It has **no
authentication** and is meant to run on `localhost` only. See its
[README](../apps/dashboard-lite/README.md).

## Third parties

None, by this project. `packages/core`'s classification is entirely local
(offline heuristics against your own configured lists) - no message
content or URL is sent to an external API for scanning unless you build
that integration yourself (see [ROADMAP.md](../ROADMAP.md) for a possible
future plugin interface). The only network calls the bot itself makes are
to the Discord API.

## Your responsibilities as an operator

You are the data controller for whatever your instance stores about your
server's members. Standard good practice:

- Only grant the bot the Discord permissions it needs (see
  [discord-setup.md](./discord-setup.md)).
- Don't expose `dashboard-lite` publicly.
- If you're subject to a specific data-protection regime (GDPR, etc.),
  treat `AuditLogEntry.userId` as personal data subject to your own
  retention policy - this project doesn't implement automatic log
  expiry yet (see [ROADMAP.md](../ROADMAP.md)).
