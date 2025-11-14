# Migration Guide

Migrate from Pino, Winston, or console.log to @sylphx/cat.

## From Pino

### Basic Setup

**Pino:**
```typescript
import pino from 'pino'

const logger = pino({
  level: 'info'
})
```

**@sylphx/cat:**
```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger({
  level: 'info'
})
```

### Pretty Printing

**Pino:**
```typescript
import pino from 'pino'

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})
```

**@sylphx/cat:**
```typescript
import { createLogger, prettyFormatter } from '@sylphx/cat'

const logger = createLogger({
  formatter: prettyFormatter({ colors: true })
})
```

### Child Loggers

**Pino:**
```typescript
const child = logger.child({ requestId: 'req-123' })
child.info('Message')
```

**@sylphx/cat:**
```typescript
const child = logger.child({ requestId: 'req-123' })
child.info('Message')
```

✅ Same API

### Serializers

**Pino:**
```typescript
import pino from 'pino'

const logger = pino({
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res
  }
})
```

**@sylphx/cat:**
```typescript
import { createLogger, autoSerializeErrors, requestSerializer } from '@sylphx/cat'

const logger = createLogger({
  plugins: [autoSerializeErrors()]
})

logger.info('Request', {
  req: requestSerializer(req),
  res: responseSerializer(res)
})
```

### Redaction

**Pino:**
```typescript
const logger = pino({
  redact: ['password', 'creditCard']
})
```

**@sylphx/cat:**
```typescript
import { redactionPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: ['password', 'creditCard']
    })
  ]
})
```

## From Winston

### Basic Setup

**Winston:**
```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
})
```

**@sylphx/cat:**
```typescript
import { createLogger, jsonFormatter, consoleTransport } from '@sylphx/cat'

const logger = createLogger({
  level: 'info',
  formatter: jsonFormatter(),
  transports: [consoleTransport()]
})
```

### Multiple Transports

**Winston:**
```typescript
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
})
```

**@sylphx/cat:**
```typescript
import { consoleTransport, fileTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    consoleTransport(),
    fileTransport({ path: 'app.log' })
  ]
})
```

### Custom Format

**Winston:**
```typescript
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
})
```

**@sylphx/cat:**
```typescript
import type { Formatter, LogEntry } from '@sylphx/cat'

class CustomFormatter implements Formatter {
  format(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      ...entry.data
    })
  }
}

const logger = createLogger({
  formatter: new CustomFormatter()
})
```

### Child Loggers

**Winston:**
```typescript
const child = logger.child({ requestId: 'req-123' })
```

**@sylphx/cat:**
```typescript
const child = logger.child({ requestId: 'req-123' })
```

✅ Same API

## From console.log

### Basic Replacement

**console.log:**
```typescript
console.log('User login:', userId)
console.error('Error:', error)
```

**@sylphx/cat:**
```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger()

logger.info('User login', { userId })
logger.error('Error', { error })
```

### Structured Logging

**console.log:**
```typescript
console.log(`User ${userId} logged in from ${ip}`)
```

**@sylphx/cat:**
```typescript
logger.info('User login', { userId, ip })
```

### Error Handling

**console.log:**
```typescript
try {
  // ...
} catch (error) {
  console.error('Error:', error.message)
  console.error('Stack:', error.stack)
}
```

**@sylphx/cat:**
```typescript
import { autoSerializeErrors } from '@sylphx/cat'

const logger = createLogger({
  plugins: [autoSerializeErrors()]
})

try {
  // ...
} catch (error) {
  logger.error('Error', { error }) // Includes message, stack, cause
}
```

## API Mapping

### Pino → @sylphx/cat

| Pino | @sylphx/cat | Notes |
|------|-------------|-------|
| `pino()` | `createLogger()` | Basic logger |
| `logger.child()` | `logger.child()` | ✅ Same |
| `logger.level = 'debug'` | `logger.setLevel('debug')` | Method call |
| `pino.stdSerializers.err` | `serializeError()` | Function import |
| `redact: ['password']` | `redactionPlugin({ fields: ['password'] })` | Plugin |
| `transport: { target: 'pino-pretty' }` | `formatter: prettyFormatter()` | Built-in |

### Winston → @sylphx/cat

| Winston | @sylphx/cat | Notes |
|---------|-------------|-------|
| `winston.createLogger()` | `createLogger()` | Similar API |
| `new winston.transports.Console()` | `consoleTransport()` | Function call |
| `new winston.transports.File()` | `fileTransport()` | Function call |
| `winston.format.json()` | `jsonFormatter()` | Built-in |
| `winston.format.combine()` | Custom formatter | Implement `Formatter` |
| `logger.child()` | `logger.child()` | ✅ Same |

## Feature Comparison

| Feature | Pino | Winston | @sylphx/cat |
|---------|------|---------|-------------|
| Child loggers | ✅ | ✅ | ✅ |
| Custom transports | ✅ | ✅ | ✅ |
| Redaction | ✅ | ❌ | ✅ |
| Pretty printing | Via package | Via format | Built-in |
| OpenTelemetry | Partial | ❌ | ✅ Full |
| W3C Trace Context | ❌ | ❌ | ✅ |
| Tail-based sampling | ❌ | ❌ | ✅ |
| Universal runtime | ❌ | ❌ | ✅ |
| Bundle size | 11 KB | 80 KB | 8.93 KB |

## Migration Checklist

### 1. Install @sylphx/cat

```bash
npm install @sylphx/cat
npm uninstall pino # or winston
```

### 2. Update Imports

```typescript
// Before
import pino from 'pino'

// After
import { createLogger } from '@sylphx/cat'
```

### 3. Convert Logger Creation

```typescript
// Before (Pino)
const logger = pino({ level: 'info' })

// After
const logger = createLogger({ level: 'info' })
```

### 4. Update Transports

```typescript
// Before (Winston)
transports: [
  new winston.transports.Console(),
  new winston.transports.File({ filename: 'app.log' })
]

// After
transports: [
  consoleTransport(),
  fileTransport({ path: 'app.log' })
]
```

### 5. Convert Serializers to Plugins

```typescript
// Before (Pino)
serializers: {
  err: pino.stdSerializers.err
}

// After
plugins: [autoSerializeErrors()]
```

### 6. Update Redaction

```typescript
// Before (Pino)
redact: ['password', 'token']

// After
plugins: [
  redactionPlugin({
    fields: ['password', 'token']
  })
]
```

### 7. Test Thoroughly

```typescript
// Verify log output
logger.info('Test', { key: 'value' })

// Verify child loggers
const child = logger.child({ requestId: '123' })
child.info('Test')

// Verify error serialization
logger.error('Error', { error: new Error('Test') })
```

## Breaking Changes

### None (Mostly Compatible)

@sylphx/cat is designed for easy migration with minimal breaking changes:

- ✅ Child logger API is identical
- ✅ Log level methods are identical (`info`, `error`, etc.)
- ✅ Structured logging works the same way

### Minor Differences

1. **Formatter instead of format**
   ```typescript
   // Pino: format
   // @sylphx/cat: formatter
   ```

2. **Plugins instead of serializers**
   ```typescript
   // Pino: serializers
   // @sylphx/cat: plugins
   ```

3. **Function calls instead of classes**
   ```typescript
   // Winston: new winston.transports.Console()
   // @sylphx/cat: consoleTransport()
   ```

## See Also

- [Getting Started](/guide/getting-started) - Quick start
- [API Reference](/api/) - Complete API
- [Examples](/examples/) - Real-world examples
