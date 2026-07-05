# Contributing to AntiLink

First off — thank you for taking the time to contribute! This is the open-source
edition of AntiLink, and it only gets better with community help.

This document explains how to propose changes. By participating, you agree to
follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
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

- 📝 Improve documentation and examples
- 🐛 Report bugs with clear reproduction steps
- 💡 Suggest features (check the [Roadmap](./README.md#roadmap) first)
- 🧪 Add tests
- 🔧 Pick up a *Planned* roadmap item

## Development Setup

**Prerequisites:** Node.js 18+ and npm.

```bash
# Fork, then clone your fork
git clone https://github.com/<your-username>/Anti-Links-Discord-Bot.git
cd Anti-Links-Discord-Bot

# Install dependencies
npm install

# Copy the environment template and fill in a TEST bot's credentials
cp .env.example .env
```

> Always develop against a **test bot and test server** — never a production token.

Useful scripts (see `package.json`):

```bash
npm start           # run the bot
npm run lint        # lint the codebase (if configured)
npm test            # run tests (if configured)
```

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
feat(filter): support wildcard channel whitelists
fix(webhook): handle missing WEBHOOK_URL gracefully
docs(readme): clarify Message Content Intent requirement
```

## Coding Standards

- Match the existing style; run the linter before pushing.
- Prefer small, well-named functions over large blocks.
- Never log or commit secrets. `.env` is gitignored — keep it that way.
- Document non-obvious behavior with brief comments.
- Don't introduce features that aren't discussed in an issue first for larger changes.

## Pull Requests

1. Ensure your branch is up to date with `main`.
2. Run linting/tests locally and make sure they pass.
3. Fill out the pull request template completely.
4. Link the issue your PR resolves (e.g. `Closes #123`).
5. Be responsive to review feedback — we aim to keep reviews friendly and quick.

A maintainer will review as soon as they can. Please be patient; this is
community-maintained.

## Reporting Bugs

Open a [bug report][issues] using the template. Include:

- What you expected vs. what happened
- Steps to reproduce
- Node.js and discord.js versions
- Relevant logs (with secrets redacted)

## Suggesting Features

Open a [feature request][issues]. Explain the problem you're trying to solve,
not just the solution — that helps us find the best fit for the project.

## Security Issues

**Do not open a public issue for security problems.** Follow the process in
[SECURITY.md](./SECURITY.md).

---

Thanks again for contributing! 💜

[issues]: https://github.com/timeout187/Anti-Links-Discord-Bot/issues
