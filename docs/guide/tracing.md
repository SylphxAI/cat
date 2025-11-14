# W3C Trace Context

@sylphx/cat implements the W3C Trace Context specification for distributed tracing across microservices and complex systems.

## Overview

W3C Trace Context provides a standard way to propagate trace correlation information across service boundaries:

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
             ││ └─────────────┬─────────────┘ └───────┬───────┘ └┬┘
             ││               │                       │          │
             ││               │                       │          └─ trace flags (sampled)
             ││               │                       └─ span ID (16 hex chars)
             ││               └─ trace ID (32 hex chars)
             │└─ version
             └─ format
```

## Basic Usage

### Enable Tracing

```typescript
import { createLogger, tracingPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [tracingPlugin()]
})

logger.info('Request processed')
// Output: { level: 'info', msg: 'Request processed',
//           traceId: '0af7651916cd43dd8448eb211c80319c',
//           spanId: 'b7ad6b7169203331', traceFlags: 1 }
```

### Plugin Options

```typescript
tracingPlugin({
  // Auto-generate trace ID if not present
  generateTraceId?: boolean // default: true

  // Include trace context in logs
  includeTraceContext?: boolean // default: true

  // Custom trace context provider
  getTraceContext?: () => TraceContext | null
})
```

## HTTP Header Propagation

### Extract from Incoming Request

```typescript
import { tracingPlugin } from '@sylphx/cat'
import type { IncomingMessage } from 'node:http'

function handleRequest(req: IncomingMessage) {
  // Extract W3C Trace Context from headers
  const traceContext = tracingPlugin.fromHeaders(req.headers)

  const logger = createLogger({
    plugins: [
      tracingPlugin({
        getTraceContext: () => traceContext
      })
    ]
  })

  logger.info('Request received', {
    method: req.method,
    url: req.url
  })

  // All logs share the same traceId
}
```

### Inject into Outgoing Request

```typescript
import { tracingPlugin } from '@sylphx/cat'

// Get current trace context
const traceContext = {
  traceId: '0af7651916cd43dd8448eb211c80319c',
  spanId: 'b7ad6b7169203331',
  traceFlags: 1
}

// Convert to HTTP headers
const headers = tracingPlugin.toHeaders(traceContext)

// Propagate to downstream service
await fetch('http://service-b/api', { headers })
```

**Generated headers:**

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

## Distributed Tracing

### Microservices Example

```typescript
// Service A (API Gateway)
import { createLogger, tracingPlugin } from '@sylphx/cat'

const gatewayLogger = createLogger({
  plugins: [tracingPlugin()] // Auto-generates traceId
})

app.post('/api/orders', async (req, res) => {
  gatewayLogger.info('Order request received')

  // Get trace context
  const headers = req.headers
  const traceContext = tracingPlugin.fromHeaders(headers)

  // Propagate to downstream services
  const outgoingHeaders = tracingPlugin.toHeaders(traceContext!)

  // Call auth service
  await fetch('http://auth-service/verify', {
    headers: outgoingHeaders
  })

  // Call payment service
  await fetch('http://payment-service/charge', {
    headers: outgoingHeaders
  })

  gatewayLogger.info('Order processed successfully')
  res.json({ success: true })
})
```

```typescript
// Service B (Auth Service)
import { createLogger, tracingPlugin } from '@sylphx/cat'

app.post('/verify', (req, res) => {
  // Extract trace context from incoming request
  const traceContext = tracingPlugin.fromHeaders(req.headers)

  const authLogger = createLogger({
    plugins: [
      tracingPlugin({
        getTraceContext: () => traceContext
      })
    ]
  })

  // Logs include the same traceId as Service A
  authLogger.info('Verifying authentication')

  res.json({ verified: true })
})
```

**Result:** All logs across services share the same `traceId`, enabling correlation in log aggregation systems (Grafana, Datadog, etc.).

## Trace Context Structure

```typescript
interface TraceContext {
  traceId: string // 32 hex characters (16 bytes)
  spanId: string // 16 hex characters (8 bytes)
  traceFlags: number // 0x00 (not sampled) or 0x01 (sampled)
  traceState?: string // Optional vendor-specific data
}
```

### Trace ID

Unique identifier for the entire trace (128-bit):

```typescript
import { generateTraceId } from '@sylphx/cat'

const traceId = generateTraceId()
// '0af7651916cd43dd8448eb211c80319c'
```

### Span ID

Unique identifier for a single operation (64-bit):

```typescript
import { generateSpanId } from '@sylphx/cat'

const spanId = generateSpanId()
// 'b7ad6b7169203331'
```

### Trace Flags

Indicates sampling decision:

```typescript
import { TraceFlags } from '@sylphx/cat'

// Not sampled
traceFlags: TraceFlags.NONE // 0x00

// Sampled (should be recorded)
traceFlags: TraceFlags.SAMPLED // 0x01
```

## Integration Patterns

### Express Middleware

```typescript
import { createLogger, tracingPlugin } from '@sylphx/cat'
import type { Request, Response, NextFunction } from 'express'

const logger = createLogger({
  plugins: [tracingPlugin()]
})

app.use((req: Request, res: Response, next: NextFunction) => {
  // Extract or generate trace context
  const traceContext = tracingPlugin.fromHeaders(req.headers) || {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    traceFlags: TraceFlags.SAMPLED
  }

  // Attach logger to request
  ;(req as any).logger = createLogger({
    plugins: [
      tracingPlugin({
        getTraceContext: () => traceContext
      })
    ]
  })

  // Inject trace context into response
  const responseHeaders = tracingPlugin.toHeaders(traceContext)
  res.set(responseHeaders)

  next()
})

