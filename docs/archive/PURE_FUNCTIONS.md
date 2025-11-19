# 🔬 Pure Functions Architecture - @sylphx/cat

## Pure vs Impure Functions in Logging

### What is a Pure Function?

A pure function:
1. **Deterministic**: Same input → Same output (always)
2. **No Side Effects**: Doesn't modify external state
3. **Referentially Transparent**: Can be replaced with its return value

---

## Current Architecture Analysis

### ✅ PURE Functions (Good!)

#### 1. Formatters (Mostly Pure)

**JsonFormatter.format()**
```typescript
format(entry: LogEntry): string {
  return JSON.stringify({
    level: entry.level,
    time: entry.timestamp,
    msg: entry.message,
    ...(entry.data && { data: entry.data }),
    ...(entry.context && entry.context),
  })
}
```
✅ **Pure** - Given same entry, always returns same JSON string
⚠️ **Exception**: JSON.stringify can throw on circular references (side effect: error)

#### 2. Plugins (Pure Transformations)

**ContextPlugin.onLog()**
```typescript
onLog(entry: LogEntry): LogEntry {
  return {
    ...entry,
    context: {
      ...this.context,
      ...entry.context,
    },
  }
}
```
✅ **Pure** - Transforms entry → new entry (immutable)

**SamplingPlugin.onLog()**
```typescript
onLog(entry: LogEntry): LogEntry | null {
  return Math.random() < this.rate ? entry : null
}
```
❌ **Impure** - Math.random() is non-deterministic!

### ❌ IMPURE Functions (Necessary)

#### 1. Logger.log()
```typescript
log(level: LogLevel, message: string, data?: any): void {
  // Side effects:
  // - Writes to transports
  // - Modifies batchQueue
  // - Sets timers
}
```
❌ **Impure** - Side effects are the PURPOSE of logging

#### 2. Transports
```typescript
log(entry: LogEntry, formatted: string): void {
  console.log(formatted)  // Side effect: console output
}
```
❌ **Impure** - I/O operations are inherently impure

### ⚠️ MIXED Functions (Needs Improvement)

#### PrettyFormatter.format()
```typescript
format(entry: LogEntry): string {
  // Uses this.startTime (captured at construction)
  // Uses Date.now() implicitly
  const time = this.formatTime(entry.timestamp)
}
```
⚠️ **Mixed** - Depends on captured state (this.startTime)

---

## Architectural Improvements for v0.2.0+

### 1. Make All Serializers Pure Functions

**Current (Class-based):**
```typescript
export class JsonFormatter implements Formatter {
  format(entry: LogEntry): string {
    return JSON.stringify(entry)
  }
}
```

**Better (Pure Function):**
```typescript
export const jsonFormatter: Formatter = {
  format: (entry: LogEntry): string => {
    return JSON.stringify({
      level: entry.level,
      time: entry.timestamp,
      msg: entry.message,
      ...(entry.data && { data: entry.data }),
      ...(entry.context && entry.context),
    })
  }
}
```

✅ No class instance, no hidden state, truly pure

### 2. Extract Pure Transformation Functions

**Current (Mixed):**
```typescript
class Logger {
  log(level: LogLevel, message: string, data?: any): void {
    // Create entry (pure)
    const entry = { level, timestamp: Date.now(), message, data }

    // Transform (pure)
    let transformed = this.applyPlugins(entry)

    // Side effects (impure)
    this.writeToTransports(transformed)
  }
}
```

**Better (Separated):**
```typescript
// Pure: Entry creation
function createLogEntry(
  level: LogLevel,
  message: string,
  data?: any
): LogEntry {
  return {
    level,
    timestamp: Date.now(), // Only impurity: time
    message,
    data,
  }
}

// Pure: Plugin pipeline
function applyPlugins(
  entry: LogEntry,
  plugins: Plugin[]
): LogEntry | null {
  return plugins.reduce((acc, plugin) => {
    if (acc === null) return null
    return plugin.onLog?.(acc) ?? acc
  }, entry as LogEntry | null)
}

// Impure: Side effects isolated
class Logger {
  log(level: LogLevel, message: string, data?: any): void {
    const entry = createLogEntry(level, message, data)
    const transformed = applyPlugins(entry, this.plugins)

    if (transformed) {
      this.writeToTransports(transformed) // Only impure part
    }
  }
}
```

✅ Pure functions are testable in isolation
✅ Side effects are clearly isolated
✅ Easier to reason about

### 3. Make Sampling Deterministic (or Explicit)

**Current (Non-deterministic):**
```typescript
onLog(entry: LogEntry): LogEntry | null {
  return Math.random() < this.rate ? entry : null
}
```

**Better (Deterministic with Seed):**
```typescript
export interface SamplingOptions {
  rate: number
  seed?: number  // For reproducibility
  strategy?: 'random' | 'modulo' | 'hash'
}

// Deterministic: hash-based sampling
function hashSample(entry: LogEntry, rate: number): boolean {
  const hash = simpleHash(entry.message + entry.timestamp)
  return (hash % 100) < (rate * 100)
}

// Pure: Entry number modulo sampling
function moduloSample(entryNumber: number, rate: number): boolean {
  return entryNumber % Math.floor(1 / rate) === 0
}
```

