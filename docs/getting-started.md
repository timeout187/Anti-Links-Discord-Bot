# Getting Started

The fastest way to run AntiLink Guard OSS is [`apps/example-bot`](../apps/example-bot),
a working bot assembled entirely from the published `@antilink-guard/*` packages.

## 1. Prerequisites

- [Node.js](https://nodejs.org) 20 or newer
- [pnpm](https://pnpm.io) (`corepack enable` installs the pinned version)
- A Discord account and a test server you can invite a bot to

## 2. Clone and install

```bash
git clone https://github.com/timeout187/antilink-guard.git
cd antilink-guard
pnpm install
pnpm run build
```

`pnpm run build` builds every package in the correct dependency order
(`core` and `storage` first, then `discord-bot`/`cli`, then the apps) -
required once before anything can run, since packages resolve each other
through their built `dist/` output.

## 3. Create a Discord application

See [discord-setup.md](./discord-setup.md) for full detail. In short: create
an application in the [Discord Developer Portal](https://discord.com/developers/applications),
grab its bot token and Application ID, enable the **Message Content Intent**,
and invite it to your test server.

## 4. Configure and run

```bash
cp apps/example-bot/.env.example apps/example-bot/.env
# edit apps/example-bot/.env: DISCORD_TOKEN, DISCORD_CLIENT_ID

pnpm --filter @antilink-guard/example-bot run register-commands
pnpm --filter @antilink-guard/example-bot run start
```

Full walkthrough, including Docker Compose: [`apps/example-bot/README.md`](../apps/example-bot/README.md).

## 5. Turn on protection

In your test server:

```
/antilink enable
/antilink mode block
```

Post a link from a non-admin test account in a channel - it should be
deleted. See [configuration.md](./configuration.md) for allowlists,
blocklists, and invite rules, and [rules-engine.md](./rules-engine.md) for
exactly how a message is scored.

## 6. Optional: the local dashboard

```bash
cp apps/dashboard-lite/.env.example apps/dashboard-lite/.env
pnpm --filter @antilink-guard/dashboard-lite run build
pnpm --filter @antilink-guard/dashboard-lite run start
```

Opens on `http://localhost:4000`. It's local and unauthenticated by
design - see its [README](../apps/dashboard-lite/README.md) before exposing
it anywhere other than your own machine.

## Trying the CLI without any Discord setup at all

```bash
pnpm --filter @antilink-guard/cli build
node packages/cli/dist/index.js scan "check out https://bit.ly/free-nitro"
node packages/cli/dist/index.js test-url https://xn--e1aybc.xn--p1ai
node packages/cli/dist/index.js doctor
```

The detection and policy engine (`packages/core`) has no Discord dependency,
so you can experiment with it entirely offline.

## Where to go next

- [`configuration.md`](./configuration.md) - the guild config model and how slash commands change it
- [`rules-engine.md`](./rules-engine.md) - the detection pipeline in depth
- [`self-hosting.md`](./self-hosting.md) - Docker, database choices, environment variables
- [`api-reference.md`](./api-reference.md) - the package APIs, if you're building on top of this framework
