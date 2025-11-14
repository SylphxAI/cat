# Examples

Real-world examples and code patterns for @sylphx/cat.

## Getting Started

- [Basic Usage](/examples/basic) - Simple logging patterns
- [Production Setup](/examples/production) - Production-ready configuration

## Advanced

- [Microservices](/examples/microservices) - Distributed tracing across services
- [OTLP Integration](/examples/otlp) - OpenTelemetry Protocol examples
- [Security & Redaction](/examples/redaction) - PII and sensitive data protection
- [Cost Optimization](/examples/tail-sampling) - Tail-based sampling patterns

## Quick Examples

### Minimal Setup

```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger()

logger.info('Hello world!')
```

### Production Setup

```typescript
import {
  createLogger,
  jsonFormatter,
  consoleTransport,
  otlpTransport,
  tracingPlugin,
  redactionPlugin,
  tailSamplingPlugin
} from '@sylphx/cat'

const logger = createLogger({
  level: 'info',
  formatter: jsonFormatter(),
  transports: [
    consoleTransport(),
    otlpTransport({
      endpoint: process.env.OTLP_ENDPOINT,
      headers: { Authorization: `Bearer ${process.env.OTLP_TOKEN}` },
      batch: true,
      resourceAttributes: {
        'service.name': 'my-api',
        'service.version': '1.0.0'
      }
    })
  ],
  plugins: [
    tracingPlugin(),
    redactionPlugin({ fields: ['password', 'token'], redactPII: true }),
    tailSamplingPlugin({ adaptive: true, monthlyBudget: 50 * 1024 * 1024 * 1024 })
  ]
})
```

### Express Integration

```typescript
import express from 'express'
import { createLogger, tracingPlugin } from '@sylphx/cat'

const app = express()
const logger = createLogger({ plugins: [tracingPlugin()] })

app.use((req, res, next) => {
  const requestLogger = logger.child({ requestId: crypto.randomUUID() })
  ;(req as any).logger = requestLogger
  next()
})

app.get('/users', (req, res) => {
  const logger = (req as any).logger
  logger.info('Fetching users')
  res.json({ users: [] })
})
```

## See Also

- [API Reference](/api/) - Complete API documentation
- [Guides](/guide/) - Detailed guides
- [GitHub Examples](https://github.com/SylphxAI/cat/tree/main/examples) - More examples
