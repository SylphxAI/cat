# Production Setup Examples

Production-ready logging configurations.

## Complete Production Setup

```typescript
import {
  createLogger,
  jsonFormatter,
  consoleTransport,
  otlpTransport,
  tracingPlugin,
  redactionPlugin,
  tailSamplingPlugin,
  autoSerializeErrors
} from '@sylphx/cat'

export const logger = createLogger({
  level: 'info',
  formatter: jsonFormatter(),
  transports: [
    consoleTransport(),
    otlpTransport({
      endpoint: process.env.OTLP_ENDPOINT!,
      headers: {
        Authorization: `Bearer ${process.env.OTLP_TOKEN}`
      },
      batch: true,
      batchSize: 100,
      compression: 'gzip',
      retries: 3,
      resourceAttributes: {
        'service.name': process.env.SERVICE_NAME || 'unknown',
        'service.version': process.env.npm_package_version,
        'deployment.environment': process.env.NODE_ENV,
        'host.name': process.env.HOSTNAME
      }
    })
  ],
  plugins: [
    tracingPlugin(),
    autoSerializeErrors(),
    redactionPlugin({
      fields: [
        'password', 'token', 'apiKey', 'secret',
        '*.password', '**.token'
      ],
      redactPII: true,
      preventLogInjection: true
    }),
    tailSamplingPlugin({
      adaptive: true,
      monthlyBudget: 50 * 1024 * 1024 * 1024 // 50 GB
    })
  ],
  context: {
    app: process.env.SERVICE_NAME,
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
  }
})
```

## Express Integration

```typescript
import express from 'express'
import { logger } from './logger'
import { tracingPlugin, generateTraceId, generateSpanId, TraceFlags } from '@sylphx/cat'

const app = express()

// Request logging middleware
app.use((req, res, next) => {
  const traceContext = tracingPlugin.fromHeaders(req.headers) || {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    traceFlags: TraceFlags.SAMPLED
  }

  const requestLogger = logger.child({
    requestId: crypto.randomUUID(),
    method: req.method,
    url: req.url
  })

  ;(req as any).logger = requestLogger

  requestLogger.info('Request started')

  const start = Date.now()
  res.on('finish', () => {
    requestLogger.info('Request completed', {
      statusCode: res.statusCode,
      duration: Date.now() - start
    })
  })

  next()
})

// Error handling
app.use((err, req, res, next) => {
  const logger = (req as any).logger
  logger.error('Unhandled error', { error: err })
  res.status(500).json({ error: 'Internal server error' })
})

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully')
  await logger.flush()
  await logger.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', { error })
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.fatal('Unhandled rejection', { error: reason })
})
```

## Docker Configuration

```typescript
// Optimized for Docker/Kubernetes
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  formatter: jsonFormatter(), // JSON for log aggregation
  transports: [
    consoleTransport() // stdout for Docker logs
  ],
  plugins: [
    tracingPlugin(),
    redactionPlugin({
      enabled: true, // Always enabled in containers
      fields: ['password', 'token'],
      redactPII: true
    })
  ],
  context: {
    container: process.env.HOSTNAME,
    pod: process.env.K8S_POD_NAME,
    namespace: process.env.K8S_NAMESPACE
  }
})
```

## See Also

- [Microservices](/examples/microservices)
- [Best Practices](/guide/best-practices)
