# Microservices Examples

Distributed tracing across microservices.

## Service A (API Gateway)

```typescript
import { createLogger, tracingPlugin, otlpTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://otlp-collector:4318/v1/logs',
      resourceAttributes: {
        'service.name': 'api-gateway'
      }
    })
  ],
  plugins: [tracingPlugin()]
})

app.post('/api/orders', async (req, res) => {
  logger.info('Order request received', { userId: req.body.userId })

  // Propagate trace context to downstream services
  const traceContext = tracingPlugin.fromHeaders(req.headers)
  const headers = tracingPlugin.toHeaders(traceContext!)

  // Call auth service
  await fetch('http://auth-service/verify', {
    headers: { ...headers, Authorization: req.headers.authorization }
  })

  // Call payment service
  await fetch('http://payment-service/charge', {
    headers: { ...headers, 'Content-Type': 'application/json' },
    method: 'POST',
    body: JSON.stringify({ amount: req.body.amount })
  })

  logger.info('Order processed successfully')
  res.json({ success: true })
})
```

## Service B (Auth Service)

```typescript
import { createLogger, tracingPlugin, otlpTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://otlp-collector:4318/v1/logs',
      resourceAttributes: {
        'service.name': 'auth-service'
      }
    })
  ],
  plugins: [tracingPlugin()]
})

app.post('/verify', (req, res) => {
  // Extract trace context from incoming request
  const traceContext = tracingPlugin.fromHeaders(req.headers)

  const requestLogger = logger.child({
    traceId: traceContext?.traceId,
    spanId: traceContext?.spanId
  })

  // All logs share the same traceId as Service A
  requestLogger.info('Verifying authentication')

  // ... auth logic ...

  requestLogger.info('Authentication verified')
  res.json({ verified: true })
})
```

## Service C (Payment Service)

```typescript
import { createLogger, tracingPlugin, otlpTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://otlp-collector:4318/v1/logs',
      resourceAttributes: {
        'service.name': 'payment-service'
      }
    })
  ],
  plugins: [tracingPlugin()]
})

app.post('/charge', async (req, res) => {
  const traceContext = tracingPlugin.fromHeaders(req.headers)

  const requestLogger = logger.child({
    traceId: traceContext?.traceId,
    spanId: traceContext?.spanId
  })

  requestLogger.info('Processing payment', { amount: req.body.amount })

  try {
    await chargeCard(req.body)
    requestLogger.info('Payment successful')
    res.json({ success: true })
  } catch (error) {
    requestLogger.error('Payment failed', { error })
    res.status(500).json({ error: 'Payment failed' })
  }
})
```

**Result:** All services' logs share the same `traceId`, enabling correlation in Grafana/Datadog.

## See Also

- [Tracing Guide](/guide/tracing)
- [OTLP Examples](/examples/otlp)
