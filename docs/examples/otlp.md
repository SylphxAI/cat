# OTLP Integration Examples

OpenTelemetry Protocol integration examples.

## Grafana Cloud

```typescript
import { createLogger, otlpTransport, tracingPlugin } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'https://otlp-gateway-prod-us-central-0.grafana.net/otlp/v1/logs',
      headers: {
        Authorization: 'Basic ' + btoa(`${INSTANCE_ID}:${API_KEY}`)
      },
      batch: true,
      batchSize: 100,
      compression: 'gzip',
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

## Datadog

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

## Local OpenTelemetry Collector

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs'
    })
  ],
  plugins: [tracingPlugin()]
})
```

## See Also

- [OTLP Guide](/guide/otlp)
- [Tracing Guide](/guide/tracing)
