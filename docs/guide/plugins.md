# Plugins

Plugins are middleware components that process log entries before formatting and transport. They enable cross-cutting concerns like context injection, tracing, redaction, and sampling.

## Built-in Plugins

### Context Plugin

Adds static context to all log entries:

```typescript
import { createLogger, contextPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    contextPlugin({
      app: 'my-app',
      version: '1.0.0',
      environment: 'production'
    })
  ]
})

logger.info('Server started')
// Output: { app: 'my-app', version: '1.0.0', environment: 'production',
//           level: 'info', msg: 'Server started' }
```

**Use cases:**
- Application metadata
- Deployment information
- Environment variables
- Service identification

### Tracing Plugin

W3C Trace Context for distributed tracing:

```typescript
import { tracingPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    tracingPlugin({
      generateTraceId: true, // Auto-generate if not present
      includeTraceContext: true
    })
  ]
})

logger.info('Request processed')
// Output: { level: 'info', msg: 'Request processed',
//           traceId: '0af7651916cd43dd8448eb211c80319c',
//           spanId: 'b7ad6b7169203331', traceFlags: 1 }
```

**HTTP header integration:**

```typescript
import { tracingPlugin } from '@sylphx/cat'

// Extract from incoming request
const traceContext = tracingPlugin.fromHeaders(req.headers)

// Create logger with trace context
const requestLogger = createLogger({
  plugins: [
    tracingPlugin({
      getTraceContext: () => traceContext
    })
  ]
})

// All logs include the same traceId
requestLogger.info('Processing request')

// Inject into outgoing request
const headers = tracingPlugin.toHeaders(traceContext)
await fetch('http://service-b', { headers })
```

See [Tracing Guide](/guide/tracing) for details.

### Redaction Plugin

OWASP-compliant sensitive data redaction:

```typescript
import { redactionPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    redactionPlugin({
      // Field-based redaction
      fields: ['password', 'token', '*.secret', '**.apiKey'],

      // PII detection
      redactPII: true,
      piiPatterns: ['creditCard', 'ssn', 'email', 'phone'],

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

See [Redaction Guide](/guide/redaction) for details.

### Tail-Based Sampling Plugin

Smart sampling after trace completion:

```typescript
import { tailSamplingPlugin, type SamplingRule } from '@sylphx/cat'

const rules: SamplingRule[] = [
  // Keep all errors
  {
    name: 'errors',
    condition: (trace) => trace.metadata.hasError,
    sampleRate: 1.0
  },

  // Keep slow requests
  {
    name: 'slow',
    condition: (trace) => (trace.metadata.maxDuration || 0) > 1000,
    sampleRate: 1.0
  },

  // Sample success at 1%
  {
    name: 'default',
    condition: () => true,
    sampleRate: 0.01
  }
]

const logger = createLogger({
  plugins: [
    tracingPlugin(), // Required for trace correlation
    tailSamplingPlugin({
      rules,
      adaptive: true,
      monthlyBudget: 10 * 1024 * 1024 * 1024 // 10 GB/month
    })
  ]
})
```

See [Tail-Based Sampling Guide](/guide/tail-sampling) for details.

### Sampling Plugin

Simple probabilistic sampling:

```typescript
import { samplingPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    samplingPlugin(0.1) // Log 10% of debug/info, always log errors
  ]
})

// 90% of these are discarded
for (let i = 0; i < 1000; i++) {
  logger.info(`Event ${i}`)
}

// 100% of errors are kept
logger.error('Critical error') // Always logged
```

**Level-based sampling:**
- Samples `trace`, `debug`, `info` at specified rate
- Always keeps `warn`, `error`, `fatal` (100%)

## Custom Plugins

Create your own plugin by implementing the `Plugin` interface:

```typescript
import type { Plugin, LogEntry } from '@sylphx/cat'

