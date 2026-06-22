# Agent Instructions

Engineering doctrine: https://github.com/SylphxAI/doctrine

Before changing behavior, read:

1. `PROJECT.md` for this repository's goal, lifecycle, boundary, public
   surfaces, delivery proof, and package release posture.
2. `.doctrine/project.json` for the machine-readable project manifest.
3. The central doctrine entry points: `AGENTS.md`, `PRINCIPLES.md`, and
   `ADR.md` in `SylphxAI/doctrine`.
4. `.claude/CLAUDE.md` for repo-local Bun defaults.
5. The triggered `standards/*.md` files from doctrine for the task.

This file is a thin runtime adapter. Keep enterprise policy in
`SylphxAI/doctrine`; keep only repo-local commands, hazards, and validation
notes here.

## Local Commands

- `bun install` - install dependencies.
- `bun run check` - Biome check.
- `bun test` - Bun tests.
- `bun run build` - build package outputs.
- `bun run docs:build` - build VitePress docs.

## Local Hazards

- Cat is a public logging/observability package monorepo. Package exports,
  logger API, redaction, tracing, OTLP, sampling, and transport behavior are
  public contracts.
- Release workflow delegates to the org reusable release workflow and inherited
  secrets. Published npm versions are forward-fix-only.
- Logging/redaction changes can affect privacy and compliance posture for
  downstream applications.

## Reporting

When reporting work, separate local diff, PR state, CI state, merge state,
release state, npm publish state, documentation publish state, and package
readback proof.
