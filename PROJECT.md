# SylphxAI Cat

SylphxAI/cat is a TypeScript/Bun monorepo for the `@sylphx/cat` logging and observability package ecosystem.

## Lifecycle

- State: `active`
- Layer: `foundation`
- Machine manifest: [`.doctrine/project.json`](./.doctrine/project.json)

## Goals

- Provide the modular `@sylphx/cat` logger core and companion observability packages.
- Own package-level logging, formatting, transport, serialization, redaction, tracing, OTLP export, and tail-sampling behavior.
- Maintain package docs, examples, benchmarks, tests, and the Cat documentation site.

## Non-Goals

- This repository does not own application-specific log schemas, retention policy, alert policy, or telemetry backend operations.
- This repository does not own OpenTelemetry collectors, external vendors, or product runtime observability dashboards.
- This repository does not own enterprise engineering doctrine.

## Boundary

This repository owns the Cat package monorepo, package docs, examples, tests, benchmarks, and release workflow. Consuming services own their logging policy, transport endpoints, secrets, deployment, and operational dashboards.

## Public Surfaces

- Repository README: [`README.md`](./README.md)
- Root package manifest and scripts: [`package.json`](./package.json)
- Core package: [`packages/cat/`](./packages/cat/)
- Companion packages: [`packages/cat-pretty/`](./packages/cat-pretty/), [`packages/cat-file/`](./packages/cat-file/), [`packages/cat-http/`](./packages/cat-http/), [`packages/cat-otlp/`](./packages/cat-otlp/), [`packages/cat-tracing/`](./packages/cat-tracing/), [`packages/cat-redaction/`](./packages/cat-redaction/), [`packages/cat-tail-sampling/`](./packages/cat-tail-sampling/)
- Documentation site: [`docs/`](./docs/)
- Examples and benchmarks: [`examples/`](./examples/), [`benchmarks/`](./benchmarks/)
- CI and release workflows: [`.github/workflows/`](./.github/workflows/)

## Delivery

The repository has Bun/Turborepo CI for pull requests, merge queue, and main pushes, plus a reusable main-branch release workflow. Production proof is passing `bun run check`, tests, build, relevant package benchmarks when behavior changes, release workflow evidence, and package-registry/readme readback for published versions. This manifest slice is documentation-only and does not change package code, CI, release, or docs deployment behavior.
