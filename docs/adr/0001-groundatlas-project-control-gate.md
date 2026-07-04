---
status: accepted
slug: groundatlas-project-control-gate
---

# ADR 0001: GroundAtlas Project-Control Gate

## Context

Cat already has a Sylphx Doctrine adapter in `.doctrine/project.json`, but external project-control consumers need a vendor-neutral manifest and a machine gate that proves the repository can be understood without copying Sylphx-only governance into every tool.

## Decision

Adopt `project.manifest.json` as Cat's vendor-neutral GroundAtlas control file and keep `.doctrine/project.json` as the Sylphx-specific adapter and org-local governance catalog.

CI will dogfood the released GroundAtlas package/action (`groundatlas@0.1.2` and `SylphxAI/groundatlas@v0.1.2`) on pull requests, merge groups, and main pushes. The gate must prove that GroundAtlas selects `project.manifest.json`, treats `.doctrine/project.json` only as an adapter, and reports the repository as adopted under strict fleet policy.

## Consequences

- Generated `.groundatlas*` reports are evidence/navigation only, never source of truth.
- Package runtime behavior remains owned by package source, tests, docs, and Changesets release intent.
- Package publication remains controlled by the shared release workflow, caller-side OIDC permission, and npm registry readback; GroundAtlas adoption alone does not publish a package.
- Future project-control changes must update the owning manifest/spec/test/workflow rather than duplicating policy in generated maps.
