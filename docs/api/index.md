# API Reference

Complete API documentation for @sylphx/cat.

## Core

- [Logger](/api/logger) - Logger creation and methods
- [Types](/api/types) - TypeScript types and interfaces

## Formatting

- [Formatters](/api/formatters) - JSON, Pretty, and custom formatters

## Output

- [Transports](/api/transports) - Console, File, Stream, and OTLP transports

## Middleware

- [Plugins](/api/plugins) - Context, Tracing, Redaction, and Sampling plugins

## Utilities

- [Serializers](/api/serializers) - Error, Request, and Response serializers

## Quick Reference

### Import

```typescript
import {
  createLogger,
  jsonFormatter,
  prettyFormatter,
  consoleTransport,
  fileTransport,
  streamTransport,
  otlpTransport,
  contextPlugin,
  tracingPlugin,
  redactionPlugin,
  tailSamplingPlugin,
  samplingPlugin,
  serializeError,
  requestSerializer,
  responseSerializer,
  autoSerializeErrors
} from '@sylphx/cat'
```

### Create Logger

```typescript
const logger = createLogger(options?: LoggerOptions): Logger
```

See [Logger API](/api/logger) for details.

### Log Methods

```typescript
logger.trace(message: string, data?: Record<string, unknown>): void
logger.debug(message: string, data?: Record<string, unknown>): void
logger.info(message: string, data?: Record<string, unknown>): void
logger.warn(message: string, data?: Record<string, unknown>): void
logger.error(message: string, data?: Record<string, unknown>): void
logger.fatal(message: string, data?: Record<string, unknown>): void
```

### Type Hierarchy

```
Logger
├── LoggerOptions
│   ├── level?: LogLevel
│   ├── formatter?: Formatter
│   ├── transports?: Transport[]
│   ├── plugins?: Plugin[]
│   ├── context?: Record<string, unknown>
│   ├── batch?: boolean
│   ├── batchSize?: number
│   └── batchInterval?: number
├── LogEntry
│   ├── level: LogLevel
│   ├── timestamp: number
│   ├── message: string
│   └── data?: Record<string, unknown>
└── LogLevel
    ├── 'trace'
    ├── 'debug'
    ├── 'info'
    ├── 'warn'
    ├── 'error'
    └── 'fatal'
```

## See Also

- [Getting Started](/guide/getting-started) - Quick start guide
- [Examples](/examples/) - Real-world examples
- [Best Practices](/guide/best-practices) - Production patterns
