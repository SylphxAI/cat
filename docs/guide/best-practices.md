# Best Practices

Production-ready patterns and recommendations for using @sylphx/cat effectively.

## Production Setup

### Complete Configuration

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
      endpoint: process.env.OTLP_ENDPOINT!,
      headers: { Authorization: `Bearer ${process.env.OTLP_TOKEN}` },
      batch: true,
      batchSize: 100,
      compression: 'gzip',
      resourceAttributes: {
        'service.name': process.env.SERVICE_NAME || 'unknown',
        'service.version': process.env.npm_package_version,
        'deployment.environment': process.env.NODE_ENV
      }
    })
  ],
  plugins: [
    tracingPlugin(),
    redactionPlugin({
      fields: ['password', 'token', '*.secret'],
      redactPII: true,
      preventLogInjection: true
    }),
    tailSamplingPlugin({
      adaptive: true,
      monthlyBudget: 50 * 1024 * 1024 * 1024 // 50 GB
    })
  ]
})

export default logger
```

## Structured Logging

### Always Use Structured Data

```typescript
// ✅ Good - structured, queryable
logger.info('User login', {
  userId: '123',
  username: 'john',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
})

// ❌ Bad - unstructured, hard to query
logger.info(`User 123 (john) logged in from 192.168.1.1`)
```

### Consistent Field Names

```typescript
// ✅ Good - consistent naming
logger.info('Request', { userId: '123', requestId: 'req-456' })
logger.info('Database', { userId: '123', queryId: 'q-789' })

// ❌ Bad - inconsistent
logger.info('Request', { user_id: '123' })
logger.info('Database', { UserID: '123' })
```

### Use Semantic Levels

```typescript
// ✅ trace - Very detailed debugging
logger.trace('Function entry', { args })

// ✅ debug - Debugging information
logger.debug('Cache hit', { key, value })

// ✅ info - General information
logger.info('Server started', { port: 3000 })

// ✅ warn - Warning conditions
logger.warn('High memory usage', { usage: '85%' })

// ✅ error - Error conditions
logger.error('Request failed', { error, statusCode: 500 })

// ✅ fatal - Critical errors requiring restart
logger.fatal('Database connection lost', { error })
```

## Error Handling

### Log Errors with Context

```typescript
// ✅ Good - includes context
try {
  await processPayment(order)
} catch (error) {
  logger.error('Payment processing failed', {
    error,
    orderId: order.id,
    amount: order.amount,
    userId: order.userId
  })
  throw error
}

// ❌ Bad - minimal context
try {
  await processPayment(order)
} catch (error) {
  logger.error('Error', { error })
  throw error
}
```

### Use Error Serialization

```typescript
import { autoSerializeErrors } from '@sylphx/cat'

const logger = createLogger({
  plugins: [autoSerializeErrors()]
})

// Errors are automatically formatted
logger.error('Failed', { error: new Error('Connection timeout') })
```

### Don't Log and Throw

```typescript
// ✅ Good - log at catch site
async function handleRequest(req) {
  try {
    return await processRequest(req)
  } catch (error) {
    logger.error('Request failed', { error, requestId: req.id })
    throw error
  }
}

// ❌ Bad - logs multiple times
async function processRequest(req) {
  try {
    // ...
  } catch (error) {
    logger.error('Error', { error }) // ❌ Logged here
    throw error // ❌ And at caller
  }
}
```

## Request Tracing

### Use Trace Context

```typescript
import { tracingPlugin } from '@sylphx/cat'

app.use((req, res, next) => {
  const traceContext = tracingPlugin.fromHeaders(req.headers) || {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    traceFlags: TraceFlags.SAMPLED
  }

  req.logger = createLogger({
    plugins: [tracingPlugin({ getTraceContext: () => traceContext })]
  })

  next()
})
```

### Log Request Start and End

```typescript
app.use((req, res, next) => {
  const start = Date.now()

  req.logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent']
  })

  res.on('finish', () => {
    req.logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: Date.now() - start
    })
  })

  next()
})
```

## Child Loggers

### Use Child Loggers for Scoping

```typescript
// Application logger
const appLogger = createLogger({ context: { app: 'my-app' } })

// Module-specific loggers
const authLogger = appLogger.child({ module: 'auth' })
const dbLogger = appLogger.child({ module: 'database' })
const cacheLogger = appLogger.child({ module: 'cache' })