const myPlugin: Plugin = {
  name: 'my-plugin',

  onLog(entry: LogEntry): LogEntry {
    // Modify entry before formatting
    return {
      ...entry,
      data: {
        ...entry.data,
        timestamp: Date.now()
      }
    }
  }
}

const logger = createLogger({
  plugins: [myPlugin]
})
```

### Plugin Interface

```typescript
interface Plugin {
  name: string
  onLog?(entry: LogEntry): LogEntry | null
  flush?(traceId: string): void
}
```

**Methods:**
- `onLog` - Process each log entry (return `null` to drop)
- `flush` - Called when trace completes (optional)

### Examples

#### Add Request ID

```typescript
const requestIdPlugin: Plugin = {
  name: 'request-id',
  onLog(entry: LogEntry): LogEntry {
    return {
      ...entry,
      data: {
        ...entry.data,
        requestId: getCurrentRequestId() // Your async context
      }
    }
  }
}
```

#### Add Hostname

```typescript
import os from 'node:os'

const hostnamePlugin: Plugin = {
  name: 'hostname',
  onLog(entry: LogEntry): LogEntry {
    return {
      ...entry,
      data: {
        ...entry.data,
        hostname: os.hostname()
      }
    }
  }
}
```

#### Filter by Pattern

```typescript
const filterPlugin = (pattern: RegExp): Plugin => ({
  name: 'filter',
  onLog(entry: LogEntry): LogEntry | null {
    // Drop logs matching pattern
    if (pattern.test(entry.message)) {
      return null
    }
    return entry
  }
})

const logger = createLogger({
  plugins: [
    filterPlugin(/health-check/i) // Drop health check logs
  ]
})
```

#### Metrics Collection

```typescript
class MetricsPlugin implements Plugin {
  name = 'metrics'
  private counts: Record<string, number> = {}

  onLog(entry: LogEntry): LogEntry {
    this.counts[entry.level] = (this.counts[entry.level] || 0) + 1
    return entry
  }

  getMetrics() {
    return { ...this.counts }
  }

  reset() {
    this.counts = {}
  }
}

const metricsPlugin = new MetricsPlugin()
const logger = createLogger({
  plugins: [metricsPlugin]
})

// Later
console.log(metricsPlugin.getMetrics())
// { info: 42, warn: 5, error: 2 }
```

#### Rate Limiting

```typescript
class RateLimitPlugin implements Plugin {
  name = 'rate-limit'
  private lastLog = 0
  private minInterval: number

  constructor(logsPerSecond: number) {
    this.minInterval = 1000 / logsPerSecond
  }

  onLog(entry: LogEntry): LogEntry | null {
    const now = Date.now()
    if (now - this.lastLog < this.minInterval) {
      return null // Drop log (rate limited)
    }
    this.lastLog = now
    return entry
  }
}

const logger = createLogger({
  plugins: [
    new RateLimitPlugin(100) // Max 100 logs/second
  ]
})
```

#### Deduplication

```typescript
class DeduplicationPlugin implements Plugin {
  name = 'dedupe'
  private seen = new Set<string>()
  private windowMs: number

  constructor(windowMs = 60000) { // 1 minute window
    this.windowMs = windowMs
  }

  onLog(entry: LogEntry): LogEntry | null {
    const key = `${entry.level}:${entry.message}`

    if (this.seen.has(key)) {
      return null // Drop duplicate
    }

    this.seen.add(key)

    // Clear after window
    setTimeout(() => {
      this.seen.delete(key)
    }, this.windowMs)

    return entry
  }
}
```

#### Error Serialization

```typescript
import { serializeError } from '@sylphx/cat'

const errorSerializationPlugin: Plugin = {
  name: 'error-serialization',
  onLog(entry: LogEntry): LogEntry {
    if (!entry.data) return entry

    // Auto-serialize Error objects
    const data = { ...entry.data }
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Error) {
        data[key] = serializeError(value)
      }
    }

    return { ...entry, data }
  }
}

