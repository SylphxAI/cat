# @sylphx/cat-otlp

> OpenTelemetry Protocol (OTLP) transport for @sylphx/cat logger

[![npm version](https://img.shields.io/npm/v/@sylphx/cat-otlp.svg)](https://www.npmjs.com/package/@sylphx/cat-otlp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**1.64 KB** • **OTLP/HTTP compatible** • **Automatic batching** • **Exponential backoff**

## Installation

```bash
npm install @sylphx/cat @sylphx/cat-otlp
```

## Description

Exports logs to OpenTelemetry-compatible backends using the OTLP/HTTP protocol. Compatible with Grafana, Datadog, New Relic, AWS CloudWatch, Honeycomb, and any OTLP-compatible observability platform. Features automatic batching, retry logic with exponential backoff, and trace context integration.

## Usage Examples

### Basic OTLP Export

```typescript
import { createLogger } from '@sylphx/cat'
import { otlpTransport } from '@sylphx/cat-otlp'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs'
    })
  ]
})

logger.info('Hello from OTLP!')
// Exported to OTLP endpoint in OpenTelemetry format
```

### Honeycomb Integration

```typescript
import { otlpTransport } from '@sylphx/cat-otlp'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'https://api.honeycomb.io/v1/logs',
      headers: {
        'x-honeycomb-team': process.env.HONEYCOMB_API_KEY,
        'x-honeycomb-dataset': 'my-app'
      }
    })
  ]
})
```

### Grafana Cloud / Loki

```typescript
import { otlpTransport } from '@sylphx/cat-otlp'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'https://logs-prod-us-central1.grafana.net/otlp/v1/logs',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${userId}:${apiKey}`).toString('base64')}`
      },
      resourceAttributes: {
        'service.name': 'my-app',
        'service.version': '1.0.0',
        'environment': 'production'
      }
    })
  ]
})
```

### With Batching and Retries

```typescript
import { otlpTransport } from '@sylphx/cat-otlp'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'https://api.example.com/v1/logs',
      batch: true,
      batchSize: 100,        // Send when 100 logs accumulated
      batchInterval: 5000,   // Or every 5 seconds
      retries: 5,            // Retry up to 5 times
      timeout: 15000         // 15 second timeout
    })
  ]
})
```

## API Reference

### `otlpTransport(options?: OTLPTransportOptions): Transport`

Creates an OTLP transport for exporting logs.

**Options:**

- `endpoint?: string` - OTLP endpoint URL (default: `'http://localhost:4318/v1/logs'`)
- `headers?: Record<string, string>` - HTTP headers for authentication
- `batch?: boolean` - Enable batching (default: `true`)
- `batchSize?: number` - Batch size in number of logs (default: `100`)
- `batchInterval?: number` - Batch interval in milliseconds (default: `1000`)
- `compression?: 'none' | 'gzip'` - Compression method (default: `'none'`)
- `retries?: number` - Number of retry attempts (default: `3`)
- `timeout?: number` - Request timeout in milliseconds (default: `10000`)
- `resourceAttributes?: Record<string, string | number | boolean>` - Resource attributes (service name, version, etc.)
- `scopeName?: string` - Instrumentation scope name (default: `'@sylphx/cat'`)
- `scopeVersion?: string` - Instrumentation scope version

### OTLP Log Format

Logs are automatically converted to the OpenTelemetry log format:

```json
{
  "resourceLogs": [{
    "resource": {
      "attributes": [
        { "key": "service.name", "value": { "stringValue": "my-app" } }
      ]
    },
    "scopeLogs": [{
      "scope": { "name": "@sylphx/cat" },
      "logRecords": [{
        "timeUnixNano": "1700000000000000000",
        "severityNumber": 9,
        "severityText": "INFO",
        "body": { "stringValue": "Hello from OTLP!" },
        "attributes": [...]
      }]
    }]
  }]
}
```

### Severity Number Mapping

- `trace` → 1 (TRACE)
- `debug` → 5 (DEBUG)
- `info` → 9 (INFO)
- `warn` → 13 (WARN)
- `error` → 17 (ERROR)
- `fatal` → 21 (FATAL)

## Platform-Specific Examples

### Datadog

```typescript
otlpTransport({
  endpoint: 'https://http-intake.logs.datadoghq.com/api/v2/logs',
  headers: {
    'DD-API-KEY': process.env.DATADOG_API_KEY
  }
})
```

### New Relic

```typescript
otlpTransport({
  endpoint: 'https://otlp.nr-data.net/v1/logs',
  headers: {
    'api-key': process.env.NEW_RELIC_LICENSE_KEY
  }
})
```

### AWS CloudWatch (via OpenTelemetry Collector)

```typescript
otlpTransport({
  endpoint: 'http://localhost:4318/v1/logs', // Local OTLP collector
  resourceAttributes: {
    'service.name': 'my-app',
    'aws.region': 'us-east-1'
  }
})
```

## Advanced Features

### Trace Context Integration

When used with [@sylphx/cat-tracing](../cat-tracing), trace IDs are automatically included:

```typescript
import { tracingPlugin } from '@sylphx/cat-tracing'
import { otlpTransport } from '@sylphx/cat-otlp'

const logger = createLogger({
  plugins: [tracingPlugin()],
  transports: [otlpTransport({ endpoint: '...' })]
})

logger.info('Traced log')
// Includes traceId, spanId, and traceFlags in OTLP format
```

### Graceful Shutdown

```typescript
const logger = createLogger({
  transports: [otlpTransport({ endpoint: '...' })]
})

process.on('SIGTERM', async () => {
  await logger.close()  // Flushes pending batches and closes transport
  process.exit(0)
})
```

## Package Size

- **Minified:** ~5 KB
- **Minified + Gzipped:** 1.64 KB
- **No additional dependencies**

## Standards Compliance

- ✅ OpenTelemetry Protocol (OTLP) 1.0+
- ✅ OTLP/HTTP JSON encoding
- ✅ OpenTelemetry Log Data Model

## Links

- [Main Documentation](https://cat.sylphx.com)
- [GitHub Repository](https://github.com/SylphxAI/cat)
- [npm Package](https://www.npmjs.com/package/@sylphx/cat-otlp)
- [OTLP Specification](https://opentelemetry.io/docs/specs/otlp/)
- [OpenTelemetry Logs](https://opentelemetry.io/docs/specs/otel/logs/)

## Related Packages

- [@sylphx/cat](../cat) - Core logger
- [@sylphx/cat-tracing](../cat-tracing) - W3C Trace Context support
- [@sylphx/cat-tail-sampling](../cat-tail-sampling) - Cost-saving sampling

## License

MIT © Kyle Zhu
