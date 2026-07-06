# Migrating from the old Anti-Links-Discord-Bot

This repository was originally a single `index.js` file (still visible in
this repo's git history, before the `feat!: begin AntiLink Guard OSS
migration` commit). If you were running that version, here's how its
behavior maps onto the new framework - **there is no automated migration
script**, since the old bot had no database to migrate from; this is a
manual mapping guide.

## What the old bot did

```js
// old index.js, roughly
const whitelistedChannels = ['1141168430620348517', ...]; // hardcoded
const ignoredRoles = ['839237666545205248', ...];          // hardcoded

client.on('messageCreate', (message) => {
  if (message.content.match(/https?:\/\/\S+/gi)) {
    if (!whitelistedChannels.includes(message.channel.id) &&
        !hasIgnoredRole(message.member)) {
      message.delete();
      sendLogToWebhook(`Deleted message from ${message.author.tag}...`);
    }
  }
});
```

It had: a hardcoded channel whitelist, a hardcoded role bypass list, basic
`https?://` detection (no defanging/punycode/homoglyph handling), a
Discord webhook for logging, and no persistence, no slash commands, and no
per-guild configuration - it was hardcoded for one specific server.

## What replaces each piece

| Old bot                                     | AntiLink Guard OSS                                                                                                                                                                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardcoded `whitelistedChannels` array       | `/logs`... actually: per-channel exemptions aren't yet a slash command (see [ROADMAP.md](../ROADMAP.md)) - for now, set `channelRules: [{ channelId, mode: "exempt" }]` in a local policy file if using the CLI, or exempt via the database directly |
| Hardcoded `ignoredRoles` array              | `bypassRoleIds` on `GuildConfig` - not yet exposed via slash command either (see [ROADMAP.md](../ROADMAP.md)); set it directly via `/config import` with a hand-edited config bundle, or via `packages/storage`'s API                                |
| `WEBHOOK_URL` + manual webhook POST         | `/logs set-channel channel:<#channel>` - the bot posts a proper embed to a normal channel, no separate webhook to manage                                                                                                                             |
| `message.content.match(/https?:\/\/\S+/gi)` | `packages/core`'s `extractLinks`/`evaluateMessage` - handles defanged links, punycode, homoglyphs, markdown links, and Discord invites, none of which the old regex caught                                                                           |
| Always deletes                              | Configurable via `/antilink mode <block\|warn\|log>` - the old behavior is closest to `block`                                                                                                                                                        |
| One server, no config UI                    | Per-guild configuration via slash commands, backed by a real database (SQLite/MySQL/PostgreSQL)                                                                                                                                                      |

## Step by step

1. Set up the new bot per [getting-started.md](./getting-started.md) - new
   application, new token recommended (rotate rather than reuse the old
   bot's token if you're replacing it in place).
2. `/antilink enable`
3. `/antilink mode block` (closest match to the old bot's always-delete behavior)
4. Re-add your old bypass roles: for each role ID that was in the old
   `ignoredRoles` array, you currently need to set `bypassRoleIds` directly
   (see the table above) - a slash command for this is planned but not
   shipped yet.
5. Re-add your old whitelisted channels the same way, via `channelRules`
   with `mode: "exempt"`.
6. `/logs set-channel channel:#your-mod-log-channel` - replaces the old
   `WEBHOOK_URL`. You can delete the old webhook once this is confirmed
   working.
7. Test: post a link from a non-exempt account - it should be deleted and
   logged to your new mod-log channel.

## Behavior differences to expect

- **Broader detection.** Links the old regex missed (defanged, punycode,
  homoglyph, markdown-wrapped) will now be caught. If you relied on people
  being able to post `hxxps://` links to work around the old bot, that no
  longer works.
- **No implicit admin bypass in either version** - this hasn't changed:
  neither the old bot nor the new one auto-exempts server admins. Bypass is
  always explicit (role/user lists).
- **Persistence.** Configuration now survives a bot restart/redeploy
  without needing to edit and redeploy source code, once it's set.
