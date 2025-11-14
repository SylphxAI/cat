---
"@sylphx/cat": minor
---

# Breaking Change: Monorepo Restructure

**IMPORTANT:** v0.1.0 on npm contains the old monolith version. This v0.2.0 release contains the new modular core-only package.

## What Changed

- Split monolith into 8 separate packages
- @sylphx/cat now only contains core logger (1.97 KB, was 8.93 KB)
- Features moved to separate packages:
  - Pretty formatter → @sylphx/cat-pretty
  - File transport → @sylphx/cat-file
  - HTTP serializers → @sylphx/cat-http
  - OTLP export → @sylphx/cat-otlp
  - Tracing → @sylphx/cat-tracing
  - Redaction → @sylphx/cat-redaction
  - Tail sampling → @sylphx/cat-tail-sampling

## Migration

If you were using v0.1.0 monolith:

```ts
// Before (v0.1.0)
import { createLogger, prettyFormatter, fileTransport } from '@sylphx/cat'

// After (v0.2.0)
import { createLogger } from '@sylphx/cat'
import { prettyFormatter } from '@sylphx/cat-pretty'
import { fileTransport } from '@sylphx/cat-file'
```

Install only what you need:
```bash
bun add @sylphx/cat @sylphx/cat-pretty @sylphx/cat-file
```
