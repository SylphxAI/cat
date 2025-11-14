# Why Choose @sylphx/cat?

@sylphx/cat is the fastest, lightest, and most extensible logger for all JavaScript runtimes. Built for modern applications with performance, security, and observability in mind.

## Comparison with Other Loggers

| Feature | @sylphx/cat | Pino | Winston |
|---------|-------------|------|---------|
| **Bundle Size** | 8.93 KB | 11 KB | 80 KB |
| **Performance** | 25M ops/s | 15M ops/s | 5M ops/s |
| **Zero Dependencies** | ✅ | ❌ | ❌ |
| **Universal Runtimes** | ✅ | ❌ | ❌ |
| **OpenTelemetry OTLP** | ✅ | Partial | ❌ |
| **W3C Trace Context** | ✅ | ❌ | ❌ |
| **OWASP 2024 Compliant** | ✅ | ❌ | ❌ |
| **Tail-Based Sampling** | ✅ | ❌ | ❌ |
| **TypeScript-First** | ✅ | ✅ | ⚠️ |
| **Tree-Shakable** | ✅ | Partial | ❌ |

## Key Benefits

### ⚡ Blazing Fast Performance

**25M+ operations per second** with optimized hot paths:

```typescript
// Fast-path level filtering - 234M ops/sec
logger.debug('This is filtered out') // Logger level is 'info'

// Basic logging - 21M ops/sec
logger.info('Basic log message')

// Structured logging - 18M ops/sec
logger.info('User action', { userId: '123', action: 'login' })
```

**Performance optimizations:**
- Fast-path level filtering
- Minimal object allocation
- Optional batching for high throughput
- Zero dependencies for minimal overhead

### 🪶 Ultra Lightweight

**8.93 KB gzipped**, smaller than competitors despite having more features:

- **Core only**: ~5 KB (basic logging)
- **Full featured**: 8.93 KB (all plugins, transports)
- **Tree-shakeable**: Import only what you need

```typescript
// Minimal import - ~3 KB
import { createLogger } from '@sylphx/cat'

// Full import - ~9 KB
import {
  createLogger,
  jsonFormatter,
  prettyFormatter,
  consoleTransport,
  fileTransport,
  otlpTransport,
  tracingPlugin,
  redactionPlugin,
  tailSamplingPlugin
} from '@sylphx/cat'
```

### 🌍 Universal Runtime Support

Works everywhere JavaScript runs:

**Runtimes:**
- Node.js 18+
- Bun 1.0+
- Deno 1.30+
- Browsers (Chrome, Firefox, Safari, Edge)
- Cloudflare Workers
- Vercel Edge Runtime
- AWS Lambda@Edge

**Frameworks:**
- Express
- Fastify
- Next.js
- Remix
- Astro
- SvelteKit
- Hono

```typescript
// Works identically in all environments
import { createLogger } from '@sylphx/cat'

const logger = createLogger()
logger.info('Universal logging!')
```

### 🔒 Security-First Design

**OWASP 2024 compliant** with built-in security features:

```typescript
import { redactionPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    redactionPlugin({
      // Auto-redact sensitive fields
      fields: ['password', 'token', '*.secret', '**.apiKey'],

      // PII detection
      redactPII: true,

      // Log injection prevention
      preventLogInjection: true
    })
  ]
})

logger.info('User login', {
  username: 'john',
  password: 'secret123', // → [REDACTED]
  creditCard: '4532-1234-5678-9010' // → [REDACTED]
})
```

**Security features:**
- Automatic PII redaction (credit cards, SSNs, emails, phones)
- Log injection prevention (OWASP)
- Sensitive header redaction
- Custom redaction patterns
- Field-level exclusions

### 📊 Enterprise-Grade Observability

**Full OpenTelemetry integration** with W3C Trace Context:

