# OpenTelemetry OTLP Export

@sylphx/cat includes native OpenTelemetry Protocol (OTLP) support for sending logs to modern observability platforms.

## Overview

OTLP (OpenTelemetry Protocol) is the standard protocol for sending telemetry data (logs, traces, metrics) to observability backends.

**Supported backends:**
- Grafana Loki
- Datadog
- New Relic
- AWS CloudWatch
- Honeycomb
- Jaeger
- Zipkin
- OpenTelemetry Collector
- Any OTLP-compatible endpoint

## Basic Usage

### Local OpenTelemetry Collector

```typescript
import { createLogger, otlpTransport, tracingPlugin } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs' // Default OTLP HTTP endpoint
    })
  ],
  plugins: [tracingPlugin()]
})

logger.info('Hello from OTLP!')
```

### Configuration Options

```typescript
otlpTransport({
  // Endpoint URL (default: http://localhost:4318/v1/logs)
  endpoint?: string

  // HTTP headers (for authentication)
  headers?: Record<string, string>

  // Enable batching (recommended for production)
  batch?: boolean // default: false

  // Batch size (number of logs)
  batchSize?: number // default: 100

  // Batch interval (milliseconds)
  batchInterval?: number // default: 1000

  // Compression ('gzip' | 'none')
  compression?: string // default: 'none'

  // Retry attempts on failure
  retries?: number // default: 3

  // Request timeout (milliseconds)
  timeout?: number // default: 5000

  // Resource attributes (service metadata)
  resourceAttributes?: Record<string, string>

  // Scope metadata
  scopeName?: string
  scopeVersion?: string
})
```

## Production Setup

### Grafana Cloud

```typescript
import { createLogger, otlpTransport, jsonFormatter, tracingPlugin } from '@sylphx/cat'

const logger = createLogger({
  formatter: jsonFormatter(),
  transports: [
    otlpTransport({
      endpoint: 'https://otlp-gateway-prod-us-central-0.grafana.net/otlp/v1/logs',
      headers: {
        // Base64 encode: <instance-id>:<api-key>
        Authorization: 'Basic ' + btoa(`${INSTANCE_ID}:${API_KEY}`)
      },
      batch: true,
      batchSize: 100,
      batchInterval: 1000,
      compression: 'gzip',
      retries: 3,
      resourceAttributes: {
        'service.name': 'my-api',
        'service.version': '1.0.0',
        'deployment.environment': 'production'
      }
    })
  ],
  plugins: [tracingPlugin()]
})
```

### Datadog

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'https://http-intake.logs.datadoghq.com/v1/input',
      headers: {
        'DD-API-KEY': process.env.DATADOG_API_KEY!
      },
      batch: true,
      resourceAttributes: {
        'service.name': 'my-api',
        'env': 'production'
      }
    })
  ]
})
```

### New Relic

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'https://otlp.nr-data.net:4318/v1/logs',
      headers: {
        'api-key': process.env.NEW_RELIC_LICENSE_KEY!
      },
      batch: true,
      resourceAttributes: {
        'service.name': 'my-api'
      }
    })
  ]
})
```

### AWS CloudWatch (via OTLP Collector)

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://otel-collector:4318/v1/logs',
      batch: true,
      resourceAttributes: {
        'service.name': 'my-api',
        'cloud.provider': 'aws',
        'cloud.region': process.env.AWS_REGION
      }
    })
  ]
})
```

## Batching

Batching reduces network overhead and improves performance:

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs',

      // Enable batching
      batch: true,

      // Flush after 100 logs
      batchSize: 100,

      // Or flush every 1 second
      batchInterval: 1000
    })
  ]
})

// Logs are buffered and sent in batches
for (let i = 0; i < 1000; i++) {
  logger.info(`Event ${i}`)
}

// Manual flush
await logger.flush()
```

**When to use batching:**
- ✅ High log volume (>100 logs/sec)
- ✅ Production environments
- ✅ Cost-sensitive deployments
- ❌ Real-time debugging
- ❌ Critical error logging

## Resource Attributes

Resource attributes describe the service generating logs:

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs',
      resourceAttributes: {
        // Service identification
        'service.name': 'payment-api',
        'service.version': '2.1.0',
        'service.namespace': 'production',
        'service.instance.id': 'instance-001',

        // Deployment
        'deployment.environment': 'production',

        // Cloud provider (AWS example)
        'cloud.provider': 'aws',
        'cloud.region': 'us-east-1',
        'cloud.availability_zone': 'us-east-1a',

        // Container (Docker)
        'container.name': 'payment-api',
        'container.id': 'abc123',

        // Kubernetes
        'k8s.namespace.name': 'production',
        'k8s.pod.name': 'payment-api-abc123',
        'k8s.deployment.name': 'payment-api'
      }
    })
  ]
})
```

**Standard semantic conventions:**
- [Service](https://opentelemetry.io/docs/specs/semconv/resource/#service)
- [Deployment](https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/)
- [Cloud](https://opentelemetry.io/docs/specs/semconv/resource/cloud/)
- [Container](https://opentelemetry.io/docs/specs/semconv/resource/container/)
- [Kubernetes](https://opentelemetry.io/docs/specs/semconv/resource/k8s/)

## Scope Metadata

Scope describes the instrumentation library:

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs',
      scopeName: '@mycompany/payment-api',
      scopeVersion: '2.1.0'
    })
  ]
})
```

