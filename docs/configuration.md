# Configuration

There are **two separate configuration surfaces** in this project. Knowing
which one you're touching matters:

|             | Per-guild bot configuration                      | Local policy file                           |
| ----------- | ------------------------------------------------ | ------------------------------------------- |
| Used by     | `packages/discord-bot` at runtime (the live bot) | `packages/cli`'s `scan`/`test-url` commands |
| Stored in   | Your database (`packages/storage`)               | A local `antilink.config.json` file         |
| Changed via | Slash commands                                   | Editing the file directly                   |
| Scope       | One Discord server (guild)                       | Whatever you're running the CLI against     |

## Per-guild bot configuration

This is what actually governs moderation in your Discord server. It's the
`GuildConfig` model in `packages/storage`, plus three related lists
(allowlist, blocklist, invite rules), all keyed by guild ID.

| Field                                                            | Slash command                                                       | Default                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| `enabled`                                                        | `/antilink enable` / `/antilink disable`                            | `true`                                                        |
| `mode`                                                           | `/antilink mode <block\|warn\|log>`                                 | `delete` (see table below for what each command word maps to) |
| `logChannelId`                                                   | `/logs set-channel channel:<#channel>`                              | unset                                                         |
| `blockAllInvites`                                                | `/invites block-all [enabled:<bool>]`                               | `false`                                                       |
| domain allowlist                                                 | `/allowlist add\|remove domain:<domain>`                            | empty                                                         |
| domain blocklist                                                 | `/blocklist add\|remove domain:<domain>`                            | empty                                                         |
| allowed invites                                                  | `/invites allow invite:<url or code>`                               | empty                                                         |
| `bypassRoleIds` / `bypassUserIds`                                | not yet exposed via slash command - see [ROADMAP.md](../ROADMAP.md) | empty                                                         |
| `requireAllowlist`, `flagUnknownDomains`, `massMentionThreshold` | not yet exposed via slash command                                   | `false` / `false` / `0`                                       |

`/antilink mode` accepts three user-facing words that map onto the
underlying `EnforcementMode` (see [rules-engine.md](./rules-engine.md)):

| Command value | Stored as | Effect                                                                                     |
| ------------- | --------- | ------------------------------------------------------------------------------------------ |
| `block`       | `delete`  | Deletes messages that score BLOCK or above                                                 |
| `warn`        | `warn`    | Flags BLOCK/QUARANTINE-severity messages (audit log + mod-log embed) without deleting them |
| `log`         | `log`     | Records everything, never deletes or times out                                             |

A fourth mode, `timeout`, exists in the data model (it additionally times
out the author for a QUARANTINE-severity message) but isn't currently one
of the three choices `/antilink mode` offers - see
[ROADMAP.md](../ROADMAP.md).

### Backing up / migrating a guild's configuration

```
/config export   →  a JSON file with the guild config + all three lists
/config import    →  re-import that file (always scoped to the guild you run it in)
```

The same format is produced/consumed by the CLI:

```bash
antilink export-config --guild <id> --db ./antilink.sqlite --out backup.json
antilink import-config backup.json --db ./antilink.sqlite
```

## Local policy file (`antilink.config.json`)

Used only by the CLI's `scan` and `test-url` commands (and `apps/example-bot`
does **not** read this file - it uses per-guild config from the database).
Create one with `antilink init`, which scaffolds a starter file. It maps
directly onto `packages/core`'s `PolicyConfig`:

```json
{
  "enabled": true,
  "mode": "log",
  "domainAllowlist": ["example.com"],
  "domainBlocklist": ["bad-site.com"],
  "knownPhishingDomains": [],
  "inviteAllowlist": [],
  "blockAllInvites": false,
  "requireAllowlist": false,
  "flagUnknownDomains": false,
  "massMentionThreshold": 0,
  "bypassRoleIds": [],
  "bypassUserIds": [],
  "channelRules": [{ "channelId": "123", "mode": "exempt" }],
  "regexRules": [{ "id": "nitro-scam", "pattern": "free-nitro", "target": "url" }],
  "urlShortenerDomains": []
}
```

This file format is a superset of what's reachable through slash commands
today - `channelRules`, `regexRules`, and `knownPhishingDomains` can only be
set this way, not through the live bot yet. It's most useful for locally
testing "would this message be flagged?" before wiring up rules in
production.

## `knownPhishingDomains` is never pre-populated

Neither configuration surface ships with a bundled list of "known phishing
domains." That field is always empty until you (or a feed you choose to
subscribe to) fill it in. See [rules-engine.md](./rules-engine.md#detection-reasons)
for why this is a deliberate choice.