const logger = createLogger({
  plugins: [errorSerializationPlugin]
})

logger.error('Request failed', {
  error: new Error('Connection timeout')
  // Automatically serialized with stack trace
})
```

## Plugin Execution Order

Plugins execute in the order they're defined:

```typescript
const logger = createLogger({
  plugins: [
    contextPlugin({ app: 'my-app' }),      // 1. Add context
    tracingPlugin(),                        // 2. Add tracing
    redactionPlugin({ fields: ['password'] }), // 3. Redact sensitive data
    samplingPlugin(0.1)                     // 4. Sample logs
  ]
})
```

**Important:** Order matters for:
- Redaction (should run before sensitive data is used)
- Sampling (should run last to avoid processing dropped logs)
- Context (should run early to be available to other plugins)

## Plugin Best Practices

### Immutability

Always return new objects:

```typescript
// ✅ Good - immutable
onLog(entry: LogEntry): LogEntry {
  return {
    ...entry,
    data: { ...entry.data, foo: 'bar' }
  }
}

// ❌ Bad - mutates entry
onLog(entry: LogEntry): LogEntry {
  entry.data.foo = 'bar'
  return entry
}
```

### Performance

Avoid expensive operations:

```typescript
// ✅ Good - fast path
onLog(entry: LogEntry): LogEntry {
  if (!shouldProcess(entry)) {
    return entry // Skip processing
  }
  return processEntry(entry)
}

// ❌ Bad - always runs expensive operation
onLog(entry: LogEntry): LogEntry {
  return expensiveOperation(entry)
}
```

### Error Handling

Don't let plugin errors crash the logger:

```typescript
onLog(entry: LogEntry): LogEntry {
  try {
    return processEntry(entry)
  } catch (error) {
    console.error('Plugin error:', error)
    return entry // Return unchanged on error
  }
}
```

### Dropping Logs

Return `null` to drop a log:

```typescript
onLog(entry: LogEntry): LogEntry | null {
  if (shouldDrop(entry)) {
    return null // Log is discarded
  }
  return entry
}
```

## Combining Plugins

### Production Setup

```typescript
import {
  createLogger,
  contextPlugin,
  tracingPlugin,
  redactionPlugin,
  tailSamplingPlugin
} from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    // 1. Add static context
    contextPlugin({
      service: 'api',
      version: process.env.npm_package_version,
      environment: process.env.NODE_ENV
    }),

    // 2. Add distributed tracing
    tracingPlugin(),

    // 3. Redact sensitive data
    redactionPlugin({
      fields: ['password', 'token', 'apiKey'],
      redactPII: true,
      preventLogInjection: true
    }),

    // 4. Optimize costs with tail-based sampling
    tailSamplingPlugin({
      adaptive: true,
      monthlyBudget: 50 * 1024 * 1024 * 1024 // 50 GB
    })
  ]
})
```

### Development Setup

```typescript
const logger = createLogger({
  plugins: [
    contextPlugin({ app: 'my-app' }),

    // No redaction in dev (see real values)
    // No sampling in dev (see all logs)
  ]
})
```

### Testing

```typescript
class TestPlugin implements Plugin {
  name = 'test'
  logs: LogEntry[] = []

  onLog(entry: LogEntry): LogEntry {
    this.logs.push(entry)
    return entry
  }

  clear() {
    this.logs = []
  }
}

const testPlugin = new TestPlugin()
const logger = createLogger({
  plugins: [testPlugin]
})

// Test
logger.info('Test')
expect(testPlugin.logs).toHaveLength(1)
```

## See Also

- [Loggers](/guide/loggers) - Logger creation and usage
- [Tracing Guide](/guide/tracing) - W3C Trace Context
- [Redaction Guide](/guide/redaction) - Security and PII
- [Tail-Based Sampling](/guide/tail-sampling) - Cost optimization
- [API Reference](/api/plugins) - Complete plugin API
