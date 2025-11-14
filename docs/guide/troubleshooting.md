# Troubleshooting

Common issues and solutions when using @sylphx/cat.

## Logs Not Appearing

### Check Log Level

```typescript
const logger = createLogger({ level: 'info' })

logger.debug('This will not appear') // Below 'info' level
logger.info('This will appear') // At 'info' level
```

**Solution:** Lower the log level or use appropriate level for logs

```typescript
logger.setLevel('debug') // Enable debug logs
```

### Check Transports

```typescript
// ❌ No transports - logs go nowhere
const logger = createLogger({
  transports: []
})

// ✅ Add console transport
const logger = createLogger({
  transports: [consoleTransport()]
})
```

### Verify Formatter

```typescript
// Custom formatter might have bugs
class BrokenFormatter implements Formatter {
  format(entry: LogEntry): string {
    return undefined! // ❌ Returns undefined
  }
}

// ✅ Always return a string
class WorkingFormatter implements Formatter {
  format(entry: LogEntry): string {
    return JSON.stringify(entry)
  }
}
```

## OTLP Transport Issues

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:4318
```

**Cause:** OTLP endpoint is not running

**Solution:**
1. Start OpenTelemetry Collector:
   ```bash
   docker run -p 4318:4318 otel/opentelemetry-collector
   ```
2. Verify endpoint URL:
   ```typescript
   endpoint: 'http://localhost:4318/v1/logs' // Correct
   endpoint: 'http://localhost:4318' // ❌ Missing /v1/logs
   ```

### Authentication Errors

```
Error: 401 Unauthorized
```

**Solution:** Check headers:
```typescript
otlpTransport({
  endpoint: 'https://otlp.example.com/v1/logs',
  headers: {
    Authorization: `Bearer ${process.env.OTLP_TOKEN}` // ✅ Correct
    // Authorization: 'Bearer undefined' // ❌ Missing env var
  }
})
```

### Timeout Errors

```
Error: Request timeout
```

**Solution:** Increase timeout or reduce batch size:
```typescript
otlpTransport({
  timeout: 10000, // 10 seconds
  batchSize: 50 // Smaller batches
})
```

## Performance Issues

### High CPU Usage

**Cause:** Too many logs or expensive operations

**Solution:**
1. Increase log level:
   ```typescript
   logger.setLevel('info') // Filter debug logs
   ```

2. Use sampling:
   ```typescript
   plugins: [
     tailSamplingPlugin({ sampleRate: 0.1 }) // 10%
   ]
   ```

3. Avoid expensive computations:
   ```typescript
   // ❌ Bad
   logger.debug('Users: ' + JSON.stringify(allUsers))

   // ✅ Good
   if (logger.isLevelEnabled('debug')) {
     logger.debug('Users: ' + JSON.stringify(allUsers))
   }
   ```

### High Memory Usage

**Cause:** Large batches or tail-sampling buffers

**Solution:**
1. Reduce batch size:
   ```typescript
   batchSize: 50 // Instead of 1000
   ```

2. Limit tail-sampling buffer:
   ```typescript
   tailSamplingPlugin({
     maxBufferSize: 500, // Instead of 10000
     maxTraceDuration: 30000 // Flush after 30s
   }),

   ```

### Slow Logging

**Cause:** Synchronous I/O or slow transports

**Solution:**
1. Use async transports:
   ```typescript
   class AsyncTransport implements Transport {
     async log(entry, formatted) {
       await fetch('/logs', { body: formatted }) // Async
     }
   }
   ```

2. Enable batching:
   ```typescript
   batch: true,
   batchSize: 100
   ```

## Redaction Not Working

### Fields Not Redacted

**Cause:** Field path doesn't match

```typescript
// ❌ Won't match nested fields
fields: ['password']

logger.info('User', {
  user: {
    password: 'secret' // Not redacted
  }
})

// ✅ Use glob patterns
fields: ['password', '*.password', '**.password']
```

### PII Still Visible

**Cause:** PII detection not enabled

```typescript
// ❌ Not enabled
redactionPlugin({
  fields: ['password']
})

// ✅ Enable PII detection
redactionPlugin({
  fields: ['password'],
  redactPII: true,
  piiPatterns: ['creditCard', 'ssn', 'email']
})
```

## Trace Context Not Working

### Missing traceId

**Cause:** Tracing plugin not installed

```typescript
// ❌ No tracing plugin
const logger = createLogger({})

// ✅ Add tracing plugin
const logger = createLogger({
  plugins: [tracingPlugin()]
})
```

### Broken Trace Chain

**Cause:** Not propagating trace context between services

```typescript
// ❌ Service B doesn't receive trace context
await fetch('http://service-b/api')

// ✅ Propagate trace context
const headers = tracingPlugin.toHeaders(traceContext)
await fetch('http://service-b/api', { headers })
```

## TypeScript Errors

### Type Inference Issues

```typescript
// ❌ Type error
const data: any = { userId: 123 }
logger.info('User', data)

// ✅ Proper types
const data: Record<string, unknown> = { userId: 123 }
logger.info('User', data)
```

### Plugin Type Errors

```typescript
// ❌ Incorrect Plugin type
const plugin = {
  name: 'test',
  onLog: (entry) => entry // Missing return type
}

// ✅ Correct Plugin type
import type { Plugin, LogEntry } from '@sylphx/cat'

const plugin: Plugin = {
  name: 'test',
  onLog(entry: LogEntry): LogEntry {
    return entry
  }
}
```

## Runtime Issues

### Module Not Found

```
Error: Cannot find module '@sylphx/cat'
```

**Solution:**
```bash
npm install @sylphx/cat
# or
bun add @sylphx/cat
```

### ESM vs CommonJS

**ESM:**
```typescript
import { createLogger } from '@sylphx/cat'
```

**CommonJS:**
```typescript
const { createLogger } = require('@sylphx/cat')
```

### Circular Dependencies

**Cause:** Logger imported in too many places

**Solution:** Create a single logger instance:
```typescript
// logger.ts
import { createLogger } from '@sylphx/cat'

export const logger = createLogger({
  // config
})

// Other files
import { logger } from './logger'
```

## Testing Issues

### Logs Not Captured

**Cause:** Using real transports in tests

**Solution:** Use memory transport:
```typescript
class MemoryTransport implements Transport {
  logs: LogEntry[] = []

  async log(entry: LogEntry): Promise<void> {
    this.logs.push(entry)
  }
}

const transport = new MemoryTransport()
const logger = createLogger({ transports: [transport] })

// Test
logger.info('Test')
expect(transport.logs).toHaveLength(1)
```

### Async Logs Not Flushed

**Cause:** Not awaiting flush

**Solution:**
```typescript
logger.info('Test')
await logger.flush() // ✅ Wait for flush
expect(transport.logs).toHaveLength(1)
```

## Getting Help

### Check Documentation

- [API Reference](/api/)
- [Examples](/examples/)
- [Best Practices](/guide/best-practices)

### Enable Debug Mode

```typescript
const logger = createLogger({
  level: 'trace' // Most verbose
})
```

### Create Minimal Reproduction

```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger()
logger.info('Test') // Does this work?
```

### Report Issues

GitHub: https://github.com/SylphxAI/cat/issues

Include:
- @sylphx/cat version
- Node.js/Bun/Deno version
- Minimal reproduction code
- Error message and stack trace

## See Also

- [API Reference](/api/) - Complete API
- [Best Practices](/guide/best-practices) - Production patterns
- [Examples](/examples/) - Real-world examples
