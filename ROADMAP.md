# Roadmap

Direction for **AntiLink Guard OSS**, the self-hostable framework in this
repository. Unchecked items are not shipped yet. Have an idea that isn't
here? Open a [feature request][issues].

## Shipped (v0.1.0)

- [x] `packages/core` - URL/invite extraction (including defanged links,
      punycode, zero-width-character obfuscation, markdown links), domain
      allow/blocklist and known-phishing classification, URL shortener and
      homoglyph detection, custom regex rules, and the
      ALLOW/WARN/BLOCK/QUARANTINE policy engine
- [x] `packages/storage` - memory, SQLite (default), MySQL, and PostgreSQL
      adapters behind one interface, plus config export/import bundles
- [x] `packages/discord-bot` - the discord.js v14 adapter: all slash
      commands, the message moderation pipeline, permission-gated
      delete/timeout, metadata-only audit logging, mod-log embeds, and a
      moderation-action rate limiter
- [x] `packages/cli` - the `antilink` command (`scan`, `test-url`, `init`,
      `export-config`, `import-config`, `doctor`)
- [x] `apps/example-bot` - a working self-hosted example with Docker Compose
- [x] `apps/dashboard-lite` - a minimal local read-only dashboard

## Near-term

- [ ] Per-channel exemption management via slash commands (the policy
      engine already supports per-channel rules; there's no `/channel-rule`
      command yet)
- [ ] Configurable timeout duration (currently a fixed 10-minute default)
- [ ] A public, opt-in domain reputation feed format that
      `knownPhishingDomains` can be populated from, so servers can share
      blocklists without this project bundling one itself
- [ ] Structured, queryable audit log filtering (by user, channel, verdict,
      date range) in `dashboard-lite`
- [ ] A test suite that runs `packages/discord-bot`'s message pipeline
      against recorded fixture message payloads for regression coverage
      beyond unit-level fakes

## Later / exploratory

- [ ] Optional Discord OAuth login for `dashboard-lite`, clearly documented
      as opt-in (see its README's "no authentication" note) - not a
      prerequisite for using the dashboard locally
- [ ] Multi-guild management in a single dashboard session
- [ ] A plugin/hook interface in `packages/core` for custom detection rules
      beyond regex (e.g. calling an external API)
- [ ] Sharding guidance/support in `packages/discord-bot` for very large
      self-hosted deployments

## Explicitly out of scope for this project

This framework is deliberately the **open-source, self-hostable** piece.
The following are different products/concerns and won't be built here:

- Billing, subscriptions, or license management
- Managed hosting or multi-tenant infrastructure
- A hosted, authenticated, multi-admin web dashboard (that's a different
  product; `dashboard-lite` stays local and read-only by design)

[issues]: https://github.com/timeout187/antilink-guard/issues
