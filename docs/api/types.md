# Types API

TypeScript types and interfaces.

## Core Types

### Logger

```typescript
interface Logger {
  trace(message: string, data?: Record<string, unknown>): void
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
  fatal(message: string, data?: Record<string, unknown>): void
  log(level: LogLevel, message: string, data?: Record<string, unknown>): void
  setLevel(level: LogLevel): void
  isLevelEnabled(level: LogLevel): boolean
  child(context: Record<string, unknown>): Logger
  flush(): Promise<void>
  close(): Promise<void>
}
```

### LoggerOptions

```typescript
interface LoggerOptions {
  level?: LogLevel
  formatter?: Formatter
  transports?: Transport[]
  plugins?: Plugin[]
  context?: Record<string, unknown>
  batch?: boolean
  batchSize?: number
  batchInterval?: number
}
```

### LogEntry

```typescript
interface LogEntry {
  level: LogLevel
  timestamp: number
  message: string
  data?: Record<string, unknown>
}
```

### LogLevel

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
```

## Formatter Types

### Formatter

```typescript
interface Formatter {
  format(entry: LogEntry): string
}
```

## Transport Types

### Transport

```typescript
interface Transport {
  log(entry: LogEntry, formatted: string): Promise<void> | void
}
```

## Plugin Types

### Plugin

```typescript
interface Plugin {
  name: string
  onLog?(entry: LogEntry): LogEntry | null
  flush?(traceId: string): void
}
```

## Tracing Types

### TraceContext

```typescript
interface TraceContext {
  traceId: string // 32 hex chars
  spanId: string // 16 hex chars
  traceFlags: number // 0x00 or 0x01
  traceState?: string // Vendor data
}
```

### TraceFlags

```typescript
const TraceFlags = {
  NONE: 0x00,
  SAMPLED: 0x01
} as const
```

## Serializer Types

### SerializedError

```typescript
interface SerializedError {
  type: string
  message: string
  stack?: string
  cause?: SerializedError
  [key: string]: unknown
}
```

## See Also

- [Logger API](/api/logger)
- [Formatters API](/api/formatters)
- [Transports API](/api/transports)
- [Plugins API](/api/plugins)
