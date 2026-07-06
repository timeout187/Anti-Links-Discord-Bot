# Self-Hosting

## Option A: bare Node.js

```bash
git clone https://github.com/timeout187/antilink-guard.git
cd antilink-guard
pnpm install
pnpm run build

cp apps/example-bot/.env.example apps/example-bot/.env
# edit apps/example-bot/.env

pnpm --filter @antilink-guard/example-bot run register-commands
pnpm --filter @antilink-guard/example-bot run start
```

Run it under a process manager (`systemd`, `pm2`, etc.) for production so it
restarts on crash or reboot. This project doesn't ship a systemd unit file
or process-manager config - contributions welcome.

## Option B: Docker Compose

```bash
cp apps/example-bot/.env.example apps/example-bot/.env
# edit apps/example-bot/.env
docker compose up --build -d
```

This builds the whole workspace inside the container (see
[`apps/example-bot/Dockerfile`](../apps/example-bot/Dockerfile)) and runs
the bot under a non-root user, with a named Docker volume
(`antilink-data`) persisting the SQLite file across restarts and rebuilds.

```bash
docker compose logs -f     # tail logs
docker compose down        # stop (data volume is preserved)
```

## Choosing a storage backend

Set `DATABASE_DRIVER` in `apps/example-bot/.env`:

| `DATABASE_DRIVER`            | Also required                                                                 | Notes                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| `sqlite` (default)           | `DATABASE_SQLITE_PATH` (optional, defaults to `./data/antilink.sqlite`)       | No separate server. Directory is created automatically. |
| `mysql`                      | `DATABASE_MYSQL_URL`, e.g. `mysql://user:pass@host:3306/antilink_guard`       | Requires a running MySQL/MariaDB 8+ server              |
| `postgres` (or `postgresql`) | `DATABASE_POSTGRES_URL`, e.g. `postgres://user:pass@host:5432/antilink_guard` | Requires a running PostgreSQL server                    |

The selection logic lives in
[`apps/example-bot/src/create-storage.ts`](../apps/example-bot/src/create-storage.ts)
if you're building your own bot on top of `@antilink-guard/discord-bot`
instead of using the example app directly - it's a small, standalone
function you can copy or import the underlying adapters yourself (see
[api-reference.md](./api-reference.md)).

All three adapters implement the exact same `StorageAdapter` interface and
are validated by the same test suite, so switching drivers doesn't change
bot behavior - only where the data lives.

## Environment variables

### `apps/example-bot`

| Variable                | Required                 | Description                                                          |
| ----------------------- | ------------------------ | -------------------------------------------------------------------- |
| `DISCORD_TOKEN`         | Yes                      | Bot token                                                            |
| `DISCORD_CLIENT_ID`     | For command registration | Application ID                                                       |
| `DISCORD_GUILD_ID`      | No                       | Register commands to one server (instant) instead of globally (~1hr) |
| `DATABASE_DRIVER`       | No                       | `sqlite` (default) / `mysql` / `postgres`                            |
| `DATABASE_SQLITE_PATH`  | If using SQLite          | Defaults to `./data/antilink.sqlite`                                 |
| `DATABASE_MYSQL_URL`    | If using MySQL           | Connection string                                                    |
| `DATABASE_POSTGRES_URL` | If using PostgreSQL      | Connection string                                                    |
| `LOG_LEVEL`             | No                       | `trace`\|`debug`\|`info`\|`warn`\|`error`\|`silent`, default `info`  |

### `apps/dashboard-lite`

| Variable               | Required | Description                                        |
| ---------------------- | -------- | -------------------------------------------------- |
| `DATABASE_SQLITE_PATH` | No       | Should point at the **same** database the bot uses |
| `PORT`                 | No       | Defaults to `4000`                                 |

## Updating

```bash
git pull
pnpm install
pnpm run build
pnpm --filter @antilink-guard/example-bot run register-commands   # only if commands changed - see CHANGELOG.md
docker compose up --build -d   # if using Docker
```

## Logging

`packages/discord-bot` uses [pino](https://getpino.io), emitting structured
JSON logs to stdout. For human-readable output while developing:

```bash
pnpm --filter @antilink-guard/example-bot run start | npx pino-pretty
```

Set `LOG_LEVEL=silent` to suppress logs entirely (used automatically in
this repo's own test suite).