## Compression

Reduce network bandwidth with gzip compression:

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs',
      compression: 'gzip', // Typically 5-10x smaller
      batch: true
    })
  ]
})
```

**Compression ratio:**
- JSON logs: ~5-10x smaller
- Structured logs: ~7-15x smaller
- Text logs: ~3-5x smaller

**Trade-off:** Slightly higher CPU usage

## Error Handling

OTLP transport handles errors with retries:

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs',

      // Retry failed requests
      retries: 3, // Retry up to 3 times

      // Request timeout
      timeout: 5000 // 5 seconds
    })
  ]
})

// Failed logs are retried automatically
// After max retries, error is logged to console.error
```

**Retry strategy:**
1. Immediate retry
2. Wait 1s, retry
3. Wait 2s, retry
4. Wait 4s, retry
5. Give up, log error

## Multi-Transport Setup

Combine OTLP with local logging:

```typescript
import { createLogger, consoleTransport, otlpTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    // Local development
    consoleTransport(),

    // Remote observability
    otlpTransport({
      endpoint: process.env.OTLP_ENDPOINT,
      headers: { Authorization: `Bearer ${process.env.OTLP_TOKEN}` },
      batch: true
    })
  ]
})

// Logs go to both console and OTLP backend
logger.info('Dual output')
```

## Distributed Tracing

Combine OTLP with W3C Trace Context:

```typescript
import { createLogger, otlpTransport, tracingPlugin } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs',
      resourceAttributes: {
        'service.name': 'api-gateway'
      }
    })
  ],
  plugins: [
    tracingPlugin() // Adds traceId, spanId
  ]
})

// OTLP backend can correlate logs by traceId
logger.info('Request received')
```

See [Tracing Guide](/guide/tracing) for details.

## High-Throughput Scenarios

Optimize for high log volume:

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs',

      // Large batches
      batch: true,
      batchSize: 500, // 500 logs per batch

      // Less frequent flushes
      batchInterval: 5000, // 5 seconds

      // Enable compression
      compression: 'gzip',

      // More retries for reliability
      retries: 5
    })
  ]
})

// Generate high volume
for (let i = 0; i < 10000; i++) {
  logger.info(`Event ${i}`)
}

await logger.flush()
```

## OpenTelemetry Collector

Use the OpenTelemetry Collector as a centralized log processor:

### Docker Compose

```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4318:4318" # OTLP HTTP

  app:
    build: .
    environment:
      OTLP_ENDPOINT: http://otel-collector:4318/v1/logs
```

### Collector Config

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 100

exporters:
  logging:
    loglevel: debug

  # Export to Grafana Loki
  loki:
    endpoint: https://loki.example.com/loki/api/v1/push

  # Export to Prometheus
  prometheusremotewrite:
    endpoint: https://prometheus.example.com/api/v1/write

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging, loki]
```

## Monitoring

Monitor OTLP transport health:

```typescript
class MonitoredOTLPTransport {
  private successCount = 0
  private errorCount = 0

  async log(entry: LogEntry, formatted: string): Promise<void> {
    try {
      await otlpTransport({ /* ... */ }).log(entry, formatted)
      this.successCount++
    } catch (error) {
      this.errorCount++
      console.error('OTLP transport error:', error)
    }
  }

  getMetrics() {
    return {
      success: this.successCount,
      errors: this.errorCount,
      errorRate: this.errorCount / (this.successCount + this.errorCount)
    }
  }
}
```

## Testing

```typescript
import { createLogger, otlpTransport } from '@sylphx/cat'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.post('http://localhost:4318/v1/logs', (req, res, ctx) => {
    return res(ctx.status(200))
  })
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('sends logs to OTLP endpoint', async () => {
  const logger = createLogger({
    transports: [
      otlpTransport({
        endpoint: 'http://localhost:4318/v1/logs'
      })
    ]
  })

  logger.info('Test log')
  await logger.flush()

  // Verify request was made
})
```

## Best Practices

### Use Batching in Production

```typescript
// ✅ Good - batching reduces network overhead
batch: true,
batchSize: 100,
batchInterval: 1000

// ❌ Bad - sends every log immediately
batch: false
```

### Set Resource Attributes

```typescript
// ✅ Good - rich metadata
resourceAttributes: {
  'service.name': 'my-api',
  'service.version': '1.0.0',
  'deployment.environment': 'production'
}

// ❌ Bad - missing context
resourceAttributes: {}
```

### Enable Compression

```typescript
// ✅ Good - smaller payloads
compression: 'gzip'

// ❌ Bad - larger network usage
compression: 'none'
```

### Configure Retries

```typescript
// ✅ Good - handles transient errors
retries: 3

// ❌ Bad - no resilience
retries: 0
```

## See Also

- [Tracing Guide](/guide/tracing) - W3C Trace Context
- [Transports](/guide/transports) - Transport overview
- [Best Practices](/guide/best-practices) - Production patterns
- [API Reference](/api/transports) - Complete API