app.get('/users', (req, res) => {
  const logger = (req as any).logger
  logger.info('Fetching users')
  res.json({ users: [] })
})
```

### Async Local Storage

```typescript
import { AsyncLocalStorage } from 'node:async_hooks'
import { createLogger, tracingPlugin } from '@sylphx/cat'

const asyncLocalStorage = new AsyncLocalStorage()

app.use((req, res, next) => {
  const traceContext = tracingPlugin.fromHeaders(req.headers) || {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    traceFlags: TraceFlags.SAMPLED
  }

  const logger = createLogger({
    plugins: [
      tracingPlugin({
        getTraceContext: () => traceContext
      })
    ]
  })

  asyncLocalStorage.run({ logger, traceContext }, () => {
    next()
  })
})

// Access anywhere in the request lifecycle
function getLogger() {
  const store = asyncLocalStorage.getStore()
  return store?.logger
}

app.get('/users', async (req, res) => {
  const logger = getLogger()
  logger.info('Fetching users')
  res.json({ users: [] })
})
```

### Next.js

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateTraceId, generateSpanId, TraceFlags } from '@sylphx/cat'

export function middleware(request: NextRequest) {
  const traceId = request.headers.get('traceparent')?.split('-')[1] || generateTraceId()
  const spanId = generateSpanId()

  const response = NextResponse.next()

  // Inject trace context
  response.headers.set(
    'traceparent',
    `00-${traceId}-${spanId}-${TraceFlags.SAMPLED.toString(16).padStart(2, '0')}`
  )

  return response
}
```

## Advanced Features

### Custom Span Creation

```typescript
import { createLogger, tracingPlugin, generateSpanId } from '@sylphx/cat'

const logger = createLogger({
  plugins: [tracingPlugin()]
})

function processOrder(orderId: string) {
  // Create child span for this operation
  const parentSpanId = getCurrentSpanId()
  const spanId = generateSpanId()

  const spanLogger = logger.child({
    spanId,
    parentSpanId,
    operation: 'processOrder',
    orderId
  })

  spanLogger.info('Processing order started')

  // ... processing logic ...

  spanLogger.info('Processing order completed')
}
```

### Trace State

Vendor-specific trace state:

```typescript
const traceContext = {
  traceId: generateTraceId(),
  spanId: generateSpanId(),
  traceFlags: TraceFlags.SAMPLED,
  traceState: 'vendor1=value1,vendor2=value2'
}

const logger = createLogger({
  plugins: [
    tracingPlugin({
      getTraceContext: () => traceContext
    })
  ]
})
```

## OpenTelemetry Integration

Combine with OTLP transport for full observability:

```typescript
import {
  createLogger,
  tracingPlugin,
  otlpTransport,
  jsonFormatter
} from '@sylphx/cat'

const logger = createLogger({
  formatter: jsonFormatter(),
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs',
      resourceAttributes: {
        'service.name': 'my-api',
        'service.version': '1.0.0'
      }
    })
  ],
  plugins: [tracingPlugin()]
})

// Logs are sent to OTLP backend with trace correlation
logger.info('Request processed')
```

See [OTLP Guide](/guide/otlp) for details.

## Testing

```typescript
import { generateTraceId, generateSpanId, TraceFlags } from '@sylphx/cat'

describe('Tracing', () => {
  it('generates valid trace IDs', () => {
    const traceId = generateTraceId()
    expect(traceId).toMatch(/^[0-9a-f]{32}$/)
  })

  it('generates valid span IDs', () => {
    const spanId = generateSpanId()
    expect(spanId).toMatch(/^[0-9a-f]{16}$/)
  })

  it('propagates trace context', () => {
    const traceContext = {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      traceFlags: TraceFlags.SAMPLED
    }

    const headers = tracingPlugin.toHeaders(traceContext)
    const parsed = tracingPlugin.fromHeaders(headers)

    expect(parsed?.traceId).toBe(traceContext.traceId)
    expect(parsed?.spanId).toBe(traceContext.spanId)
  })
})
```

## Best Practices

### Always Propagate Trace Context

```typescript
// ✅ Good - propagates trace context
const traceContext = tracingPlugin.fromHeaders(req.headers)
const headers = tracingPlugin.toHeaders(traceContext!)
await fetch('http://service-b', { headers })

// ❌ Bad - breaks trace correlation
await fetch('http://service-b') // No trace context
```

### Use Consistent Sampling

```typescript
// ✅ Good - consistent sampling across services
const traceFlags = TraceFlags.SAMPLED // Decided at entry point

// ❌ Bad - inconsistent sampling
const traceFlags = Math.random() < 0.1 ? TraceFlags.SAMPLED : TraceFlags.NONE
```

### Log Span Start and End

```typescript
// ✅ Good - clear span boundaries
logger.info('Operation started', { operation: 'fetchUsers' })
const result = await fetchUsers()
logger.info('Operation completed', { operation: 'fetchUsers', count: result.length })

// ❌ Bad - no span context
await fetchUsers()
```

## See Also

- [OTLP Guide](/guide/otlp) - OpenTelemetry integration
- [Plugins](/guide/plugins) - Plugin system
- [Best Practices](/guide/best-practices) - Production patterns
- [API Reference](/api/logger) - Complete API
