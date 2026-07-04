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
- The vendor-neutral project-control source of truth is `project.manifest.json`; `.doctrine/project.json` is the Sylphx Doctrine adapter and org-local governance catalog.

## Agent Entry

Before changing behavior, read this file, `project.manifest.json`, `.doctrine/project.json`, the affected package README, and the relevant package tests. Keep Cat zero-knowledge of downstream products.

## Project Control

`project.manifest.json` is the vendor-neutral GroundAtlas control file for external agents and fleet dogfooding. `.doctrine/project.json` remains the Sylphx Doctrine adapter and local governance catalog. Generated `.groundatlas*` reports are evidence and navigation only; they are not source of truth.
