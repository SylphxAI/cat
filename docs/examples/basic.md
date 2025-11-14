# Basic Usage Examples

Simple logging patterns for getting started.

## Hello World

```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger()

logger.info('Hello world!')
```

## All Log Levels

```typescript
const logger = createLogger({ level: 'trace' })

logger.trace('Very detailed trace')
logger.debug('Debug information')
logger.info('General information')
logger.warn('Warning message')
logger.error('Error message')
logger.fatal('Fatal error')
```

## Structured Logging

```typescript
logger.info('User login', {
  userId: '123',
  username: 'john',
  ip: '192.168.1.1',
  timestamp: Date.now()
})

// Output: {"level":"info","time":1234567890,"msg":"User login","userId":"123",...}
```

## Pretty Printing

```typescript
import { createLogger, prettyFormatter } from '@sylphx/cat'

const logger = createLogger({
  formatter: prettyFormatter({
    colors: true,
    timestampFormat: 'iso'
  })
})

logger.info('Server started', { port: 3000 })
// Output: 2024-01-01T12:00:00.000Z INF Server started {"port":3000}
```

## Child Loggers

```typescript
const logger = createLogger({ context: { app: 'my-app' } })

const authLogger = logger.child({ service: 'auth' })
authLogger.info('User logged in', { userId: '123' })
// Output includes: app: 'my-app', service: 'auth'

const dbLogger = logger.child({ service: 'database' })
dbLogger.debug('Query executed', { query: 'SELECT * FROM users' })
// Output includes: app: 'my-app', service: 'database'
```

## Multiple Transports

```typescript
import { consoleTransport, fileTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    consoleTransport(), // stdout/stderr
    fileTransport({ path: './logs/app.log' }) // file
  ]
})

logger.info('This goes to both console and file')
```

## Error Logging

```typescript
import { autoSerializeErrors } from '@sylphx/cat'

const logger = createLogger({
  plugins: [autoSerializeErrors()]
})

try {
  throw new Error('Something went wrong')
} catch (error) {
  logger.error('Request failed', {
    error,
    userId: '123',
    requestId: 'req-456'
  })
}

// Output includes full stack trace and error details
```

## Environment-Based Configuration

```typescript
const isDev = process.env.NODE_ENV === 'development'

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  formatter: isDev ? prettyFormatter({ colors: true }) : jsonFormatter()
})
```

## See Also

- [Production Setup](/examples/production)
- [Getting Started Guide](/guide/getting-started)
