# Security Policy

The AntiLink team takes the security of this project and the servers that run it
seriously. Thank you for helping keep the community safe.

## Supported Versions

Security fixes are provided for the latest release on the `main` branch. Older
snapshots are not maintained.

| Version | Supported |
| ------- | --------- |
| `main` (latest) | ✅ |
| Older tags | ❌ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, use one of the following private channels:

1. **GitHub Security Advisories** (preferred) — open a private report via the
   repository's **Security → Report a vulnerability** tab.
2. **AntiLink support server** — open a **private ticket** at
   <https://support.antil.ink/> and ask staff to escalate. **Do not** post
   vulnerability details in public channels.

Please include, where possible:

- A description of the vulnerability and its impact
- Steps to reproduce or a proof of concept
- Affected version/commit
- Any suggested remediation

## What to Expect

- **Acknowledgement** within a few business days.
- An assessment and, if confirmed, a plan and timeline for a fix.
- Credit in the release notes if you'd like it (let us know your preference).

We ask that you give us a reasonable opportunity to address the issue before any
public disclosure. We support coordinated disclosure and will work with you on
timing.

## Scope

This policy covers the open-source bot in this repository. Vulnerabilities in
the separate, hosted AntiLink platform products should be reported through the
channels published on the [AntiLink website](https://antil.ink).

## Good Practices for Self-Hosters

- Never commit your `.env` or bot token. Rotate any leaked token immediately.
- Grant the bot only the permissions it needs (Manage Messages, View Channels).
- Keep Node.js and dependencies up to date (Dependabot is enabled in this repo).
