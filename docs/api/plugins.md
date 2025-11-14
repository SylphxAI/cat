# Plugins API

Plugins process log entries before formatting.

## Interface

```typescript
interface Plugin {
  name: string
  onLog?(entry: LogEntry): LogEntry | null
  flush?(traceId: string): void
}
```

## Built-in Plugins

### contextPlugin

```typescript
function contextPlugin(context: Record<string, unknown>): Plugin
```

Adds static context to all logs.

```typescript
import { contextPlugin } from '@sylphx/cat'

const plugin = contextPlugin({
  app: 'my-app',
  version: '1.0.0'
})
```

### tracingPlugin

```typescript
function tracingPlugin(options?: TracingPluginOptions): Plugin
```

W3C Trace Context for distributed tracing.

```typescript
interface TracingPluginOptions {
  generateTraceId?: boolean // Auto-generate trace ID (default: true)
  includeTraceContext?: boolean // Include in logs (default: true)
  getTraceContext?: () => TraceContext | null // Custom provider
}
```

```typescript
import { tracingPlugin } from '@sylphx/cat'

const plugin = tracingPlugin()
```

### redactionPlugin

```typescript
function redactionPlugin(options?: RedactionPluginOptions): Plugin
```

OWASP-compliant data redaction.

```typescript
interface RedactionPluginOptions {
  enabled?: boolean // Enable redaction (default: true)
  fields?: string[] // Fields to redact (supports globs)
  redactPII?: boolean // Enable PII detection (default: true)
  piiPatterns?: Array<'creditCard' | 'ssn' | 'email' | 'phone' | 'ipv4' | 'ipv6'>
  customPatterns?: Array<{ name: string; pattern: RegExp; replacement?: string }>
  replacement?: string // Replacement text (default: '[REDACTED]')
  preventLogInjection?: boolean // OWASP log injection prevention (default: true)
  excludeFields?: string[] // Exclude from redaction
}
```

```typescript
import { redactionPlugin } from '@sylphx/cat'

const plugin = redactionPlugin({
  fields: ['password', 'token'],
  redactPII: true
})
```

### tailSamplingPlugin

```typescript
function tailSamplingPlugin(options?: TailSamplingPluginOptions): Plugin
```

Intelligent sampling after trace completion.

```typescript
interface TailSamplingPluginOptions {
  rules?: SamplingRule[]
  adaptive?: boolean // Enable adaptive sampling (default: false)
  monthlyBudget?: number // Monthly budget in bytes
  maxBufferSize?: number // Max buffer size (default: 1000)
  maxTraceDuration?: number // Max trace duration ms (default: 60000)
  onFlush?: (trace: TraceBuffer, kept: boolean) => void
  onBudgetUpdate?: (stats: BudgetStats) => void
}
```

```typescript
import { tailSamplingPlugin } from '@sylphx/cat'

const plugin = tailSamplingPlugin({
  adaptive: true,
  monthlyBudget: 10 * 1024 * 1024 * 1024 // 10 GB
})
```

### samplingPlugin

```typescript
function samplingPlugin(sampleRate: number): Plugin
```

Simple probabilistic sampling.

```typescript
import { samplingPlugin } from '@sylphx/cat'

const plugin = samplingPlugin(0.1) // 10% sample rate
```

## Custom Plugin

```typescript
import type { Plugin, LogEntry } from '@sylphx/cat'

const myPlugin: Plugin = {
  name: 'my-plugin',
  onLog(entry: LogEntry): LogEntry {
    return {
      ...entry,
      data: {
        ...entry.data,
        customField: 'value'
      }
    }
  }
}

const logger = createLogger({
  plugins: [myPlugin]
})
```

## See Also

- [Logger API](/api/logger)
- [Plugins Guide](/guide/plugins)
- [Tracing Guide](/guide/tracing)
- [Redaction Guide](/guide/redaction)
