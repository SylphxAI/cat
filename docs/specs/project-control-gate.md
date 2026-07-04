# Project Control Gate

## Purpose

Make Cat dogfood GroundAtlas as a vendor-neutral project-control consumer while preserving Cat's package-specific release and observability-library boundaries.

## Truth Boundary

- `project.manifest.json` is the vendor-neutral GroundAtlas control file.
- `.doctrine/project.json` is the Sylphx Doctrine adapter and org-local governance catalog.
- Generated `.groundatlas*` and `.groundatlas-pilot/**` files are evidence/navigation only, not source of truth.
- Public package behavior lives in package source, package README files, tests, docs, and Changesets release intent.

## Files Agents Must Read Before Adoption Changes

1. `AGENTS.md`
2. `PROJECT.md`
3. `project.manifest.json`
4. `.doctrine/project.json`
5. `README.md`, package READMEs, and relevant `docs/**`
6. `docs/adr/**` when a durable package or release decision changes
7. `.github/workflows/ci.yml` and `.github/workflows/release.yml`
8. `package.json`, `turbo.json`, `biome.json`, package manifests, source, and tests touched by the change

## CI Contract

Pull requests, merge groups, and main pushes must:

- keep runtime package checks on runtime-affecting changes;
- run the project-control boundary test;
- run `SylphxAI/groundatlas@v0.1.3` with `package-spec: groundatlas@0.1.3`, `require-atlas: true`, and `strict: true`;
- assert that GroundAtlas selects `project.manifest.json` and keeps `.doctrine/project.json` as an adapter;
- assert that the human-readable Markdown scorecard reports one adopted project with zero warnings and zero blockers;
- upload GroundAtlas manifest JSON, fleet JSON, and fleet Markdown reports as CI artifacts.

## Release Boundary

GroundAtlas adoption does not itself publish Cat packages. Package publication remains controlled by Changesets release intent, `.github/workflows/release.yml`, caller-side `id-token: write` permission for trusted publish identity, the shared Sylphx release workflow, and npm registry readback for affected `@sylphx/cat*` packages.
