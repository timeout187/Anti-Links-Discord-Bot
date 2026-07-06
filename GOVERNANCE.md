# Governance

AntiLink Guard OSS is a community-maintained open-source project. This
document describes how decisions get made today, and how that's expected to
evolve as the project and its contributor base grow.

## Current model: maintainer-led

Right now, the project has a small set of maintainers (starting with the
repository owner) who:

- Review and merge pull requests
- Triage issues and label them
- Cut releases and maintain `CHANGELOG.md`
- Set direction via [`ROADMAP.md`](./ROADMAP.md)

Maintainers make final decisions on scope and direction, but design
discussions happen in the open on GitHub issues and pull requests - not
privately. Anyone is welcome to propose changes, including changes to how
the project is governed.

## Becoming a maintainer

There's no formal application process yet. In practice, consistent,
high-quality contributions (code review, well-scoped PRs, thoughtful issue
triage) over time are how existing maintainers identify and invite new
maintainers. As the contributor base grows, this document will be updated
with more concrete criteria.

## Decision-making

- **Small changes** (bug fixes, docs, dependency bumps): a single
  maintainer's review and approval is enough to merge.
- **Larger changes** (new packages, breaking API changes, changes to the
  detection/scoring model in `packages/core`): should be discussed in an
  issue before a PR is opened, so design disagreements surface before code
  is written.
- **Disagreements** are resolved by discussion first. If maintainers cannot
  reach consensus, the repository owner makes the final call, but this is
  meant to be rare - most decisions should be uncontroversial once discussed.

## Scope boundary

This project is deliberately **the open-source, self-hostable framework
only**. Maintainers are not obligated to add features that only make sense
for a hosted, multi-tenant, or paid service (billing, OAuth-based
multi-admin dashboards, managed infrastructure). Those are out of scope by
design, not by oversight - see the "background" note in
[`README.md`](./README.md) for context on why.

## Code of Conduct

All participation in this project - issues, pull requests, reviews,
discussions - is governed by [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
Maintainers are responsible for enforcing it fairly and consistently.

## Changing this document

Governance changes are proposed the same way as any other change: open a
pull request. Given the project's current size, meaningful changes to this
document should be flagged clearly in the PR description so they get
visibility beyond a routine review.
