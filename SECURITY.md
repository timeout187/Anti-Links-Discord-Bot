# Security Policy

The AntiLink Guard OSS maintainers take the security of this project and the
servers that run it seriously. Thank you for helping keep the community safe.

## Supported Versions

Security fixes are provided for the latest release on the `main` branch.
Older tags are not maintained.

| Version         | Supported |
| --------------- | --------- |
| `main` (latest) | ✅        |
| Older tags      | ❌        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, use **GitHub Security Advisories**: open a private report via this
repository's **Security → Report a vulnerability** tab. This is the
preferred and fastest channel - only maintainers can see the report until
you agree to disclose it.

Please include, where possible:

- A description of the vulnerability and its impact
- Steps to reproduce or a proof of concept
- The affected package (`core`, `storage`, `discord-bot`, `cli`) or app
  (`example-bot`, `dashboard-lite`) and version/commit
- Any suggested remediation

## What to Expect

- **Acknowledgement** within a few business days.
- An assessment and, if confirmed, a plan and timeline for a fix.
- Credit in the release notes if you'd like it (let us know your preference).

We ask that you give us a reasonable opportunity to address the issue before
any public disclosure. We support coordinated disclosure and will work with
you on timing.

## Threat Model

See [`docs/threat-model.md`](./docs/threat-model.md) for what this project
does and does not defend against, and what data it stores.

## Scope

This policy covers the packages and apps in this repository. This is an
independent open-source project; it is not the reporting channel for any
unrelated hosted or commercial Discord bot product, even one with a similar
name.

## Good Practices for Self-Hosters

- Never commit your `.env` or bot token. Rotate any leaked token immediately.
- Grant the bot only the permissions it needs (View Channels, Send Messages,
  Manage Messages, and Moderate Members only if you use `timeout` mode).
- `apps/dashboard-lite` has **no authentication** - never expose it to the
  public internet (see its README).
- Keep Node.js and dependencies up to date - Dependabot is enabled for npm,
  GitHub Actions, and the example bot's Docker base image.
- CodeQL static analysis runs on every push and pull request to `main`.
