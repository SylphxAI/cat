# Cat Project Boundary

Cat is the Sylphx TypeScript logging package ecosystem. Its purpose is to ship small, portable, typed logging packages for structured logs, transports, formatting, tracing, redaction, OTLP export, and tail sampling.

## Goals

- Keep the `@sylphx/cat` package family production-ready for npm consumers.
- Preserve package boundaries across `packages/*` so optional transports and observability features remain independently usable.
- Maintain tests, docs, examples, benchmark claims, bundle-size claims, and Changesets release intent for package changes.

## Non-Goals

- Do not own Sylphx Platform observability infrastructure, log ingestion, tracing backends, billing, deployment, or runner policy.
- Do not add downstream application-specific schemas, retention rules, customer policy, or product analytics behavior here.
- Do not redefine organization-wide release automation from this repo.

## Required Records

- Public API, package boundary, benchmark, release, or roadmap decisions should be recorded in ADRs under `docs/adr/` before they become durable policy.
- Package publication uses Changesets release intent in `.changeset/` and the shared release workflow.
- The machine-readable project source of truth is `.doctrine/project.json`.

## Agent Entry

Before changing behavior, read `.doctrine/project.json`, this file, the affected package README, and the relevant package tests. Keep Cat zero-knowledge of downstream products.
