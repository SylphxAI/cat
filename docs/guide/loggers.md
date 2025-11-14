# Loggers

The logger is the core component of @sylphx/cat. It handles log entry creation, level filtering, plugin execution, formatting, and transport delivery.

## Creating a Logger

### Basic Logger

```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger()

logger.info('Hello world!')
```

### Configured Logger

```typescript
import { createLogger, jsonFormatter, consoleTransport } from '@sylphx/cat'

const logger = createLogger({
  level: 'debug',
  formatter: jsonFormatter(),
  transports: [consoleTransport()],
  context: { app: 'my-app', env: 'production' }
})
```

## Logger Options

### Level

Minimum log level to output:

```typescript
const logger = createLogger({
  level: 'info' // trace | debug | info | warn | error | fatal
})

logger.trace('Not logged') // Below threshold
logger.debug('Not logged') // Below threshold
logger.info('Logged') // ✓
logger.warn('Logged') // ✓
logger.error('Logged') // ✓
logger.fatal('Logged') // ✓
```

**Dynamic level changes:**

```typescript
logger.setLevel('debug')
logger.debug('Now visible!')
```

### Context

Static context added to all logs:

```typescript
const logger = createLogger({
  context: {
    app: 'my-app',
    version: '1.0.0',
    environment: 'production'
  }
})

logger.info('Request received')
// Output: { app: 'my-app', version: '1.0.0', environment: 'production',
//           level: 'info', msg: 'Request received', ... }
```

### Formatter

Controls log output format:

```typescript
import { jsonFormatter, prettyFormatter } from '@sylphx/cat'

// JSON formatter (production)
const prodLogger = createLogger({
  formatter: jsonFormatter()
})

// Pretty formatter (development)
const devLogger = createLogger({
  formatter: prettyFormatter({ colors: true })
})
```

See [Formatters](/guide/formatters) for details.

### Transports

Output destinations for logs:

```typescript
import { consoleTransport, fileTransport, otlpTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    consoleTransport(), // stdout/stderr
    fileTransport({ path: './logs/app.log' }), // file
    otlpTransport({ endpoint: 'http://localhost:4318/v1/logs' }) // OTLP
  ]
})
```

See [Transports](/guide/transports) for details.

### Plugins

Middleware for log processing:

```typescript
import { contextPlugin, tracingPlugin, redactionPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    contextPlugin({ requestId: 'req-123' }),
    tracingPlugin(),
    redactionPlugin({ fields: ['password'] })
  ]
})
```

See [Plugins](/guide/plugins) for details.

### Batch Mode

Buffer logs for high-throughput scenarios:

```typescript
const logger = createLogger({
  batch: true,
  batchSize: 100, // Flush after 100 logs
  batchInterval: 1000 // Or every 1 second
})

for (let i = 0; i < 10000; i++) {
  logger.info(`Event ${i}`)
}

await logger.flush() // Manual flush
```

## Log Methods

### Log Levels

```typescript
logger.trace('Very detailed trace') // Most verbose
logger.debug('Debug information')
logger.info('General information') // Default level
logger.warn('Warning message')
logger.error('Error message')
logger.fatal('Fatal error') // Least verbose
```

### Log with Data

```typescript
logger.info('User login', {
  userId: '123',
  username: 'john',
  ip: '192.168.1.1'
})

// Output: { level: 'info', msg: 'User login',
//           userId: '123', username: 'john', ip: '192.168.1.1', ... }
```

### Generic Log Method

```typescript
logger.log('info', 'Message', { key: 'value' })

// Equivalent to:
logger.info('Message', { key: 'value' })
```

## Child Loggers

Create scoped loggers with additional context:

```typescript
const logger = createLogger({ context: { app: 'my-app' } })

// Child logger inherits parent context
const authLogger = logger.child({ service: 'auth' })
authLogger.info('User logged in', { userId: '123' })
// Output: { app: 'my-app', service: 'auth',
//           level: 'info', msg: 'User logged in', userId: '123' }

// Nested child loggers
const oauth2Logger = authLogger.child({ provider: 'google' })
oauth2Logger.info('OAuth flow started')
// Output: { app: 'my-app', service: 'auth', provider: 'google', ... }
```

