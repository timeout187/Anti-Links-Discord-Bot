# Discord Setup

## 1. Create the application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Give it a name (this becomes the bot's display name unless you rename it later).

## 2. Get your credentials

- **Bot token**: **Bot** tab → **Reset Token**. This is `DISCORD_TOKEN`.
  Treat it like a password - anyone with it fully controls your bot.
- **Application ID**: **General Information** tab. This is `DISCORD_CLIENT_ID`,
  needed only for registering slash commands.

## 3. Enable the Message Content Intent

Still on the **Bot** tab, under **Privileged Gateway Intents**, enable
**Message Content Intent**. Without this, the bot receives messages with an
empty `content` field and cannot scan anything - the CI-tested code path
requires this intent to function at all.

## 4. Required bot permissions

Generate an invite URL from **OAuth2 → URL Generator**:

- Scopes: `bot`, `applications.commands`
- Bot permissions:

| Permission       | Why                                                               |
| ---------------- | ----------------------------------------------------------------- |
| View Channels    | Required to see messages at all                                   |
| Send Messages    | Required to reply to slash commands                               |
| Manage Messages  | Required to delete flagged messages (`delete`/`warn`... see note) |
| Moderate Members | Required only if you use `timeout` mode                           |
| Embed Links      | Required to post mod-log embeds                                   |

> **Note on `warn` mode:** `warn` mode does not delete messages, so it
> doesn't strictly require Manage Messages - but grant it anyway so you can
> switch modes later without re-inviting the bot. If Manage Messages is
> missing, the bot logs a warning and skips deletion rather than crashing
> (see [threat-model.md](./threat-model.md)); it never assumes permissions
> it doesn't have.

## 5. Invite the bot

Open the generated URL and select your test server. **Always test against a
server you control** before running this in a real community.

## 6. Register slash commands

```bash
pnpm --filter @antilink-guard/example-bot run register-commands
```

This registers: `/antilink`, `/allowlist`, `/blocklist`, `/invites`, `/logs`,
`/testlink`, `/config`. Set `DISCORD_GUILD_ID` in your `.env` to register to
one server only - guild commands update instantly, which is much faster to
iterate on than global commands (which can take up to an hour to propagate
to all servers).

## 7. Verify

```
/antilink status
/antilink enable
/antilink mode block
```

Post a link from a non-admin test account in a non-exempt channel - it
should be deleted within a second or two.

### Nothing happens when I post a link?

1. Message Content Intent enabled? (step 3)
2. Bot has Manage Messages in that channel?
3. Is the domain or invite on an allowlist?
4. Testing with a server admin account and expecting it to be exempt? **It
   won't be, by default.** Unlike some moderation bots, this one does not
   automatically exempt Administrator/Manage Server permission holders -
   the only exemptions are the explicit `bypassRoleIds`/`bypassUserIds` in
   the guild's configuration (not yet settable via a slash command - see
   [configuration.md](./configuration.md)). If you haven't configured any
   bypasses, every account's messages are scanned, including yours.
