# API Reference

The public exports of each package, as actually declared in each
package's `src/index.ts`. If you're building your own bot on top of this
framework instead of using `apps/example-bot` directly, this is what you
import.

## `@antilink-guard/core`

No Discord or storage dependency - pure detection/policy logic.

```ts
import {
  evaluateMessage,
  extractLinks,
  classifyLink,
  normalizeUrl,
  stripZeroWidthChars,
  undefangText,
  isPunycodeHostname,
  hasMixedScriptConfusables,
  REASON_SEVERITY,
  VERDICT_THRESHOLDS,
  DEFAULT_URL_SHORTENER_DOMAINS,
} from '@antilink-guard/core';
```

| Export                                             | Signature                                                                                   | What it does                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `evaluateMessage`                                  | `(rawText: string, context: ScanContext, policy: PolicyConfig) => ScanResult`               | The full pipeline: bypasses → extraction → classification → verdict/action             |
| `extractLinks`                                     | `(rawText: string) => ExtractedLink[]`                                                      | Finds and de-obfuscates links/invites in text                                          |
| `classifyLink`                                     | `(link: ExtractedLink, policy: PolicyConfig, rawMessageText: string) => LinkClassification` | Scores a single already-extracted link                                                 |
| `normalizeUrl`                                     | `(rawUrl: string) => { url: string; hostname: string } \| undefined`                        | Lowercases the host, strips tracking params, returns `undefined` for unparseable input |
| `isPunycodeHostname` / `hasMixedScriptConfusables` | `(hostname: string) => boolean`                                                             | The two homoglyph-related checks, individually                                         |
| `REASON_SEVERITY`                                  | `Record<DetectionReason, number>`                                                           | The severity table - see [rules-engine.md](./rules-engine.md)                          |
| `VERDICT_THRESHOLDS`                               | `{ warn: 1, block: 30, quarantine: 60 }`                                                    | The score cutoffs for each verdict                                                     |

Key types: `Verdict`, `DetectionReason`, `EnforcementMode`,
`ModerationActionType`, `ExtractedLink`, `LinkClassification`,
`RegexRule`, `ChannelRule`, `PolicyConfig`, `ScanContext`, `ScanResult`.

```ts
const result = evaluateMessage(
  message.content,
  { guildId, channelId, authorId, authorRoleIds: [], mentionCount: 0 },
  policy,
);
// result.verdict, result.action, result.score, result.reasons, result.matchedLinks
```

## `@antilink-guard/storage`

```ts
import {
  MemoryStorageAdapter,
  SqliteStorageAdapter,
  MysqlStorageAdapter,
  PostgresStorageAdapter,
  createDefaultGuildConfig,
  exportGuildConfigBundle,
  importGuildConfigBundle,
  parseConfigBundle,
  configBundleSchema,
} from '@antilink-guard/storage';
```

All four adapter classes implement the same `StorageAdapter` interface:
`init()`, `close()`, `getGuildConfig`/`upsertGuildConfig`,
`list/add/removeAllowlistEntry`, `list/add/removeBlocklistEntry`,
`list/add/removeInviteRule`, `add/listAuditLogEntries`,
`add/listScanResults`, `add/listModerationActions`.

```ts
const storage = new SqliteStorageAdapter({ filename: './antilink.sqlite' });
await storage.init();
const config = (await storage.getGuildConfig(guildId)) ?? createDefaultGuildConfig(guildId);
```

Config bundle helpers (used by both `/config export`/`import` and the CLI):

```ts
const bundle = await exportGuildConfigBundle(storage, guildId);
const validated = parseConfigBundle(JSON.parse(fileContents)); // throws on invalid shape
await importGuildConfigBundle(storage, validated); // replaceExisting: true by default
```

Data model types: `GuildConfig`, `AllowlistEntry`, `BlocklistEntry`,
`InviteRule`, `AuditLogEntry`, `ScanResultRecord`, `ModerationActionRecord`.

## `@antilink-guard/discord-bot`

```ts
import { createBot, registerCommands, TokenBucketRateLimiter } from '@antilink-guard/discord-bot';

const client = createBot({ storage }); // wires up messageCreate + interactionCreate
await client.login(token);
```

| Export                                                                | Purpose                                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `createBot(options: CreateBotOptions) => Client`                      | Builds a ready-to-login discord.js `Client` with the moderation pipeline and command routing already attached |
| `registerCommands(options: RegisterCommandsOptions) => Promise<void>` | Registers all slash commands via the Discord REST API, guild-scoped or global                                 |
| `handleMessageCreate` / `handleInteractionCreate`                     | The two event handlers `createBot` wires up, exported individually if you want to compose your own `Client`   |
| `enforceScanResult`                                                   | Applies a `ScanResult` to a message: permission-gated delete/timeout, audit log + moderation action recording |
| `buildPolicyConfig(inputs: PolicyInputs) => PolicyConfig`             | Maps stored `GuildConfig` + lists into the shape `evaluateMessage` expects                                    |
| `buildModLogEmbed` / `sendModLog`                                     | Build/send the mod-log embed                                                                                  |
| `TokenBucketRateLimiter`                                              | The generic rate limiter used to cap moderation actions                                                       |
| `allCommands`, `commandsByName`, `getCommandJSONBodies()`             | The slash command registry, if you want to register a subset or inspect the JSON payloads                     |

## `@antilink-guard/cli`

Primarily a command-line tool (`antilink scan|test-url|init|export-config|import-config|doctor` -
see [getting-started.md](./getting-started.md#trying-the-cli-without-any-discord-setup-at-all)),
not intended to be imported as a library. `createProgram()` is exported from
`src/index.ts` if you need to embed its commander.js program elsewhere.

## Dashboard-lite's HTTP API

`apps/dashboard-lite` exposes a small local JSON API consumed by its own
frontend (see [privacy.md](./privacy.md) for why it has no auth):

| Route                                         | Returns                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET /api/guild/:guildId/status`              | `{ guildConfig, counts: { allowlist, blocklist, inviteRules }, lastAuditAt }` |
| `GET /api/guild/:guildId/config`              | The raw `GuildConfig`                                                         |
| `GET /api/guild/:guildId/allowlist`           | `AllowlistEntry[]`                                                            |
| `GET /api/guild/:guildId/blocklist`           | `BlocklistEntry[]`                                                            |
| `GET /api/guild/:guildId/audit-logs?limit=50` | `AuditLogEntry[]`, newest first                                               |