```typescript
import { tracingPlugin, otlpTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'https://otlp-gateway.grafana.net/otlp/v1/logs',
      headers: { Authorization: 'Bearer <token>' },
      resourceAttributes: {
        'service.name': 'my-api',
        'service.version': '1.0.0'
      }
    })
  ],
  plugins: [tracingPlugin()]
})

// Auto-generates traceId and spanId
logger.info('Request processed')
// Output: { traceId: '0af7651916cd43dd8448eb211c80319c',
//           spanId: 'b7ad6b7169203331', ... }
```

**Compatible with:**
- Grafana Loki
- Datadog
- New Relic
- AWS CloudWatch
- Honeycomb
- Jaeger
- Zipkin
- Any OTLP-compatible backend

### 💰 Cost Optimization

**40-90% reduction in log volume** with tail-based sampling:

```typescript
import { tailSamplingPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    tailSamplingPlugin({
      adaptive: true,
      monthlyBudget: 10 * 1024 * 1024 * 1024, // 10 GB/month

      // Keep 100% of errors, 1% of success logs
      // Maintains 100% error coverage while reducing costs
    })
  ]
})
```

**Smart sampling:**
- 100% error coverage (never miss issues)
- Keep slow requests (>1s)
- Sample success logs at low rate
- Budget-aware adaptive sampling
- Configurable rules per use case

### 🎯 Type-Safe Development

**Full TypeScript support** with comprehensive types:

```typescript
import type { Logger, LogEntry, Plugin, Transport, Formatter } from '@sylphx/cat'

// Type-safe plugins
const myPlugin: Plugin = {
  name: 'my-plugin',
  onLog(entry: LogEntry): LogEntry {
    return { ...entry, data: { ...entry.data, timestamp: Date.now() } }
  }
}

// Type-safe custom transport
const myTransport: Transport = {
  async log(entry: LogEntry, formatted: string): Promise<void> {
    await fetch('/logs', { method: 'POST', body: formatted })
  }
}

// Autocomplete and type checking
logger.info('Message', { userId: 123 }) // ✓ Valid
```

### 📦 Tree-Shakeable

**Import only what you need** for optimal bundle size:

```typescript
// Option 1: Minimal (3-4 KB)
import { createLogger } from '@sylphx/cat'

// Option 2: Cherry-pick features (5-6 KB)
import { createLogger, jsonFormatter, consoleTransport } from '@sylphx/cat'

// Option 3: Full featured (8-9 KB)
import * as cat from '@sylphx/cat'
```

Modern bundlers (Webpack, Rollup, esbuild) automatically remove unused code.

## When to Choose @sylphx/cat

### Perfect for:

✅ **High-performance applications**
- Need 20M+ ops/sec logging throughput
- Minimal CPU and memory overhead
- Zero GC pressure

✅ **Universal/multi-runtime apps**
- Deploy to Node.js, Deno, Bun, browsers, edge
- Single codebase across platforms
- Isomorphic logging

✅ **Production observability**
- OpenTelemetry integration required
- Distributed tracing across microservices
- Cost-optimized logging at scale

✅ **Security-conscious applications**
- PII and sensitive data redaction
- OWASP compliance requirements
- Financial, healthcare, or regulated industries

✅ **Cost-sensitive deployments**
- Pay-per-GB log ingestion (Datadog, New Relic)
- High log volume (millions per day)
- Need tail-based sampling

✅ **Modern TypeScript projects**
- Full type safety
- Excellent autocomplete
- Framework-agnostic

### Consider alternatives if:

❌ **You need Node.js-specific features**
- Pino's worker threads
- Winston's transport ecosystem

❌ **You have extremely complex custom transports**
- Winston has 100+ community transports
- Cat is newer with growing ecosystem

❌ **You need legacy Node.js support**
- Cat requires Node.js 18+
- Pino/Winston support older versions

## Migration from Other Loggers

See our [Migration Guide](/guide/migration) for detailed instructions on migrating from:
- Pino
- Winston
- Bunyan
- console.log

## Next Steps

- [Getting Started](/guide/getting-started) - Quick start guide
- [Best Practices](/guide/best-practices) - Production patterns
- [Examples](/examples/) - Real-world examples
- [API Reference](/api/) - Complete API documentation
