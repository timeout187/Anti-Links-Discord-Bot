# AntiLink Guard OSS - dashboard-lite

A minimal, **local, read-only** dashboard for a self-hosted AntiLink Guard OSS
bot. It reads directly from the same SQLite database your `example-bot`
instance uses and shows:

- Bot status for a guild (enabled, mode, log channel, counts)
- The full guild configuration
- Allowlist and blocklist entries
- The 50 most recent audit log entries

It does **not** modify anything - all configuration changes go through the
bot's slash commands (`/antilink`, `/allowlist`, `/blocklist`, `/invites`,
`/logs`).

## Important: no authentication

This tool has **no login, no sessions, and no Discord OAuth**. It is meant to
run on `localhost` next to your bot for your own use. **Do not expose it to
the public internet** - anyone who can reach it can read your server's full
moderation configuration and audit history.

If you want a hosted, authenticated, multi-admin dashboard, that is a
separate concern from this OSS framework (see the project README's
"hosted platform" note). Adding real Discord OAuth here is tracked as a
documented, opt-in future enhancement - not something this tool does by
default.

## Setup

```bash
pnpm install
cp apps/dashboard-lite/.env.example apps/dashboard-lite/.env
```

Point `DATABASE_SQLITE_PATH` in `.env` at the same SQLite file your
`example-bot` is using (the default assumes both apps run from a sibling
directory layout, as in this repo).

```bash
pnpm --filter @antilink-guard/dashboard-lite build
pnpm --filter @antilink-guard/dashboard-lite run start
```

Open `http://localhost:4000`, enter your server's guild ID, and click **Load**.

## Finding your guild ID

In Discord, enable Developer Mode (User Settings -> Advanced), then right-click
your server's icon and choose **Copy Server ID**.
