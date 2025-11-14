# Architecture

Internal architecture and design decisions of @sylphx/cat.

## Overview

@sylphx/cat uses a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│             User API                        │
│   createLogger(), logger.info(), etc.       │
└─────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────┐
│           Core Logger                       │
│   Level filtering, entry creation           │
└─────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────┐
│            Plugins                          │
│   Context, Tracing, Redaction, Sampling     │
└─────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────┐
│           Formatter                         │
│     JSON, Pretty, Custom                    │
└─────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────┐
│          Transports                         │
│   Console, File, Stream, OTLP               │
└─────────────────────────────────────────────┘
```

## Core Components

### Logger

**File:** `src/core/logger.ts`

The Logger is the main entry point:

```typescript
export class Logger {
  private level: LogLevel
  private formatter: Formatter
  private transports: Transport[]
  private plugins: Plugin[]
  private context: Record<string, unknown>

  // Log methods
  info(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
  // ...

  // Child logger
  child(context: Record<string, unknown>): Logger

  // Lifecycle
  flush(): Promise<void>
  close(): Promise<void>
}
```

**Responsibilities:**
- Level filtering (fast path)
- Entry creation
- Plugin execution
- Formatter invocation
- Transport delivery

### Formatters

**Files:** `src/formatters/`

Formatters convert LogEntry to string:

```typescript
interface Formatter {
  format(entry: LogEntry): string
}
```

**Built-in:**
- `JsonFormatter` - JSON output
- `PrettyFormatter` - Human-readable output

### Transports

**Files:** `src/transports/`

Transports deliver formatted logs:

```typescript
interface Transport {
  log(entry: LogEntry, formatted: string): Promise<void> | void
}
```

**Built-in:**
- `ConsoleTransport` - stdout/stderr
- `FileTransport` - File system
- `StreamTransport` - Writable streams
- `OtlpTransport` - OpenTelemetry Protocol

### Plugins

**Files:** `src/plugins/`

Plugins process log entries:

```typescript
interface Plugin {
  name: string
  onLog?(entry: LogEntry): LogEntry | null
  flush?(traceId: string): void
}
```

**Built-in:**
- `ContextPlugin` - Static context
- `TracingPlugin` - W3C Trace Context
- `RedactionPlugin` - Sensitive data redaction
- `TailSamplingPlugin` - Smart sampling
- `SamplingPlugin` - Simple sampling

## Data Flow

### 1. Log Entry Creation

```typescript
logger.info('Message', { userId: '123' })
```

Creates a `LogEntry`:

```typescript
{
  level: 'info',
  timestamp: Date.now(),
  message: 'Message',
  data: { userId: '123' }
}
```

### 2. Level Filtering (Fast Path)

```typescript
if (entry.level < this.level) {
  return // Skip processing
}
```

**Performance:** ~234M ops/sec (just a comparison)

### 3. Context Merging

```typescript
entry.data = { ...this.context, ...entry.data }
```

Child logger context is merged with parent context.

### 4. Plugin Execution

```typescript
for (const plugin of this.plugins) {
  entry = plugin.onLog?.(entry) ?? entry
  if (!entry) return // Plugin dropped the log
}
```

Plugins can modify or drop entries.

### 5. Formatting

```typescript
const formatted = this.formatter.format(entry)
```

Converts LogEntry to string.

### 6. Transport Delivery

```typescript
await Promise.all(
  this.transports.map(t => t.log(entry, formatted))
)
```

All transports receive the log in parallel.

## Design Decisions

### 1. Zero Dependencies

**Why:** Smaller bundle, fewer security risks, better tree-shaking

**How:**
- Implement all functionality from scratch
- Use standard library (crypto, fs, etc.)
- No external packages

### 2. Plugin Architecture

**Why:** Extensibility without bloat

**How:**
- Core is minimal
- Features are plugins
- Tree-shakeable

### 3. Synchronous Core, Async Transports

**Why:** Fast logging, non-blocking I/O

**How:**
- Logger methods are synchronous
- Transports can be async
- Batching for performance

### 4. Immutable Entries

**Why:** Predictable behavior, easier debugging

**How:**
- LogEntry is never mutated
- Plugins return new objects
- Spread operator for merging

### 5. Type-Safe API

**Why:** Better DX, fewer runtime errors

**How:**
- Full TypeScript types
- Strict mode enabled
- Comprehensive type exports

## Performance Optimizations

### 1. Fast-Path Level Filtering

Skip all processing for filtered logs:

```typescript
if (entry.level < this.level) {
  return // No formatter, transport, or allocation
}
```

### 2. Lazy Evaluation

Only compute when needed:

```typescript
if (logger.isLevelEnabled('debug')) {
  logger.debug('Expensive: ' + expensiveComputation())
}
```

### 3. Object Pooling

Reuse objects for high-throughput:

```typescript
class ObjectPool<T> {
  private pool: T[] = []

