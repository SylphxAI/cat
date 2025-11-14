# @sylphx/cat

> The fastest, lightest, and most extensible logger for JavaScript

[![npm version](https://img.shields.io/npm/v/@sylphx/cat.svg)](https://www.npmjs.com/package/@sylphx/cat)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@sylphx/cat)](https://bundlephobia.com/package/@sylphx/cat)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**1.97 KB** • **Zero dependencies** • **Universal runtime support**

## Installation

```bash
npm install @sylphx/cat
```

## Description

@sylphx/cat is a blazing-fast, minimal logger designed for all JavaScript runtimes. It provides structured JSON logging with automatic error serialization, type-safe APIs, and extensibility through formatters, transports, and plugins.

Perfect for CLIs, APIs, microservices, and any application where performance and bundle size matter.

## Usage Examples

### Basic Logging

```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger()

logger.info('Server started', { port: 3000 })
// {"level":"info","timestamp":1700000000000,"message":"Server started","data":{"port":3000}}

logger.error('Connection failed', { host: 'db.example.com' })
// {"level":"error","timestamp":1700000000000,"message":"Connection failed","data":{"host":"db.example.com"}}
```

### Error Serialization

Errors are automatically serialized with full stack traces:

```typescript
import { createLogger, stdSerializers } from '@sylphx/cat'

const logger = createLogger({
  serializers: stdSerializers
})

try {
  throw new Error('Database connection failed')
} catch (err) {
  logger.error('Failed to connect', { err })
  // {"level":"error","message":"Failed to connect","err":{"message":"Database connection failed","stack":"..."}}
}
```

### Child Loggers with Context

```typescript
const logger = createLogger({ context: { service: 'api' } })
const requestLogger = logger.child({ requestId: 'abc-123' })

requestLogger.info('Processing request')
// {"level":"info","message":"Processing request","context":{"service":"api","requestId":"abc-123"}}
```

### Custom Log Levels

```typescript
const logger = createLogger({ level: 'warn' })

logger.debug('This will not be logged')
logger.warn('This will be logged')
logger.error('This will also be logged')
```

## API Reference

### Core Exports

#### `createLogger(options?: LoggerOptions): Logger`

Creates a new logger instance.

**Options:**
- `level?: LogLevel` - Minimum log level (default: `'info'`)
- `formatter?: Formatter` - Log formatter (default: JSON)
- `transports?: Transport[]` - Output transports (default: console)
- `plugins?: Plugin[]` - Logger plugins
- `context?: Record<string, unknown>` - Global context
- `batch?: boolean` - Enable batching (default: `false`)
- `batchSize?: number` - Batch size (default: `100`)
- `batchInterval?: number` - Batch interval in ms (default: `1000`)

#### `Logger` Interface

Main logging methods:
- `trace(message: string, data?: Record<string, unknown>): void`
- `debug(message: string, data?: Record<string, unknown>): void`
- `info(message: string, data?: Record<string, unknown>): void`
- `warn(message: string, data?: Record<string, unknown>): void`
- `error(message: string, data?: Record<string, unknown>): void`
- `fatal(message: string, data?: Record<string, unknown>): void`

Utility methods:
- `setLevel(level: LogLevel): void`
- `child(context: Record<string, unknown>): Logger`
- `flush(): Promise<void>`
- `close(): Promise<void>`

### Built-in Formatters

#### `jsonFormatter(): Formatter`

Default JSON formatter (already included in core).

```typescript
import { createLogger, jsonFormatter } from '@sylphx/cat'

const logger = createLogger({
  formatter: jsonFormatter()
})
```

### Built-in Transports

#### `consoleTransport(): Transport`

Default console transport (already included in core).

```typescript
import { createLogger, consoleTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [consoleTransport()]
})
```

### Built-in Serializers

#### `stdSerializers`

Standard serializers including automatic error serialization.

```typescript
import { createLogger, stdSerializers } from '@sylphx/cat'

const logger = createLogger({
  serializers: stdSerializers
})
```

**Available serializers:**
- `err` / `error` - Serializes Error objects with stack traces

#### `serializeError(err: Error): SerializedError`

Manually serialize an error object.

```typescript
import { serializeError } from '@sylphx/cat'

const serialized = serializeError(new Error('Something went wrong'))
// { message: 'Something went wrong', stack: '...', name: 'Error' }
```

## Package Size

- **Minified:** ~6 KB
- **Minified + Gzipped:** 1.97 KB
- **Zero dependencies**

## Links

- [Main Documentation](https://cat.sylphx.com)
- [GitHub Repository](https://github.com/SylphxAI/cat)
- [npm Package](https://www.npmjs.com/package/@sylphx/cat)
- [API Reference](https://cat.sylphx.com/api/)

## Related Packages

- [@sylphx/cat-pretty](../cat-pretty) - Pretty formatter for development
- [@sylphx/cat-file](../cat-file) - File and stream transports
- [@sylphx/cat-http](../cat-http) - HTTP request/response serializers
- [@sylphx/cat-otlp](../cat-otlp) - OpenTelemetry Protocol export
- [@sylphx/cat-tracing](../cat-tracing) - W3C Trace Context support
- [@sylphx/cat-redaction](../cat-redaction) - PII/sensitive data redaction
- [@sylphx/cat-tail-sampling](../cat-tail-sampling) - Intelligent cost-saving sampling

## License

MIT © Kyle Zhu
