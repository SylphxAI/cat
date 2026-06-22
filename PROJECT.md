# Cat Project

Cat is a production JavaScript/TypeScript logging and observability package
monorepo. It publishes the `@sylphx/cat` core logger and companion packages for
pretty formatting, file/http transports, OTLP export, tracing, redaction, and
tail sampling.

## Goals

- Own the Cat package APIs, TypeScript types, runtime implementations,
  documentation, tests, and package release workflow.
- Keep logging, redaction, tracing, OTLP, sampling, and transport behavior
  stable and explicitly versioned.
- Publish packages only through the documented release workflow with CI and npm
  readback evidence.

## Non-Goals

- Do not own downstream applications' observability policy, retention policy,
  vendor backends, or compliance decisions.
- Do not encode customer-specific logging behavior into the package core.
- Do not treat source revert as complete recovery after npm packages are
  published.

## Boundaries

Owned contexts are the Cat package ecosystem, public package exports,
documentation site sources, package-level changelogs, tests, and release
workflow. Downstream applications consume Cat through npm package exports and
documented APIs.

Public surfaces:

- npm package exports under `packages/*/package.json`.
- Documentation under `docs/`.
- Required branch context `test`.
- Release workflow `.github/workflows/release.yml`.

## Delivery

Current CI model: `legacy-ci`. Required branch context is `test`.

Release path: `.github/workflows/release.yml` calls the central
`SylphxAI/.github` reusable release workflow with inherited secrets.
Production proof must include CI, Changesets/version evidence, npm package
readback for every released package, and documentation build evidence.

Recovery class: `forward-fix-only`, because package versions and consumer
package resolution cannot be fully undone by source revert.

## References

- Machine manifest: `.doctrine/project.json`
- Public docs: `docs/`
- Package manifests: `packages/*/package.json`
- Existing Bun guide: `.claude/CLAUDE.md`
- CI: `.github/workflows/ci.yml`
- Release: `.github/workflows/release.yml`
- Doctrine: https://github.com/SylphxAI/doctrine
