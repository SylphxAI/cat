# @sylphx/cat-tracing

> W3C Trace Context support for @sylphx/cat logger

[![npm version](https://img.shields.io/npm/v/@sylphx/cat-tracing.svg)](https://www.npmjs.com/package/@sylphx/cat-tracing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**1.46 KB** • **W3C compliant** • **Distributed tracing** • **Auto trace ID generation**

## Installation

```bash
npm install @sylphx/cat @sylphx/cat-tracing
```

## Description

Adds W3C Trace Context support to @sylphx/cat logger. Automatically generates and propagates trace IDs and span IDs for distributed tracing across microservices. Compatible with OpenTelemetry, Datadog, New Relic, and any W3C Trace Context-compliant system.

## Usage Examples

### Basic Tracing

```typescript
import { createLogger } from '@sylphx/cat'
import { tracingPlugin } from '@sylphx/cat-tracing'

const logger = createLogger({
  plugins: [tracingPlugin()]
})

logger.info('Request processed')
// {"level":"info","message":"Request processed","traceId":"4bf92f3577b34da6a3ce929d0e0e4736","spanId":"00f067aa0ba902b7"}
```

### HTTP Header Propagation (Express)

```typescript
import { createLogger } from '@sylphx/cat'
import { TracingPlugin, tracingPlugin } from '@sylphx/cat-tracing'
import express from 'express'

const tracingPluginInstance = tracingPlugin()
const logger = createLogger({
  plugins: [tracingPluginInstance]
})

const app = express()

app.use((req, res, next) => {
  // Extract trace context from incoming request
  const context = TracingPlugin.fromHeaders(req.headers)
  if (context) {
    tracingPluginInstance.setTraceContext(context)
  }

  logger.info({ req }, 'Request received')
  next()
})

app.get('/api/users', async (req, res) => {
  // Make downstream request with trace context
  const context = tracingPluginInstance.getContext()
  const headers = context ? TracingPlugin.toHeaders(context) : {}

  const response = await fetch('http://downstream-service/users', {
    headers: {
      ...headers,  // Propagates traceparent header
      'Content-Type': 'application/json'
    }
  })

  res.json(await response.json())
})
```

### Manual Trace Context

```typescript
import { createLogger } from '@sylphx/cat'
import { tracingPlugin, createTraceContext } from '@sylphx/cat-tracing'

const tracing = tracingPlugin()
const logger = createLogger({
  plugins: [tracing]
})

// Create custom trace context
const context = createTraceContext({
  traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
  spanId: '00f067aa0ba902b7',
  sampled: true
})

tracing.setTraceContext(context)
logger.info('Custom trace context')
```

## API Reference

### `tracingPlugin(options?: TracingPluginOptions): Plugin`

Creates a tracing plugin instance.

**Options:**

- `enabled?: boolean` - Enable tracing (default: `true`)
- `generateTraceId?: boolean` - Auto-generate trace IDs if not present (default: `true`)
- `traceparentHeader?: string` - Header name for trace parent (default: `'traceparent'`)
- `getTraceContext?: () => TraceContext | null` - Custom trace context getter
- `includeTraceContext?: boolean` - Include trace context in logs (default: `true`)

**Example:**

```typescript
tracingPlugin({
  enabled: true,
  generateTraceId: true,
  getTraceContext: () => {
    // Custom logic to get trace context
    // e.g., from AsyncLocalStorage
    return asyncStorage.getStore()?.traceContext
  }
})
```

### Trace Context Utilities

#### `createTraceContext(options?: Partial<TraceContext>): TraceContext`

Creates a new trace context with optional overrides.

```typescript
import { createTraceContext } from '@sylphx/cat-tracing'

const context = createTraceContext()
// { traceId: '...', spanId: '...', traceFlags: 1 }
```

#### `generateTraceId(): string`

Generates a random 32-character hexadecimal trace ID.

```typescript
import { generateTraceId } from '@sylphx/cat-tracing'

const traceId = generateTraceId()
// '4bf92f3577b34da6a3ce929d0e0e4736'
```

#### `generateSpanId(): string`

Generates a random 16-character hexadecimal span ID.

```typescript
import { generateSpanId } from '@sylphx/cat-tracing'

const spanId = generateSpanId()
// '00f067aa0ba902b7'
```

#### `parseTraceparent(traceparent: string): TraceContext | null`

Parses a W3C traceparent header.

```typescript
import { parseTraceparent } from '@sylphx/cat-tracing'

const context = parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')
// { traceId: '4bf92f3577b34da6a3ce929d0e0e4736', spanId: '00f067aa0ba902b7', traceFlags: 1 }
```

#### `formatTraceparent(context: TraceContext): string`

Formats a trace context as a W3C traceparent header.

```typescript
import { formatTraceparent } from '@sylphx/cat-tracing'

const header = formatTraceparent({
  traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
  spanId: '00f067aa0ba902b7',
  traceFlags: 1
})
// '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
```

### Static Methods

#### `TracingPlugin.fromHeaders(headers: Record<string, string | string[]>): TraceContext | null`

Extracts trace context from HTTP headers.

```typescript
const context = TracingPlugin.fromHeaders(request.headers)
```

#### `TracingPlugin.toHeaders(context: TraceContext): Record<string, string>`

Converts trace context to HTTP headers.

```typescript
const headers = TracingPlugin.toHeaders(context)
// { traceparent: '00-...-...-01' }
```

### Instance Methods

#### `setTraceContext(context: TraceContext | null): void`

Sets the current trace context.

```typescript
const tracing = tracingPlugin()
tracing.setTraceContext(context)
```

#### `getContext(): TraceContext | null`

Gets the current trace context.

```typescript
const tracing = tracingPlugin()
const context = tracing.getContext()
```

## W3C Trace Context Format

The plugin follows the [W3C Trace Context specification](https://www.w3.org/TR/trace-context/):

**traceparent header format:**
```
00-{trace-id}-{parent-id}-{trace-flags}
```

**Example:**
```
00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
│  │                                │                │
│  │                                │                └─ flags (01 = sampled)
│  │                                └────────────────── parent-id (16 hex chars)
│  └───────────────────────────────────────────────── trace-id (32 hex chars)
└────────────────────────────────────────────────────── version (00)
```

## Integration Examples

### With OTLP Transport

```typescript
import { createLogger } from '@sylphx/cat'
import { tracingPlugin } from '@sylphx/cat-tracing'
import { otlpTransport } from '@sylphx/cat-otlp'

const logger = createLogger({
  plugins: [tracingPlugin()],
  transports: [
    otlpTransport({
      endpoint: 'https://api.honeycomb.io/v1/logs',
      headers: { 'x-honeycomb-team': process.env.API_KEY }
    })
  ]
})

logger.info('Traced and exported to OTLP')
// Trace context automatically included in OTLP export
```

### With AsyncLocalStorage (Node.js)

```typescript
import { AsyncLocalStorage } from 'async_hooks'
import { createLogger } from '@sylphx/cat'
import { tracingPlugin } from '@sylphx/cat-tracing'

const asyncStorage = new AsyncLocalStorage()

const logger = createLogger({
  plugins: [
    tracingPlugin({
      getTraceContext: () => asyncStorage.getStore()?.traceContext
    })
  ]
})

// In your request handler
app.use((req, res, next) => {
  const context = TracingPlugin.fromHeaders(req.headers) || createTraceContext()
  asyncStorage.run({ traceContext: context }, () => {
    next()
  })
})
```

## Package Size

- **Minified:** ~4.5 KB
- **Minified + Gzipped:** 1.46 KB
- **No additional dependencies**

## Standards Compliance

- ✅ W3C Trace Context Specification
- ✅ OpenTelemetry compatible
- ✅ Distributed tracing ready

## Links

- [Main Documentation](https://cat.sylphx.com)
- [GitHub Repository](https://github.com/SylphxAI/cat)
- [npm Package](https://www.npmjs.com/package/@sylphx/cat-tracing)
- [W3C Trace Context Spec](https://www.w3.org/TR/trace-context/)

## Related Packages

- [@sylphx/cat](../cat) - Core logger
- [@sylphx/cat-otlp](../cat-otlp) - OpenTelemetry Protocol export
- [@sylphx/cat-tail-sampling](../cat-tail-sampling) - Requires tracing for sampling

## License

MIT © Kyle Zhu