// Request-specific loggers
app.use((req, res, next) => {
  req.logger = appLogger.child({ requestId: req.id })
  next()
})
```

## Security

### Always Redact Sensitive Data

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: [
        'password', 'token', 'apiKey', 'secret',
        '*.password', '**.token'
      ],
      redactPII: true,
      preventLogInjection: true
    })
  ]
})
```

### Never Log Credentials

```typescript
// ✅ Good
logger.info('API call', { endpoint: '/api/users', method: 'GET' })

// ❌ Bad
logger.info('API call', {
  endpoint: '/api/users',
  apiKey: 'sk-...' // ❌ NEVER log credentials
})
```

### Validate User Input

```typescript
// ✅ Good - validated input
const userId = validateUserId(req.params.id)
logger.info('User request', { userId })

// ❌ Bad - unsanitized input (log injection risk)
logger.info('User request', { userId: req.params.id })
```

## Performance

### Set Appropriate Log Levels

```typescript
// ✅ Production
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
})

// ❌ Too verbose in production
const logger = createLogger({ level: 'trace' })
```

### Use Sampling for High Volume

```typescript
const logger = createLogger({
  plugins: [
    tailSamplingPlugin({
      adaptive: true,
      monthlyBudget: 10 * 1024 * 1024 * 1024 // 10 GB
    })
  ]
})
```

### Avoid Expensive Operations

```typescript
// ✅ Good - lazy evaluation
if (logger.isLevelEnabled('debug')) {
  logger.debug('Users', { users: JSON.stringify(allUsers) })
}

// ❌ Bad - always computes
logger.debug('Users', { users: JSON.stringify(allUsers) })
```

## Testing

### Use Memory Transport

```typescript
class MemoryTransport implements Transport {
  logs: LogEntry[] = []

  async log(entry: LogEntry): Promise<void> {
    this.logs.push(entry)
  }

  clear() {
    this.logs = []
  }
}

const transport = new MemoryTransport()
const logger = createLogger({ transports: [transport] })

// Test
logger.info('Test')
expect(transport.logs).toHaveLength(1)
```

### Mock Logger in Tests

```typescript
const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn()
}

// Inject into code under test
const service = new UserService(mockLogger)
```

## Deployment

### Graceful Shutdown

```typescript
async function shutdown() {
  logger.info('Shutting down gracefully')
  await logger.flush()
  await logger.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

### Health Checks

```typescript
app.get('/health', (req, res) => {
  // Don't log health checks (noise)
  res.json({ status: 'ok' })
})

// Or use filtering
const logger = createLogger({
  plugins: [{
    name: 'filter-health',
    onLog(entry) {
      if (entry.data?.url?.includes('/health')) {
        return null // Drop
      }
      return entry
    }
  }]
})
```

## Environment Variables

### Configuration

```typescript
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  formatter: process.env.LOG_FORMAT === 'pretty'
    ? prettyFormatter()
    : jsonFormatter(),
  transports: [
    consoleTransport(),
    ...(process.env.OTLP_ENDPOINT ? [
      otlpTransport({
        endpoint: process.env.OTLP_ENDPOINT,
        headers: {
          Authorization: `Bearer ${process.env.OTLP_TOKEN}`
        }
      })
    ] : [])
  ]
})
```

### Secrets Management

```typescript
// ✅ Good - environment variables
otlpTransport({
  headers: {
    Authorization: `Bearer ${process.env.OTLP_TOKEN}`
  }
})

// ❌ Bad - hardcoded secrets
otlpTransport({
  headers: {
    Authorization: 'Bearer sk-1234567890abcdef'
  }
})
```

## Documentation

### Add Context Comments

```typescript
// Log user authentication events for security audit
logger.info('User authentication', {
  userId,
  method: 'oauth2',
  provider: 'google',
  success: true
})
```

### Document Log Schemas

```typescript
/**
 * Payment processing event
 * @property {string} orderId - Order identifier
 * @property {number} amount - Payment amount in cents
 * @property {string} currency - ISO 4217 currency code
 * @property {string} gateway - Payment gateway used
 */
logger.info('Payment processed', {
  orderId,
  amount,
  currency,
  gateway
})
```

## See Also

- [Performance](/guide/performance) - Optimization tips
- [Security](/guide/redaction) - Redaction and PII
- [Tracing](/guide/tracing) - Distributed tracing
- [API Reference](/api/) - Complete API
