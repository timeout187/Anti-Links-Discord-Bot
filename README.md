<div align="center">

<img src="./docs/brand/logo.png" alt="AntiLink logo — a blue shield with a crossed link" width="360">

# AntiLink

**Open-source Discord link moderation for communities that need clean, safe chat.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2.svg)](https://discord.js.org)
[![CI](https://github.com/timeout187/Anti-Links-Discord-Bot/actions/workflows/ci.yml/badge.svg)](https://github.com/timeout187/Anti-Links-Discord-Bot/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Code of Conduct](https://img.shields.io/badge/Contributor%20Covenant-2.1-purple.svg)](./CODE_OF_CONDUCT.md)

[Website][website] · [Documentation][docs] · [Dashboard][dashboard] · [Status][status] · [Discord][discord] · [Report a Bug][issues]

**Want the fully-featured hosted bot instead of self-hosting?**
[![Add AntiLink to Discord](https://img.shields.io/badge/Add%20AntiLink%202.0-to%20Discord-5865F2?logo=discord&logoColor=white)][invite]

</div>

---

> **Note on scope.** This repository is the original, **self-hostable open-source** AntiLink bot. It does automatic link filtering and nothing else. The **hosted AntiLink platform** ([AntiLink 2.0][invite]) is a separate, much larger product — dashboard, paid plans, raid defense, verification, and more — and **none of those features are in this repository**. See [This repo vs. hosted AntiLink](#this-repo-vs-hosted-antilink) for the difference, and the [Roadmap](#roadmap) for what the hosted platform offers. Anything marked *Planned* or *hosted* does not ship here.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [This repo vs. hosted AntiLink](#this-repo-vs-hosted-antilink)
- [Official links](#official-links)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configuration](#configuration)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Support](#support)
- [Documentation](#documentation)
- [FAQ](#faq)

## Introduction

**AntiLink** is a lightweight, self-hostable Discord bot that automatically detects and removes messages containing links in the channels you choose. It was originally built to keep a busy community's general chat free of unwanted and malicious links, and it is the open-source origin of the wider **AntiLink** moderation platform.

The open-source bot is intentionally small and easy to audit: you can read the whole thing, host it yourself, and know exactly what it does with your server's messages.

If you'd rather not self-host, the same team runs a fully-featured **hosted** bot — **AntiLink 2.0** — with a web dashboard, invite/phishing/raid protection, verification, and more. You can [add it to your server in one click][invite]; it's a separate product from this repository (see [below](#this-repo-vs-hosted-antilink)).

## Features

Currently implemented in this repository:

- 🔗 **Automatic link detection** — scans messages in configured channels and removes those containing links.
- ✅ **Channel whitelisting** — designate channels where links are always allowed.
- 🛡️ **Role-based bypass** — members with configured roles (e.g. staff/mods) are exempt from filtering.
- 📣 **Webhook notifications** — report removals/actions to a channel via a Discord webhook (`WEBHOOK_URL`).
- 🪶 **Minimal footprint** — plain Node.js + discord.js, no database required to get started.

> If you spot a discrepancy between this list and the actual code, it's a bug in the docs — please [open an issue][issues]. We keep this section limited to behavior that actually ships.

## This repo vs. hosted AntiLink

There are two ways to run AntiLink. **This repository is the first one.**

| | **This repo** (open-source) | **AntiLink 2.0** ([hosted][invite]) |
| --- | --- | --- |
| How you run it | Self-host the Node.js bot yourself | Invite the hosted bot — nothing to host |
| Link filtering | ✅ Automatic `http(s)://` removal | ✅ Invites, external links, phishing, risk scoring |
| Config | Env vars in `.env` | Slash commands + [web dashboard][dashboard] |
| Whitelist | Channels & roles (via env) | Users, roles, channels, categories, domains |
| Slash commands | ❌ (none) | ✅ `/setup`, `/config`, `/whitelist`, `/guard`, … |
| Raid / member defense | ❌ | ✅ Member Defense, Honeypot, Emergency Lockdown |
| Verification, Automod | ❌ | ✅ Verify gate + Automod presets |
| Cost | Free (MIT) | Free tier + paid plans |

This README documents **only the open-source bot**. For everything in the right-hand column, see the [hosted docs][docs] or [add AntiLink 2.0 to your server][invite].

## Official links

| | |
| --- | --- |
| 🌐 Website | [antil.ink][website] |
| 🛡️ Dashboard | [dashboard.antil.ink][dashboard] |
| 📖 Documentation | [docs.antil.ink][docs] |
| 📈 Status | [status.antil.ink][status] |
| ➕ Add AntiLink 2.0 (hosted) | [invite.antil.ink][invite] |
| 💬 Support & community | [support.antil.ink][discord] |
| 🔒 Privacy Policy | [docs.antil.ink/docs/legal/privacy](https://docs.antil.ink/docs/legal/privacy) |
| 📄 Terms of Service | [docs.antil.ink/docs/legal/terms](https://docs.antil.ink/docs/legal/terms) |

> **Only trust the domains listed above.** AntiLink will never DM you asking for your password, token, or payment details.

## Architecture

The open-source bot follows a simple, single-process design:

```
┌─────────────────────────────────────────────┐
│                Discord Gateway               │
└───────────────────────┬─────────────────────┘
                        │  message events
                        ▼
┌─────────────────────────────────────────────┐
│                 AntiLink Bot                 │
│                                              │
│  ┌────────────┐   ┌───────────────────────┐  │
│  │  Config /  │──▶│   Message Handler      │  │
│  │   .env     │   │  (link detection,      │  │
│  └────────────┘   │   whitelist + bypass)  │  │
│                   └───────────┬───────────┘  │
│                               │ action        │
│                               ▼               │
│                   ┌───────────────────────┐  │
│                   │  Moderation actions    │  │
│                   │  (delete message)      │  │
│                   └───────────┬───────────┘  │
│                               │ notify        │
│                               ▼               │
│                   ┌───────────────────────┐  │
│                   │  Webhook logger        │  │
│                   └───────────────────────┘  │
└─────────────────────────────────────────────┘
```

Slash-command administration is *Planned* (see [Roadmap](#roadmap)); today the
bot is driven entirely by the message-event path shown above plus environment
configuration.

**Design principles**

- **Self-contained.** Runs as a single Node.js process; no external database required for core filtering.
- **Auditable.** Small enough to read end-to-end before you trust it in your server.
- **Configuration over code.** Secrets live in `.env`; behavior is driven by configuration (see [Configuration](#configuration)).

> The commercial AntiLink platform uses a different, service-oriented architecture (dashboard, API, and proprietary detection) that is **not** included here.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) **18 or newer** and npm
- A Discord bot application and token — see [Discord's developer docs](https://discord.com/developers/docs/quick-start/getting-started)
- The bot must be invited to your server with permission to **Read Messages/View Channels**, **Manage Messages**, and (if you use webhook logging) a webhook in your log channel

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/timeout187/Anti-Links-Discord-Bot.git
cd Anti-Links-Discord-Bot

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
#    then edit .env and fill in your values

# 4. Start the bot
npm start
```

## Quick Start

1. **Create a bot** in the [Discord Developer Portal](https://discord.com/developers/applications), copy its **token**, and enable the **Message Content Intent** under *Bot → Privileged Gateway Intents*.
2. **Invite the bot** to your server with the permissions listed above.
3. **Create a webhook** in the channel where you want moderation logs, and copy its URL (optional but recommended).
4. Fill in `.env`, including your whitelisted channels and bypass roles (see [Configuration](#configuration)):

   ```dotenv
   DISCORD_TOKEN=your-bot-token-here
   WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
   WHITELISTED_CHANNEL_IDS=123456789012345678,234567890123456789
   IGNORED_ROLE_IDS=345678901234567890
   ```

5. Run `npm start`. Post a link in a filtered channel from a non-exempt account to confirm it's removed.

## Commands

The community edition currently has **no slash commands** — it runs entirely as
**automatic message filtering**, configured through environment variables.

| Capability | Status | Description |
| ---------- | ------ | ----------- |
| Automatic link filtering | ✅ Available | Deletes any message containing an `http(s)://` link, unless the channel is whitelisted or the author has a bypass role. Runs continuously; no command needed. |
| Webhook moderation log | ✅ Available | Posts a note to your log webhook each time a message is removed. |
| `/antilink …` slash commands | 🗓️ Planned here | This open-source bot has no slash commands yet (on the [Roadmap](#roadmap)). The **hosted [AntiLink 2.0][invite]** bot already has a full slash-command suite (`/setup`, `/config`, `/whitelist`, `/guard`, …) — see the [hosted docs][docs]. |


## Configuration

Secrets are provided through environment variables (`.env`). Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DISCORD_TOKEN` | ✅ | Your Discord bot token. |
| `WEBHOOK_URL` | Optional | Discord webhook URL for moderation logs. Omit to disable webhook logging. |
| `WHITELISTED_CHANNEL_IDS` | Optional | Comma-separated channel IDs where links are always allowed. |
| `IGNORED_ROLE_IDS` | Optional | Comma-separated role IDs whose members bypass link filtering. |

> **Never commit your `.env` file or bot token.** `.gitignore` already excludes `.env`. If a token is ever exposed, regenerate it immediately in the Developer Portal.

## Screenshots

_Coming soon — captures of a link removal and the webhook moderation log will live in `docs/screenshots/`._

## Roadmap

Direction for **this open-source bot**. Unchecked items are not shipped here yet.

- [x] Migrate configuration out of code into an environment-driven setup
- [ ] Slash-command administration (`/antilink …`)
- [ ] Configurable actions beyond deletion (warn, timeout, escalate)
- [ ] Per-guild settings with optional persistence
- [ ] Structured logging + optional webhook embeds
- [ ] Test suite and typed codebase

### The hosted AntiLink platform

Many of the above already exist — and much more — in the **hosted AntiLink 2.0** bot, which is a **separate product, not part of this repository**. It is not on this repo's roadmap; it's listed so you know what's available if you'd rather not self-host. [Add it to your server][invite] or read the [hosted docs][docs].

- 🛡️ **[Web dashboard][dashboard]** — manage protection, whitelists, and logs from the browser
- 🔗 **Advanced link protection** — Discord invites, external links, phishing & risk scoring, enforcement modes (delete / quarantine / warn)
- 🧰 **Full slash-command suite** — `/setup`, `/config`, `/whitelist`, `/checklink`, `/language`, and more
- 🚨 **Member Defense** — raid detection, account-age screening, quarantine automation *(AntiLink Premium)*
- 🍯 **Honeypot trap channels** & **Emergency Lockdown**
- ✅ **Verify** — one-click member verification gate
- 🤖 **Automod** — preset spam / bad-words / caps / mention filters
- 🎭 **Custom bot** — run AntiLink under your own name & avatar *(AntiLink Premium)*
- 💳 **Plans** — Free, Premium, and AntiLink Premium (billing via Paddle)

Have an idea for the **open-source bot**? [Open a feature request][issues].

## Contributing

Contributions are welcome and appreciated. Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** and our **[Code of Conduct](./CODE_OF_CONDUCT.md)** before you start.

The short version:

1. Fork the repo and create a branch from `main`.
2. Make your change with clear, focused commits.
3. Run linting locally before pushing.
4. Open a pull request using the template and describe what and why.

Good first contributions: documentation fixes, config externalization, tests, and the *Planned* roadmap items above.

## Security

Please **do not** report security vulnerabilities through public issues. See **[SECURITY.md](./SECURITY.md)** for how to report responsibly.

## License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for details.

## Support

- 💬 **Community help:** [AntiLink Discord][discord]
- 🐛 **Bugs & features:** [GitHub Issues][issues]
- 📖 **Guides:** [Documentation][docs]

## Documentation

This README is the complete guide to the **self-hosted open-source bot**. The documentation site at **[docs.antil.ink][docs]** covers the **hosted AntiLink 2.0** platform — dashboard, slash commands, plans, and the security suite — which is a separate product from this repository.

## FAQ

**Is AntiLink free?**
The bot in this repository is free and open-source under the MIT license. Hosted/commercial platform products are separate.

**Do I need a database?**
No. Core link filtering runs without one. Persistence is only needed for *Planned* features like per-guild settings.

**Why are my links not being deleted?**
Check that (1) the **Message Content Intent** is enabled, (2) the bot has **Manage Messages** in that channel, (3) the channel isn't whitelisted, and (4) your account doesn't hold a bypass role.

**Does it work with the latest discord.js?**
The bot targets discord.js v14 and Node.js 18+. If you hit a version issue, please [open an issue][issues].

**What's the difference between this and "AntiLink 2.0"?**
This repo is the original, self-hostable open-source bot — automatic link filtering, configured with env vars. **AntiLink 2.0** is the separate **hosted** product with a dashboard, slash commands, raid defense, verification, and paid plans. [Add it to your server][invite] or see the [comparison](#this-repo-vs-hosted-antilink).

**Can I use this commercially?**
Yes — MIT permits commercial use. You're responsible for your own hosting and compliance.

---

<div align="center">

Built and maintained by the AntiLink community. Star ⭐ the repo if it's useful!

</div>

<!-- Reference links -->
[website]: https://antil.ink "AntiLink website"
[docs]: https://docs.antil.ink/ "AntiLink documentation"
[dashboard]: https://dashboard.antil.ink "AntiLink web dashboard (hosted)"
[status]: https://status.antil.ink "AntiLink status page"
[invite]: https://invite.antil.ink "Add the hosted AntiLink 2.0 bot to your server"
[discord]: https://support.antil.ink/ "AntiLink support & community Discord"
[issues]: https://github.com/timeout187/Anti-Links-Discord-Bot/issues
