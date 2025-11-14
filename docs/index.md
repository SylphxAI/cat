---
layout: home

hero:
  name: "@sylphx/cat"
  text: "The fastest logger for JavaScript"
  tagline: Ultra-lightweight, universal, and production-ready logging for all runtimes
  image:
    src: /logo.svg
    alt: "@sylphx/cat"
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/SylphxAI/cat

features:
  - icon: ⚡
    title: Blazing Fast
    details: 25M+ ops/sec with optimized hot paths and zero-overhead level filtering. Faster than Pino and Winston.

  - icon: 🪶
    title: Ultra Lightweight
    details: Only 8.93 KB gzipped with zero dependencies. Tree-shakeable for even smaller builds.

  - icon: 🌍
    title: Universal Runtime
    details: Works everywhere - Node.js, Bun, Deno, browsers, Cloudflare Workers, and edge runtimes.

  - icon: 🔒
    title: Security-First
    details: OWASP 2024 compliant with built-in PII redaction and log injection prevention.

  - icon: 📊
    title: Full Observability
    details: OpenTelemetry OTLP export, W3C Trace Context, and distributed tracing support.

  - icon: 💰
    title: Cost-Optimized
    details: Tail-based sampling saves 40-90% on log volume while maintaining 100% error coverage.

  - icon: 🎯
    title: Type-Safe
    details: Full TypeScript support with comprehensive types and excellent IDE experience.

  - icon: 🔌
    title: Highly Extensible
    details: Pluggable transports, formatters, and middleware. Build custom integrations easily.
---

## Quick Start

::: code-group
```bash [npm]
npm install @sylphx/cat
```

```bash [bun]
bun add @sylphx/cat
```

```bash [pnpm]
pnpm add @sylphx/cat
```
:::

```typescript
import { createLogger, consoleTransport, prettyFormatter } from '@sylphx/cat'

const logger = createLogger({
  level: 'info',
  formatter: prettyFormatter(),
  transports: [consoleTransport()]
})

logger.info('Hello world!', { user: 'kyle' })
```

## What's New in v0.2.0

### 🛡️ OWASP 2024 Compliant Security

Auto-redact sensitive data with glob patterns and PII detection:

```typescript
import { redactionPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: ['password', '*.secret', '**.apiKey'],
      redactPII: true, // Credit cards, SSNs, emails
      preventLogInjection: true
    })
  ]
})
```

### 📊 OpenTelemetry Integration

Full OTLP export and W3C Trace Context support:

```typescript
import { otlpTransport, tracingPlugin } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'https://otlp-gateway.grafana.net/otlp/v1/logs',
      resourceAttributes: {
        'service.name': 'my-api',
        'service.version': '1.0.0'
      }
    })
  ],
  plugins: [tracingPlugin()]
})

// Sends to Grafana, Datadog, New Relic, AWS CloudWatch, etc.
```

### 💰 Tail-Based Sampling

Smart sampling saves 40-90% on costs while keeping 100% of errors:

```typescript
import { tailSamplingPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    tailSamplingPlugin({
      adaptive: true,
      monthlyBudget: 10 * 1024 * 1024 * 1024 // 10 GB/month
    })
  ]
})

// Automatically keeps all errors, slow requests, 5xx responses
// Samples only 1% of successful requests
```

## Why @sylphx/cat?

| Feature | @sylphx/cat | Pino | Winston |
|---------|-------------|------|---------|
| **Bundle Size** | 8.93 KB | 11 KB | 80 KB |
| **Performance** | 25M ops/s | 15M ops/s | 5M ops/s |
| **Zero Dependencies** | ✅ | ❌ | ❌ |
| **Universal** | ✅ | ❌ | ❌ |
| **OpenTelemetry** | ✅ | Partial | ❌ |
| **W3C Trace Context** | ✅ | ❌ | ❌ |
| **OWASP Compliant** | ✅ | ❌ | ❌ |
| **Tail Sampling** | ✅ | ❌ | ❌ |
| **TypeScript-First** | ✅ | ✅ | ⚠️ |

## Trusted By

@sylphx/cat powers logging for production systems handling millions of requests per day.

- ⚡ **Performance**: Optimized for speed without compromising features
- 🛡️ **Security**: OWASP 2024 compliant with built-in protections
- 📊 **Observability**: Full OpenTelemetry integration
- 💰 **Cost-Effective**: Smart sampling reduces costs by 40-90%

[Get Started →](/guide/getting-started)
