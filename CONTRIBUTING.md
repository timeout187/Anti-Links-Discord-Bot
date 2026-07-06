# Contributing to AntiLink Guard OSS

Thank you for taking the time to contribute! AntiLink Guard OSS is a
community-maintained, self-hostable Discord anti-phishing and link
moderation framework, and it only gets better with community help.

By participating, you agree to follow our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Project Layout](#project-layout)
- [Development Setup](#development-setup)
- [Branching & Workflow](#branching--workflow)
- [Commit Messages](#commit-messages)
- [Coding Standards](#coding-standards)
- [Pull Requests](#pull-requests)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Security Issues](#security-issues)

## Ways to Contribute

You don't have to write code to help:

- 📝 Improve documentation in [`docs/`](./docs)
- 🐛 Report bugs with clear reproduction steps
- 💡 Suggest features (check [ROADMAP.md](./ROADMAP.md) first)
- 🧪 Add tests
- 🔧 Pick up a roadmap item or an issue labeled `good first issue`

## Project Layout

This is a pnpm workspace monorepo:

```
apps/
  example-bot/      a working, minimal self-hosted bot built on the packages below
  dashboard-lite/   a local read-only dashboard
packages/
  core/             URL extraction, classification, and the policy engine (no discord.js)
  storage/          memory / SQLite / MySQL / PostgreSQL storage adapters
  discord-bot/      the discord.js v14 adapter: slash commands + moderation pipeline
  cli/              the `antilink` command-line tool
docs/               user-facing documentation
```

`packages/core` has no runtime dependency on Discord or any storage backend -
if you're fixing detection logic, you almost always want to be here.

## Development Setup

**Prerequisites:** Node.js 20+ and [pnpm](https://pnpm.io) (`corepack enable`
will install the version this repo pins via `packageManager`).

```bash
# Fork, then clone your fork
git clone https://github.com/<your-username>/antilink-guard.git
cd antilink-guard

# Install dependencies for the whole workspace
pnpm install

# Build every package (required once before typecheck/lint/tests can resolve
# workspace packages like @antilink-guard/core - see Coding Standards)
pnpm run build
```

To run just one package's tests while iterating:

```bash
pnpm --filter @antilink-guard/core test
pnpm --filter @antilink-guard/core test:watch
```

To try the example bot against a real Discord test server, see
[`apps/example-bot/README.md`](./apps/example-bot/README.md) - always develop
against a **test bot and test server**, never a production token.

## Branching & Workflow

- `main` is the stable branch. Keep it releasable.
- Create a feature branch from `main`:
  - `feat/short-description` for features
  - `fix/short-description` for bug fixes
  - `docs/short-description` for documentation
- Keep pull requests focused. Smaller PRs are reviewed faster.

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(optional scope): <short summary>

<optional body>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.

Examples:

```
feat(core): detect punycode homoglyph domains
fix(discord-bot): handle a null member on role-bypass check
docs(self-hosting): document the MySQL connection string format
```

## Coding Standards

- This repo uses **strict TypeScript**, ESLint (flat config), and Prettier.
  Run `pnpm run lint` and `pnpm run format:check` before pushing.
- Workspace packages resolve each other via their built `dist/` output, not
  TypeScript project references - if you change a package that others
  depend on (most commonly `@antilink-guard/core`), run `pnpm run build`
  before typechecking or testing dependent packages, or their editors/CI
  will report stale or missing types.
- Prefer small, well-named functions over large blocks.
- Never log or commit secrets. `.env` files are gitignored - keep it that way.
- No hardcoded "known phishing domain" lists anywhere in this codebase. That
  data is always guild-supplied configuration, never a bundled database this
  project doesn't actually maintain.
- Don't introduce features that aren't discussed in an issue first for
  larger changes.

## Pull Requests

1. Ensure your branch is up to date with `main`.
2. Run `pnpm run typecheck`, `pnpm run lint`, and `pnpm run test` locally and
   make sure they pass.
3. Fill out the pull request template completely.
4. Link the issue your PR resolves (e.g. `Closes #123`).
5. Be responsive to review feedback - we aim to keep reviews friendly and quick.

A maintainer will review as soon as they can. Please be patient; this is
community-maintained.

## Reporting Bugs

Open a [bug report][issues] using the template. Include:

- What you expected vs. what happened
- Steps to reproduce
- Node.js version and which package/app is affected
- Relevant logs (with secrets redacted)

## Suggesting Features

Open a [feature request][issues]. Explain the problem you're trying to solve,
not just the solution - that helps us find the best fit for the project.

## Security Issues

**Do not open a public issue for security problems.** Follow the process in
[SECURITY.md](./SECURITY.md).

---

Thanks again for contributing!

[issues]: https://github.com/timeout187/antilink-guard/issues