  acquire(): T { return this.pool.pop() || this.create() }
  release(obj: T): void { this.pool.push(obj) }

  private create(): T { /* ... */ }
}
```

### 4. Batching

Reduce I/O overhead:

```typescript
class BatchTransport {
  private batch: string[] = []

  log(entry, formatted) {
    this.batch.push(formatted)
    if (this.batch.length >= this.batchSize) {
      this.flush()
    }
  }

  flush() {
    // Write all at once
  }
}
```

## Testing Architecture

### Unit Tests

Test individual components:

```typescript
describe('JsonFormatter', () => {
  it('formats entry as JSON', () => {
    const formatter = new JsonFormatter()
    const entry = { level: 'info', timestamp: 0, message: 'Test', data: {} }
    const result = formatter.format(entry)
    expect(JSON.parse(result)).toEqual(entry)
  })
})
```

### Integration Tests

Test full workflows:

```typescript
describe('Logger with plugins', () => {
  it('applies plugins in order', () => {
    const logs: LogEntry[] = []
    const logger = createLogger({
      transports: [{ log: (entry) => logs.push(entry) }],
      plugins: [
        { name: 'a', onLog: (e) => ({ ...e, data: { ...e.data, a: 1 } }) },
        { name: 'b', onLog: (e) => ({ ...e, data: { ...e.data, b: 2 } }) }
      ]
    })

    logger.info('Test')
    expect(logs[0].data).toEqual({ a: 1, b: 2 })
  })
})
```

## Build System

### TypeScript Compilation

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Bundle Optimization

- Tree-shaking enabled
- Minification
- Source maps
- Type declarations

## File Structure

```
src/
├── core/
│   ├── logger.ts          # Core Logger class
│   └── types.ts           # Type definitions
├── formatters/
│   ├── json.ts            # JSON formatter
│   ├── pretty.ts          # Pretty formatter
│   └── index.ts           # Exports
├── transports/
│   ├── console.ts         # Console transport
│   ├── file.ts            # File transport
│   ├── stream.ts          # Stream transport
│   ├── otlp.ts            # OTLP transport
│   └── index.ts           # Exports
├── plugins/
│   ├── context.ts         # Context plugin
│   ├── tracing.ts         # Tracing plugin
│   ├── redaction.ts       # Redaction plugin
│   ├── tail-sampling.ts   # Tail-based sampling
│   ├── sampling.ts        # Simple sampling
│   └── index.ts           # Exports
├── serializers/
│   ├── error.ts           # Error serializer
│   ├── request.ts         # Request serializer
│   ├── response.ts        # Response serializer
│   └── index.ts           # Exports
├── tracing/
│   └── context.ts         # W3C Trace Context
└── index.ts               # Main entry point
```

## Future Architecture

### Planned Improvements

1. **Worker Thread Transport**
   - Offload I/O to worker threads
   - Better CPU utilization

2. **Streaming API**
   - Process logs as streams
   - Lower memory usage

3. **WASM Build**
   - Rust-based core
   - 50M+ ops/sec
   - <100 KB bundle

4. **Plugin Marketplace**
   - Community plugins
   - NPM packages

## See Also

- [Contributing](/guide/contributing) - How to contribute
- [API Reference](/api/) - Complete API
- [Best Practices](/guide/best-practices) - Production patterns