✅ Deterministic for testing
✅ Reproducible results
⚠️ Trade-off: Random sampling is sometimes desired

---

## Functional Programming Principles

### 1. Composition Over Mutation

**❌ Bad (Mutation):**
```typescript
function addContext(entry: LogEntry, context: any): LogEntry {
  entry.context = { ...entry.context, ...context } // MUTATES!
  return entry
}
```

**✅ Good (Immutable):**
```typescript
function addContext(
  entry: LogEntry,
  context: Record<string, unknown>
): LogEntry {
  return {
    ...entry,
    context: { ...entry.context, ...context }
  }
}
```

### 2. Function Pipeline

**❌ Bad (Imperative):**
```typescript
let entry = createEntry(level, message)
entry = addTimestamp(entry)
entry = addContext(entry, ctx)
entry = sanitize(entry)
```

**✅ Good (Functional):**
```typescript
const entry = pipe(
  createEntry(level, message),
  addTimestamp,
  (e) => addContext(e, ctx),
  sanitize
)

// Or with compose:
const processEntry = compose(
  sanitize,
  addContext(ctx),
  addTimestamp
)
const entry = processEntry(createEntry(level, message))
```

### 3. Separate Pure from Impure

```typescript
// ===== PURE LAYER =====
function createEntry(...): LogEntry { ... }
function formatEntry(...): string { ... }
function serializeError(...): object { ... }
function redactSensitive(...): LogEntry { ... }

// ===== IMPURE LAYER =====
class Logger {
  log(...): void {
    // Use pure functions
    const entry = createEntry(...)
    const formatted = formatEntry(entry)

    // Side effect isolated here
    this.writeToTransport(formatted)
  }
}
```

✅ Pure functions: 100% testable, no mocks needed
✅ Impure functions: Clearly marked, minimal surface area

---

## Refactoring Plan for v0.2.0

### Week 1: Core Pure Functions

```typescript
// src/core/pure.ts

// Pure entry creation
export function createLogEntry(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
  context?: Record<string, unknown>
): LogEntry {
  return {
    level,
    timestamp: Date.now(), // Only time-based impurity
    message,
    data,
    context: context ?? {},
  }
}

// Pure plugin application
export function applyPlugin(
  entry: LogEntry,
  plugin: Plugin
): LogEntry | null {
  return plugin.onLog?.(entry) ?? entry
}

// Pure plugin pipeline
export function applyPlugins(
  entry: LogEntry,
  plugins: Plugin[]
): LogEntry | null {
  return plugins.reduce((acc, plugin) => {
    if (acc === null) return null
    return applyPlugin(acc, plugin)
  }, entry as LogEntry | null)
}

// Pure level filtering
export function shouldLog(
  entryLevel: LogLevel,
  minLevel: LogLevel
): boolean {
  return LOG_LEVELS[entryLevel] >= LOG_LEVELS[minLevel]
}
```

### Week 2: Pure Serializers

```typescript
// src/serializers/pure.ts

// Pure error serialization
export function serializeError(error: Error): ErrorSerialized {
  return {
    type: error.name || 'Error',
    message: error.message,
    stack: error.stack,
    cause: error.cause instanceof Error
      ? serializeError(error.cause)
      : undefined,
  }
}

// Pure object serialization
export function serializeValue(
  value: unknown,
  serializers: SerializerRegistry
): unknown {
  if (value instanceof Error) {
    return serializeError(value)
  }

  if (typeof value === 'object' && value !== null) {
    const result: any = Array.isArray(value) ? [] : {}
    for (const [key, val] of Object.entries(value)) {
      const serializer = serializers[key]
      result[key] = serializer
        ? serializer(val)
        : serializeValue(val, serializers)
    }
    return result
  }

  return value
}
```

### Week 3: Pure Formatters

```typescript
// src/formatters/pure.ts

// Pure JSON formatting
export const jsonFormat = (entry: LogEntry): string => {
  return JSON.stringify({
    level: entry.level,
    time: entry.timestamp,
    msg: entry.message,
    ...(entry.data && { data: entry.data }),
    ...(entry.context && entry.context),
  })
}

// Pure pretty formatting (inject dependencies)
export const prettyFormat = (
  entry: LogEntry,
  options: {
    colors?: boolean
    timestampFormat?: 'iso' | 'unix'
  }
): string => {
  const parts: string[] = []

  // Timestamp (pure transformation)
  const timestamp = options.timestampFormat === 'iso'
    ? new Date(entry.timestamp).toISOString()
    : entry.timestamp.toString()

  parts.push(timestamp)
  parts.push(LEVEL_LABELS[entry.level])
  parts.push(entry.message)

  if (entry.data) {
    parts.push(JSON.stringify(entry.data))
  }

  return parts.join(' ')
}
```

### Week 4: Pure Validation & Security

