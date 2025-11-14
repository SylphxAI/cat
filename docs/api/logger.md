# Logger API

Complete API reference for the Logger class.

## createLogger

Create a new logger instance.

```typescript
function createLogger(options?: LoggerOptions): Logger
```

### Parameters

```typescript
interface LoggerOptions {
  level?: LogLevel // Minimum log level (default: 'info')
  formatter?: Formatter // Log formatter (default: jsonFormatter())
  transports?: Transport[] // Output transports (default: [consoleTransport()])
  plugins?: Plugin[] // Middleware plugins (default: [])
  context?: Record<string, unknown> // Static context (default: {})
  batch?: boolean // Enable batching (default: false)
  batchSize?: number // Batch size (default: 100)
  batchInterval?: number // Batch interval in ms (default: 1000)
}
```

### Returns

`Logger` - Logger instance

### Example

```typescript
import { createLogger, jsonFormatter, consoleTransport } from '@sylphx/cat'

const logger = createLogger({
  level: 'info',
  formatter: jsonFormatter(),
  transports: [consoleTransport()],
  context: { app: 'my-app' }
})
```

## Logger Methods

### Log Methods

#### trace

```typescript
trace(message: string, data?: Record<string, unknown>): void
```

Log at trace level (most verbose).

```typescript
logger.trace('Function entry', { args: [1, 2, 3] })
```

#### debug

```typescript
debug(message: string, data?: Record<string, unknown>): void
```

Log at debug level.

```typescript
logger.debug('Cache hit', { key: 'user:123', value: { ... } })
```

#### info

```typescript
info(message: string, data?: Record<string, unknown>): void
```

Log at info level (default minimum level).

```typescript
logger.info('Server started', { port: 3000 })
```

#### warn

```typescript
warn(message: string, data?: Record<string, unknown>): void
```

Log at warn level.

```typescript
logger.warn('High memory usage', { usage: '85%' })
```

#### error

```typescript
error(message: string, data?: Record<string, unknown>): void
```

Log at error level.

```typescript
logger.error('Request failed', { error, statusCode: 500 })
```

#### fatal

```typescript
fatal(message: string, data?: Record<string, unknown>): void
```

Log at fatal level (least verbose).

```typescript
logger.fatal('Database connection lost', { error })
```

#### log

```typescript
log(level: LogLevel, message: string, data?: Record<string, unknown>): void
```

Generic log method.

```typescript
logger.log('info', 'Message', { key: 'value' })
```

### Configuration Methods

#### setLevel

```typescript
setLevel(level: LogLevel): void
```

Change minimum log level.

```typescript
logger.setLevel('debug')
```

#### isLevelEnabled

```typescript
isLevelEnabled(level: LogLevel): boolean
```

Check if a log level is enabled.

```typescript
if (logger.isLevelEnabled('debug')) {
  logger.debug('Expensive computation', expensiveOperation())
}
```

### Child Logger

#### child

```typescript
child(context: Record<string, unknown>): Logger
```

Create child logger with additional context.

```typescript
const requestLogger = logger.child({ requestId: 'req-123' })
requestLogger.info('Request received')
// Output includes: requestId: 'req-123'
```

Child loggers:
- Inherit parent configuration
- Merge context with parent context
- Share transports and plugins
- Are lightweight (minimal allocation)

### Lifecycle Methods

#### flush

```typescript
async flush(): Promise<void>
```

Flush all pending logs (in batch mode).

```typescript
await logger.flush()
```

#### close

```typescript
async close(): Promise<void>
```

Close logger and cleanup resources.

```typescript
await logger.close()
```

Automatically:
- Flushes pending logs
- Closes all transports
- Releases resources

## Types

### LogLevel

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
```

Log levels in order (least to most severe):
1. `trace` - Very detailed debugging
2. `debug` - Debugging information
3. `info` - General information (default)
4. `warn` - Warning conditions
5. `error` - Error conditions
6. `fatal` - Critical errors

### LogEntry

```typescript
interface LogEntry {
  level: LogLevel // Log level
  timestamp: number // Unix timestamp (ms)
  message: string // Log message
  data?: Record<string, unknown> // Structured data
}
```

### Logger

```typescript
interface Logger {
  // Log methods
  trace(message: string, data?: Record<string, unknown>): void
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
  fatal(message: string, data?: Record<string, unknown>): void
  log(level: LogLevel, message: string, data?: Record<string, unknown>): void

  // Configuration
  setLevel(level: LogLevel): void
  isLevelEnabled(level: LogLevel): boolean

  // Child logger
  child(context: Record<string, unknown>): Logger

  // Lifecycle
  flush(): Promise<void>
  close(): Promise<void>
}
```

## See Also

- [Formatters](/api/formatters) - Log formatting
- [Transports](/api/transports) - Log output
- [Plugins](/api/plugins) - Log processing
- [Types](/api/types) - TypeScript types
