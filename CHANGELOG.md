# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Professional README with architecture overview, roadmap, and FAQ.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`.
- GitHub issue templates (bug report, feature request) and pull request template.
- Continuous Integration workflow (lint/build) via GitHub Actions.
- Dependabot configuration for npm and GitHub Actions updates.
- `.env.example` documenting required environment variables.
- Base ESLint (flat config) for linting, with `eslint`, `@eslint/js`, and
  `globals` as devDependencies and a `lint` npm script.
- `start` npm script (`node index.js`) and `engines` field (Node.js >= 18).
- `LICENSE` file (MIT), matching the license the README already declared.

### Changed
- Revived and re-positioned the project as the open-source edition of the
  AntiLink platform.
- **Breaking:** upgraded from discord.js v13 to **v14** and ported `index.js`
  to the v14 API (`GatewayIntentBits`, `Events`), including the now-required
  `MessageContent` privileged intent.
- **Breaking:** moved the hardcoded whitelisted-channel and bypass-role IDs out
  of the source into the `WHITELISTED_CHANNEL_IDS` and `IGNORED_ROLE_IDS`
  environment variables (comma-separated lists).
- `WEBHOOK_URL` is now optional — without it the bot still filters links and
  simply skips webhook logging; a single `WebhookClient` is reused instead of
  being constructed for every deletion.

### Fixed
- Messages from bots/webhooks and DMs are now ignored, and system messages with
  no member object no longer crash the role-bypass check.

---

## [0.1.0] - 2024-04-14

- Initial anti-link Discord bot: automatic link detection and removal in
  configured channels, channel whitelisting, role-based bypass, and webhook
  notifications.

[Unreleased]: https://github.com/timeout187/Anti-Links-Discord-Bot/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/timeout187/Anti-Links-Discord-Bot/releases/tag/v0.1.0