```typescript
// src/security/pure.ts

// Pure input validation
export function validateMessage(
  message: string,
  options: { maxLength: number }
): string {
  if (message.length > options.maxLength) {
    return message.slice(0, options.maxLength) + '...'
  }
  return message
}

// Pure log injection prevention
export function sanitizeLogMessage(message: string): string {
  // Remove CR/LF to prevent log injection
  return message.replace(/[\r\n]/g, ' ')
}

// Pure redaction
export function redactValue(
  value: unknown,
  patterns: RegExp[]
): unknown {
  if (typeof value === 'string') {
    for (const pattern of patterns) {
      if (pattern.test(value)) {
        return '[REDACTED]'
      }
    }
  }
  return value
}

// Pure path matching
export function matchesPath(
  path: string[],
  pattern: string
): boolean {
  // Implement glob matching logic
  // Pure: deterministic, no side effects
  return globMatch(path.join('.'), pattern)
}
```

---

## Testing Benefits

### Pure Functions: Easy Testing

```typescript
// No mocks, no setup, just input → output
test('serializeError extracts all properties', () => {
  const error = new Error('test')
  error.code = 'TEST_ERROR'

  const result = serializeError(error)

  expect(result.type).toBe('Error')
  expect(result.message).toBe('test')
  expect(result.code).toBe('TEST_ERROR')
})

test('sanitizeLogMessage removes newlines', () => {
  expect(sanitizeLogMessage('line1\nline2')).toBe('line1 line2')
})
```

### Impure Functions: Need Mocks

```typescript
// Requires mocking console, file system, etc.
test('logger writes to console', () => {
  const mockConsole = vi.spyOn(console, 'log')

  const logger = createLogger()
  logger.info('test')

  expect(mockConsole).toHaveBeenCalled()
})
```

---

## Performance Benefits

### 1. Memoization (Only for Pure Functions)

```typescript
// Can safely memoize pure functions
const memoizedFormat = memoize(jsonFormat)

// Same entry → cached result (no recomputation)
const result1 = memoizedFormat(entry)
const result2 = memoizedFormat(entry) // Instant!
```

### 2. Parallel Processing

```typescript
// Pure functions can run in parallel
const entries = [entry1, entry2, entry3]

// Safe to parallelize (no shared state)
const formatted = await Promise.all(
  entries.map(entry => jsonFormat(entry))
)
```

### 3. Lazy Evaluation

```typescript
// Pure functions enable lazy chains
const logPipeline = pipe(
  createEntry,
  lazy(applyPlugins),      // Won't run unless needed
  lazy(formatEntry),       // Won't run unless needed
  lazy(serializeError)     // Won't run unless needed
)

// Only evaluates when consumed
const result = logPipeline(input).value()
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│         Pure Layer (100% Testable)             │
├─────────────────────────────────────────────────┤
│  - createLogEntry(level, msg, data)            │
│  - applyPlugins(entry, plugins)                │
│  - serializeError(error)                       │
│  - formatEntry(entry, formatter)               │
│  - validateEntry(entry, rules)                 │
│  - redactSensitive(entry, patterns)            │
│  - shouldLog(level, minLevel)                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│      Impure Layer (Side Effects Isolated)      │
├─────────────────────────────────────────────────┤
│  - Logger.log() → calls pure functions         │
│  - Transport.log() → writes to I/O             │
│  - FileTransport → disk writes                 │
│  - HTTPTransport → network calls               │
└─────────────────────────────────────────────────┘
```

---

## Summary: Current vs Target

### Current (v0.1.0)

| Component | Pure? | Notes |
|-----------|-------|-------|
| JsonFormatter | ✅ Mostly | JSON.stringify can throw |
| PrettyFormatter | ❌ No | Uses this.startTime |
| ContextPlugin | ✅ Yes | Pure transformation |
| SamplingPlugin | ❌ No | Math.random() |
| Logger.log() | ❌ No | Side effects (intended) |

### Target (v0.2.0+)

| Component | Pure? | Implementation |
|-----------|-------|----------------|
| All Serializers | ✅ Yes | Pure functions |
| All Formatters | ✅ Yes | Inject dependencies |
| Plugin Pipeline | ✅ Yes | Pure composition |
| Validation | ✅ Yes | Pure transforms |
| Redaction | ✅ Yes | Pure filtering |
| Sampling | ⚠️ Optional | Deterministic mode |
| Logger I/O | ❌ No | Side effects isolated |

---

## Principles for Future Development

### 1. Default to Pure
Write pure functions unless side effects are required

### 2. Isolate Side Effects
Push impurity to edges (I/O layer)

### 3. Explicit Dependencies
Don't hide state, inject it

### 4. Immutable Data
Always return new objects, never mutate

### 5. Composition
Build complex behavior from simple pure functions

---

**Benefits:**
- ✅ Easier testing (no mocks for pure functions)
- ✅ Better performance (memoization, parallelization)
- ✅ Easier reasoning (deterministic behavior)
- ✅ More maintainable (isolated side effects)
- ✅ More flexible (composable building blocks)

**Trade-offs:**
- ⚠️ More function calls (usually negligible)
- ⚠️ More memory allocations (immutability)
- ⚠️ Slightly more verbose (explicit is better)

---

*Created: 2025-01-15*
*Target: Implement in v0.2.0*
