# Agent Instructions

This repository follows the central Sylphx doctrine in `SylphxAI/doctrine`.

Before changing code, read:

- `PROJECT.md`
- `project.manifest.json`
- `.doctrine/project.json`
- The affected package README, docs, and tests

Keep Cat focused on reusable logging packages. Do not add product-specific logging behavior, platform deployment policy, or organization-wide release policy here.

`project.manifest.json` is the vendor-neutral GroundAtlas control file. `.doctrine/project.json` is the Sylphx Doctrine adapter and org-local governance catalog. Generated `.groundatlas*`, fleet JSON, and fleet Markdown reports are evidence/navigation only, not source of truth.

## Local Validation

For project-control-only changes:

```bash
bun install --frozen-lockfile
git diff --check
node --test test/project-control.node-test.mjs
npm exec --yes --package groundatlas@0.1.3 -- ga update --out .groundatlas-pilot
npm exec --yes --package groundatlas@0.1.3 -- ga audit --out .groundatlas-pilot
npm exec --yes --package groundatlas@0.1.3 -- ga fleet . --out .groundatlas-pilot --require-atlas --strict --json
npm exec --yes --package groundatlas@0.1.3 -- ga fleet . --out .groundatlas-pilot --require-atlas --strict
```

For runtime package changes, also run the relevant package tests/build and do not expand this repo's logging scope to cover downstream product policy.
