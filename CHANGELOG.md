# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.1.0] - 2026-07-06 - AntiLink Guard OSS

This release is a complete rebuild of the repository into **AntiLink Guard
OSS**, a self-hostable, TypeScript, open-source Discord anti-phishing and
link-moderation framework, restructured as a pnpm workspace monorepo. It
replaces the single-file bot described under
[`[0.1.0-legacy]`](#010-legacy---2024-04-14) below entirely - see
[`docs/migration-from-old-antilink.md`](./docs/migration-from-old-antilink.md)
if you were running that version.

### Added

- **`packages/core`** - the detection and policy engine. URL/invite
  extraction with de-obfuscation (zero-width characters, `hxxp://`,
  `example[.]com` defanging, markdown links), classification (domain
  allow/blocklists, a guild-suppliable known-phishing list, URL shorteners,
  punycode hostnames, Latin/Cyrillic/Greek homoglyph detection, custom
  regex rules), and a policy engine resolving each message to an
  `ALLOW`/`WARN`/`BLOCK`/`QUARANTINE` verdict and a
  `NONE`/`LOG`/`WARN`/`DELETE`/`TIMEOUT` action via a
  `log`/`warn`/`delete`/`timeout` enforcement mode ladder. No known-phishing
  domains are hardcoded - that data is always guild- or operator-supplied.
- **`packages/storage`** - `MemoryStorageAdapter`, `SqliteStorageAdapter`
  (the self-hosting default), `MysqlStorageAdapter`, and
  `PostgresStorageAdapter`, all implementing one `StorageAdapter` interface
  and validated by a shared contract test suite. Config export/import
  bundles (`exportGuildConfigBundle`/`importGuildConfigBundle`/
  `parseConfigBundle`, zod-validated) back up or restore a guild's full
  configuration as JSON.
- **`packages/discord-bot`** - the discord.js v14 adapter: `/antilink`
  (status/enable/disable/mode), `/allowlist`, `/blocklist`, `/invites`
  (allow/block-all), `/logs set-channel`, `/testlink`, and `/config`
  (export/import). The message pipeline ignores bots and DMs, checks
  discord.js's own permission signals (`message.deletable`,
  `member.moderatable`) before ever deleting or timing out, records
  metadata-only audit log entries (no message content field exists on the
  type), posts mod-log embeds, and rate-limits enforcement actions per
  guild via a token-bucket limiter so a spam wave can't drive the bot into
  Discord's own API rate limits. `/config import` always overwrites the
  imported bundle's guild ID with the guild the command was run in, so an
  import can never write into a different server's data.
- **`packages/cli`** (`antilink`) - `scan`, `test-url`, `init`,
  `export-config`/`import-config`, and `doctor` (offline health checks:
  Node version, `.env` presence, config file validity, the better-sqlite3
  native binding, database directory write access). Runs the exact same
  detection engine as the bot, entirely offline.
- **`apps/example-bot`** - a working self-hosted bot assembled from the
  published packages, with a `DATABASE_DRIVER` switch (sqlite/mysql/postgres)
  that's actually implemented, a command-registration script, and Docker
  support (non-root user, persistent volume for SQLite).
- **`apps/dashboard-lite`** - a dependency-free (`node:http`, no framework),
  local, explicitly unauthenticated read-only dashboard: bot status, guild
  config, allowlist/blocklist, and recent audit log entries.
- Root `docker-compose.yml` for the example bot.
- 9 documentation pages under `docs/`: getting-started, configuration,
  rules-engine, discord-setup, privacy, self-hosting, threat-model,
  api-reference, migration-from-old-antilink.
- `GOVERNANCE.md` and `ROADMAP.md`.
- CI (`.github/workflows/ci.yml`) rebuilt for the pnpm monorepo: install,
  build (topologically ordered), typecheck, lint, format check, and test on
  Node 20 and 22, with live PostgreSQL and MySQL service containers so
  every storage adapter's contract tests run for real in CI.
- `.github/workflows/codeql.yml` - static analysis on push, pull request,
  and a weekly schedule.
- A `docker` ecosystem entry in `.github/dependabot.yml` for the example
  bot's base image.
- 212 tests across the workspace (unit tests for the detection/policy
  engine and CLI; a shared adapter contract suite run against all four
  storage backends, including live tests against a real PostgreSQL
  instance; discord-bot logic tested against structural fakes of
  discord.js's Message/Interaction/Client, since there is no live-Discord
  integration testing without a real bot token and gateway connection;
  real HTTP integration tests for dashboard-lite's server).

### Changed

- **Breaking, in every sense** - the single `index.js` file is gone. Its
  hardcoded whitelisted-channel/ignored-role arrays and `WEBHOOK_URL`
  webhook logging are replaced by per-guild database-backed configuration
  and `/logs set-channel`. See
  [`docs/migration-from-old-antilink.md`](./docs/migration-from-old-antilink.md).
- Tooling: npm → pnpm, plain JS → strict TypeScript, a single package.json →
  a pnpm workspace of 4 packages and 2 apps, `node index.js` → a build step
  required before running anything (packages resolve each other via built
  `dist/` output).
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, the PR template,
  and the issue templates were rewritten for the new monorepo and Node 20+;
  stale references to an unrelated hosted product's support/docs links were
  removed (`CODE_OF_CONDUCT.md`'s enforcement contact, the issue template
  config).
- `package.json`'s `homepage` field now points at this repository instead
  of an unrelated hosted product's website.

### Removed

- The old `index.js`, its npm scripts, and its env vars (`WEBHOOK_URL`,
  `WHITELISTED_CHANNEL_IDS`, `IGNORED_ROLE_IDS`) - see "Changed" above for
  what replaces each one.

---

## [0.1.0-legacy] - 2024-04-14

The original `Anti-Links-Discord-Bot`, before the AntiLink Guard OSS
rewrite above. Kept here for historical record and for anyone migrating
from it.

- Initial anti-link Discord bot: automatic link detection and removal in
  configured channels, channel whitelisting, role-based bypass, and webhook
  notifications.

[Unreleased]: https://github.com/timeout187/antilink-guard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/timeout187/antilink-guard/releases/tag/v0.1.0
[0.1.0-legacy]: https://github.com/timeout187/antilink-guard/releases/tag/v0.1.0-legacy
