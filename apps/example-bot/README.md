# AntiLink Guard OSS - example bot

A minimal, working self-hosted bot built entirely from the published
`@antilink-guard/*` packages. This is the fastest way to run AntiLink Guard
OSS in your own server - clone the repo, fill in a `.env`, and go.

## 1. Create a Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**.
2. Under **Bot**, click **Reset Token** to get your bot token, and enable the
   **Message Content Intent** (required - the bot reads message text to scan for links).
3. Under **General Information**, copy the **Application ID** (this is your `DISCORD_CLIENT_ID`).
4. Under **OAuth2 -> URL Generator**, select the `bot` and `applications.commands` scopes, and these
   bot permissions:
   - View Channels
   - Send Messages
   - Manage Messages (to delete flagged messages)
   - Moderate Members (to time out members, only used in `timeout` mode)
   - Embed Links (for mod-log embeds)
5. Open the generated URL and invite the bot to your test server.

## 2. Configure

From the repository root:

```bash
pnpm install
cp apps/example-bot/.env.example apps/example-bot/.env
```

Edit `apps/example-bot/.env`:

| Variable                | Required                 | Description                                                                                                                                  |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`         | Yes                      | Your bot's token.                                                                                                                            |
| `DISCORD_CLIENT_ID`     | For command registration | Your application's ID.                                                                                                                       |
| `DISCORD_GUILD_ID`      | No                       | Register commands to one server for instant updates during development. Leave blank to register globally (takes up to ~1 hour to propagate). |
| `DATABASE_DRIVER`       | No                       | `sqlite` (default), `mysql`, or `postgres`.                                                                                                  |
| `DATABASE_SQLITE_PATH`  | If using SQLite          | Defaults to `./data/antilink.sqlite`.                                                                                                        |
| `DATABASE_MYSQL_URL`    | If using MySQL           | e.g. `mysql://user:password@localhost:3306/antilink_guard`.                                                                                  |
| `DATABASE_POSTGRES_URL` | If using PostgreSQL      | e.g. `postgres://user:password@localhost:5432/antilink_guard`.                                                                               |
| `LOG_LEVEL`             | No                       | `trace`\|`debug`\|`info`\|`warn`\|`error`\|`silent`. Defaults to `info`.                                                                     |

## 3. Register slash commands

Slash commands must be registered once (and again whenever they change):

```bash
pnpm --filter @antilink-guard/example-bot build
pnpm --filter @antilink-guard/example-bot run register-commands
```

## 4. Run it

```bash
pnpm --filter @antilink-guard/example-bot run start
```

You should see `AntiLink Guard OSS is ready` logged once the bot connects. Run
`/antilink status` in your server to confirm, then `/antilink enable` and
`/antilink mode block` to turn on protection.

## Docker Compose

From the repository root, with `apps/example-bot/.env` already filled in:

```bash
docker compose up --build
```

This builds the whole workspace inside the container and runs the bot with a
persistent named volume for its SQLite database (`antilink-data`), so your
configuration survives container restarts and rebuilds.

## Storage

Defaults to **SQLite** - a single file, no separate database server to run.
Set `DATABASE_DRIVER=mysql` or `DATABASE_DRIVER=postgres` (with the matching
`DATABASE_MYSQL_URL` / `DATABASE_POSTGRES_URL`) to use a real database server
instead; see [`src/create-storage.ts`](./src/create-storage.ts) and
[`docs/self-hosting.md`](../../docs/self-hosting.md).

## What this example does and does not include

- Includes: the full moderation pipeline and all slash commands.
- Does not include: a web dashboard (see `apps/dashboard-lite`) or multi-shard
  scaling - see [ROADMAP.md](../../ROADMAP.md) for what's planned.
