# @sylphx/cat 🐱

> The fastest, lightest, and most extensible logger for JavaScript

[![npm version](https://img.shields.io/npm/v/@sylphx/cat.svg)](https://www.npmjs.com/package/@sylphx/cat)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@sylphx/cat)](https://bundlephobia.com/package/@sylphx/cat)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**82% smaller than Pino** • **Zero dependencies** • **Universal runtime support**

```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger()
logger.info('Hello from cat! 🐱')
```

---

## 🎯 Why Cat?

| Feature | @sylphx/cat | Pino | Winston |
|---------|-------------|------|---------|
| **Core Size** | **1.97 KB** | 11 KB | 28 KB |
| **Full Stack** | 11 KB | ~20 KB | ~35 KB |
| **Zero Dependencies** | ✅ | ✅ | ❌ |
| **TypeScript Native** | ✅ | ❌ | ❌ |
| **W3C Trace Context** | ✅ | ❌ | ❌ |
| **OTLP Export** | ✅ | Plugin | ❌ |
| **Tail Sampling** | ✅ | ❌ | ❌ |
| **OWASP 2024 Compliant** | ✅ | ❌ | ❌ |

---

## 📦 Packages

Cat is a **modular monorepo** - install only what you need:

| Package | Size | Description |
|---------|------|-------------|
| **[@sylphx/cat](./packages/cat)** | 1.97 KB | Core logger + JSON + Console + Error serialization |
| [@sylphx/cat-pretty](./packages/cat-pretty) | 0.81 KB | Pretty formatter for development |
| [@sylphx/cat-file](./packages/cat-file) | 1.14 KB | File and stream transports |
| [@sylphx/cat-http](./packages/cat-http) | 0.75 KB | HTTP request/response serializers |
| [@sylphx/cat-otlp](./packages/cat-otlp) | 1.64 KB | OpenTelemetry Protocol export |
| [@sylphx/cat-tracing](./packages/cat-tracing) | 1.46 KB | W3C Trace Context support |
| [@sylphx/cat-redaction](./packages/cat-redaction) | 1.49 KB | PII/sensitive data redaction |
| [@sylphx/cat-tail-sampling](./packages/cat-tail-sampling) | 1.82 KB | Intelligent cost-saving sampling |

**Total:** 11.08 KB for the complete observability stack

---

## 🚀 Quick Start

### Minimal Setup (1.97 KB)

```bash
npm install @sylphx/cat
```

```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger()

logger.info('Server started', { port: 3000 })
// {"level":"info","msg":"Server started","port":3000,"time":1700000000000}

logger.error(new Error('Connection failed'))
// {"level":"error","err":{"message":"Connection failed","stack":"..."},"time":...}
```

### Development Setup (2.78 KB)

```bash
npm install @sylphx/cat @sylphx/cat-pretty
```

```typescript
import { createLogger } from '@sylphx/cat'
import { prettyFormatter } from '@sylphx/cat-pretty'

const logger = createLogger({
  formatter: prettyFormatter()
})

logger.info('Hello world')
// [2024-11-14 20:30:15] INF Hello world
```

### Production API (3.86 KB)

```bash
npm install @sylphx/cat @sylphx/cat-file @sylphx/cat-http
```

```typescript
import { createLogger } from '@sylphx/cat'
import { fileTransport } from '@sylphx/cat-file'
import { httpSerializers } from '@sylphx/cat-http'

const logger = createLogger({
  serializers: httpSerializers,
  transports: [fileTransport({ path: './logs/app.log' })]
})

// Express middleware
app.use((req, res, next) => {
  logger.info({ req }, 'Incoming request')
  next()
})
```

### Full Observability Stack (9.08 KB)

```bash
npm install @sylphx/cat @sylphx/cat-otlp @sylphx/cat-tracing \
  @sylphx/cat-tail-sampling @sylphx/cat-redaction
```

```typescript
import { createLogger } from '@sylphx/cat'
import { otlpTransport } from '@sylphx/cat-otlp'
import { tracingPlugin } from '@sylphx/cat-tracing'
import { tailSamplingPlugin } from '@sylphx/cat-tail-sampling'
import { redactionPlugin } from '@sylphx/cat-redaction'

const logger = createLogger({
  plugins: [
    tracingPlugin(),
    redactionPlugin({ pii: true }),
    tailSamplingPlugin({ monthlyBudget: 100_000 })
  ],
  transports: [
    otlpTransport({
      endpoint: 'https://api.honeycomb.io/v1/logs',
      headers: { 'x-honeycomb-team': process.env.API_KEY }
    })
  ]
})

logger.info({ userId: 123, event: 'purchase' })
// Automatically:
// - Adds traceId for distributed tracing
// - Redacts PII (credit cards, SSNs, emails)
// - Samples intelligently (100% errors, 10% success)
// - Exports to Honeycomb via OTLP
```

---

## 🎨 Features

### Core Features (in @sylphx/cat)

- ⚡ **Ultra-fast**: Optimized hot paths, minimal allocations
- 🪶 **Ultra-lightweight**: 1.97 KB gzipped core
- 🔧 **Type-safe**: Full TypeScript support with strict types
- 🌍 **Universal**: Works in Bun, Node.js, Deno, browsers
- 🎯 **Zero dependencies**: No external runtime dependencies
- 📦 **Tree-shakeable**: Pay only for what you use
- 🔌 **Extensible**: Plugin system for custom behavior
- 🎨 **Customizable**: Formatters, transports, serializers
- ⚠️ **Auto error serialization**: Errors serialized with stack traces

### Advanced Features

- **🔍 W3C Trace Context** ([@sylphx/cat-tracing](./packages/cat-tracing))
  - Full W3C Trace Context specification
  - Distributed tracing across microservices
  - Parent-child span relationships

- **📊 OTLP Export** ([@sylphx/cat-otlp](./packages/cat-otlp))
  - OpenTelemetry Protocol (OTLP) HTTP/JSON
  - Compatible with Grafana, Datadog, New Relic, Honeycomb
  - Batching with exponential backoff retry

- **🔒 OWASP 2024 Compliant Redaction** ([@sylphx/cat-redaction](./packages/cat-redaction))
  - Field-based redaction with glob patterns
  - Built-in PII detection (credit cards, SSNs, emails, phones)
  - Log injection prevention

- **💰 Tail-Based Sampling** ([@sylphx/cat-tail-sampling](./packages/cat-tail-sampling))
  - Smart sampling after trace completion
  - 40-90% cost reduction
  - 100% error coverage
  - Adaptive budget control

- **🌐 HTTP Serializers** ([@sylphx/cat-http](./packages/cat-http))
  - Automatic Request/Response serialization
  - Sensitive header redaction
  - Express/Fastify compatible

---

## 📚 Documentation

- **[Getting Started](https://cat.sylphx.com/guide/getting-started)**
- **[API Reference](https://cat.sylphx.com/api/)**
- **[Examples](https://cat.sylphx.com/examples/)**

---

## 🏆 Benchmarks

```
Core logger performance:
@sylphx/cat:  25M ops/sec
Pino:         20M ops/sec
Winston:      12M ops/sec
```

**Bundle size comparison:**

```
Core only:
@sylphx/cat:  1.97 KB  (82% smaller)
Pino:         11 KB
Winston:      28 KB

Full stack:
@sylphx/cat:  11 KB
Pino + plugins: ~20 KB
Winston + plugins: ~35 KB
```

---

## 🎯 Use Cases

### Simple CLI Tool
```bash
npm install @sylphx/cat
```
**1.97 KB** - Just the essentials

### Development Server
```bash
npm install @sylphx/cat @sylphx/cat-pretty
```
**2.78 KB** - Beautiful colored output

### Production API
```bash
npm install @sylphx/cat @sylphx/cat-file @sylphx/cat-http
```
**3.86 KB** - File logging + HTTP serialization

### Microservices
```bash
npm install @sylphx/cat @sylphx/cat-otlp @sylphx/cat-tracing
```
**5.07 KB** - Distributed tracing + OTLP export

### High-Volume Production
```bash
npm install @sylphx/cat @sylphx/cat-otlp @sylphx/cat-tracing \
  @sylphx/cat-tail-sampling @sylphx/cat-redaction
```
**9.08 KB** - Full observability with cost optimization

---

## 🔧 Advanced Usage

### Child Loggers

```typescript
const logger = createLogger({ service: 'api' })
const requestLogger = logger.child({ requestId: '123' })

requestLogger.info('Processing')
// {"service":"api","requestId":"123","level":"info","msg":"Processing"}
```

### Custom Serializers

```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger({
  serializers: {
    user: (user) => ({ id: user.id, name: user.name })
  }
})

logger.info({ user: { id: 1, name: 'Alice', password: 'secret' } })
// {"level":"info","user":{"id":1,"name":"Alice"}}
```

### Multiple Transports

```typescript
import { createLogger } from '@sylphx/cat'
import { fileTransport } from '@sylphx/cat-file'
import { otlpTransport } from '@sylphx/cat-otlp'

const logger = createLogger({
  transports: [
    fileTransport({ path: './logs/app.log' }),
    otlpTransport({ endpoint: 'https://...' })
  ]
})
```

### Custom Plugins

```typescript
import type { Plugin, LogEntry } from '@sylphx/cat'

const timestampPlugin: Plugin = {
  name: 'timestamp',
  onLog: (entry: LogEntry) => {
    entry.timestamp = new Date().toISOString()
    return entry
  }
}

const logger = createLogger({
  plugins: [timestampPlugin]
})
```

---

## 🌐 Runtime Support

- ✅ **Bun** 1.0+
- ✅ **Node.js** 18+
- ✅ **Deno** 1.37+
- ✅ **Browsers** (modern)
- ✅ **Edge runtimes** (Cloudflare Workers, Vercel Edge)

---

## 📊 Standards Compliance

- ✅ **OpenTelemetry OTLP 1.0+**
- ✅ **W3C Trace Context Specification**
- ✅ **OWASP Top 10 2024**

---

## ✅ Testing

Cat has **comprehensive test coverage** with **330 tests** across all packages:

```bash
# Run all tests (330 tests)
bun test

# Run specific package tests
cd packages/cat && bun test                  # Core (82 tests)
cd packages/cat-http && bun test             # HTTP serializers (52 tests)
cd packages/cat-tracing && bun test          # W3C Trace Context (66 tests)
cd packages/cat-redaction && bun test        # PII redaction (33 tests)
cd packages/cat-tail-sampling && bun test    # Tail sampling (26 tests)
cd packages/cat-otlp && bun test             # OTLP transport (26 tests)
```

**Test Coverage: 95%+** ([See detailed report](./TEST-COVERAGE.md))

- ✅ All log levels and filtering
- ✅ Formatters (JSON, Pretty)
- ✅ Transports (Console, File)
- ✅ Error serialization with cause chains
- ✅ Plugin lifecycle (onInit, onLog, onDestroy)
- ✅ HTTP serialization with security
- ✅ Distributed tracing (W3C standard)
- ✅ PII protection (OWASP 2024 compliant)
- ✅ Intelligent sampling
- ✅ Real-world integration scenarios

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/guide/contributing.md) for details.

```bash
# Clone the repo
git clone https://github.com/SylphxAI/cat.git
cd cat

# Install dependencies
bun install

# Build all packages
bun run build

# Run tests (330 tests, 95%+ coverage)
bun test
```

---

## 📝 License

MIT © Kyle Zhu

---

## 🔗 Links

- **[Documentation](https://cat.sylphx.com)**
- **[GitHub](https://github.com/SylphxAI/cat)**
- **[npm](https://www.npmjs.com/package/@sylphx/cat)**
- **[Discord](https://discord.gg/sylphx)**

---

## 🙏 Acknowledgments

Inspired by:
- [Pino](https://github.com/pinojs/pino) - Fast JSON logger
- [Winston](https://github.com/winstonjs/winston) - Versatile logging library
- [OpenTelemetry](https://opentelemetry.io/) - Observability standards

---

**Built with ❤️ by the SylphX team**