**Use cases:**
- Request-scoped logging (requestId)
- Service-scoped logging (microservices)
- User-scoped logging (userId)
- Transaction-scoped logging (transactionId)

## Logger Lifecycle

### Flushing Logs

Ensure all buffered logs are written:

```typescript
// Flush and wait for completion
await logger.flush()

// Flush before process exit
process.on('SIGINT', async () => {
  await logger.flush()
  process.exit(0)
})
```

### Closing Logger

Cleanup resources and close transports:

```typescript
await logger.close()

// Automatically flushes before closing
// Closes all transports
// Releases all resources
```

**Best practice:**

```typescript
async function gracefulShutdown() {
  logger.info('Shutting down gracefully')
  await logger.close()
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
```

## Advanced Patterns

### Environment-Based Configuration

```typescript
import { createLogger, jsonFormatter, prettyFormatter, consoleTransport } from '@sylphx/cat'

const isDev = process.env.NODE_ENV === 'development'

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  formatter: isDev ? prettyFormatter({ colors: true }) : jsonFormatter(),
  transports: [consoleTransport()],
  context: {
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version
  }
})
```

### Per-Module Loggers

```typescript
// logger.ts
export const createModuleLogger = (module: string) => {
  return logger.child({ module })
}

// auth.ts
import { createModuleLogger } from './logger'
const authLogger = createModuleLogger('auth')

// database.ts
import { createModuleLogger } from './logger'
const dbLogger = createModuleLogger('database')
```

### Request-Scoped Logging

```typescript
import { AsyncLocalStorage } from 'node:async_hooks'

const asyncLocalStorage = new AsyncLocalStorage()

// Middleware
app.use((req, res, next) => {
  const requestId = crypto.randomUUID()
  const requestLogger = logger.child({ requestId })

  asyncLocalStorage.run({ logger: requestLogger }, () => {
    next()
  })
})

// Access in handlers
app.get('/users', async (req, res) => {
  const { logger } = asyncLocalStorage.getStore()
  logger.info('Fetching users')
})
```

### Testing

```typescript
import { createLogger } from '@sylphx/cat'
import type { Transport, LogEntry } from '@sylphx/cat'

// Mock transport for testing
class MemoryTransport implements Transport {
  logs: Array<{ entry: LogEntry; formatted: string }> = []

  async log(entry: LogEntry, formatted: string): Promise<void> {
    this.logs.push({ entry, formatted })
  }

  clear() {
    this.logs = []
  }
}

describe('MyService', () => {
  let memoryTransport: MemoryTransport
  let logger: Logger

  beforeEach(() => {
    memoryTransport = new MemoryTransport()
    logger = createLogger({ transports: [memoryTransport] })
  })

  it('logs user creation', async () => {
    await createUser({ name: 'John' })

    expect(memoryTransport.logs).toHaveLength(1)
    expect(memoryTransport.logs[0].entry.message).toBe('User created')
  })
})
```

## Performance Considerations

### Fast-Path Filtering

Logs below threshold are filtered before any processing:

```typescript
const logger = createLogger({ level: 'info' })

// Very fast - ~234M ops/sec (just a level check)
logger.debug('This is filtered out')

// Slower - ~21M ops/sec (full processing)
logger.info('This is processed')
```

### Avoid Expensive Computations

```typescript
// ❌ Bad - always computes
logger.debug('Users: ' + JSON.stringify(users))

// ✅ Good - only computes if debug level is enabled
if (logger.isLevelEnabled('debug')) {
  logger.debug('Users: ' + JSON.stringify(users))
}

// ✅ Better - lazy evaluation
logger.debug('Users computed', () => ({
  users: expensiveComputation()
}))
```

### Batch Mode for High Throughput

```typescript
const logger = createLogger({
  batch: true,
  batchSize: 100,
  batchInterval: 1000
})

// Fast - logs are buffered
for (let i = 0; i < 100000; i++) {
  logger.info(`Event ${i}`)
}

await logger.flush() // Single write for all logs
```

## See Also

- [Formatters](/guide/formatters) - Output formatting
- [Transports](/guide/transports) - Log destinations
- [Plugins](/guide/plugins) - Log processing
- [Best Practices](/guide/best-practices) - Production patterns
- [API Reference](/api/logger) - Complete API
