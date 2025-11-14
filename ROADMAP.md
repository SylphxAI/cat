# 🗺️ @sylphx/cat Roadmap

## Current Status: v0.1.0

✅ **Core Features Complete**
- Fast-path level filtering (21M ops/sec)
- Multiple formatters (JSON, Pretty)
- Multiple transports (Console, File, Stream)
- Plugin system (Context, Sampling)
- Child loggers with context
- Batch mode for high throughput
- 97%+ test coverage
- Comprehensive benchmarks

## Missing Features (vs Competitors)

Based on comparison with Pino, Winston, and Bunyan:

---

## 🔥 High Priority Features

### 1. **Error Serialization**
**Status**: Missing
**Priority**: High
**Effort**: Medium

Automatically serialize Error objects with stack traces:

```typescript
logger.error('Request failed', new Error('Connection timeout'))
// Output:
{
  level: 'error',
  msg: 'Request failed',
  error: {
    type: 'Error',
    message: 'Connection timeout',
    stack: 'Error: Connection timeout\n    at...'
  }
}
```

**Implementation**:
- Add `ErrorSerializer` class
- Auto-detect Error objects in data
- Include: name, message, stack, cause
- Option to include custom error properties

**Files to add**:
- `src/serializers/error.ts`
- `tests/serializers.test.ts`

---

### 2. **Custom Serializers**
**Status**: Missing
**Priority**: High
**Effort**: Medium-High

Allow custom serializers for specific keys:

```typescript
const logger = createLogger({
  serializers: {
    err: errorSerializer,
    req: requestSerializer,
    res: responseSerializer,
    user: (user) => ({ id: user.id, name: user.name })
  }
})

logger.info('Request processed', {
  req: request,
  res: response,
  user: currentUser
})
```

**Implementation**:
- Add `serializers` option to LoggerOptions
- Apply serializers before formatting
- Built-in serializers: error, request, response
- Support custom serializer functions

**Files to add**:
- `src/serializers/index.ts`
- `src/serializers/error.ts`
- `src/serializers/request.ts`
- `src/serializers/response.ts`

---

### 3. **Built-in Redaction**
**Status**: Plugin example exists, not built-in
**Priority**: High
**Effort**: Medium

Automatically redact sensitive data:

```typescript
const logger = createLogger({
  redact: ['password', 'creditCard', '*.ssn', 'auth.token']
})

logger.info('User login', {
  password: 'secret123',
  creditCard: '4111111111111111',
  user: { ssn: '123-45-6789' }
})
// Output: password: '[REDACTED]', creditCard: '[REDACTED]', user.ssn: '[REDACTED]'
```

**Implementation**:
- Support glob patterns for path matching
- Support custom redaction string
- Option to censor vs remove fields
- Built-in common patterns

**Files to add**:
- `src/plugins/redaction.ts`
- Update docs to promote as core feature

---

### 4. **Caller Information**
**Status**: Missing
**Priority**: Medium-High
**Effort**: High (performance sensitive)

Optionally include caller location:

```typescript
const logger = createLogger({
  caller: true // or { depth: 2 }
})

logger.info('Hello')
// Output: { ..., caller: 'index.ts:42' }
```

**Implementation**:
- Use `Error.captureStackTrace`
- Parse stack to extract file:line
- Make it opt-in (performance cost)
- Cache parsed stack frames

**Challenge**: Balance accuracy with performance

---

## 🎯 Medium Priority Features

### 5. **Log Rotation**
**Status**: Missing
**Priority**: Medium
**Effort**: High

Built-in log rotation for FileTransport:

```typescript
const logger = createLogger({
  transports: [
    fileTransport({
      path: './logs/app.log',
      rotation: {
        maxSize: '10M',
        maxAge: '7d',
        maxFiles: 10
      }
    })
  ]
})
```

**Implementation**:
- Size-based rotation
- Time-based rotation
- Compression of old logs
- Automatic cleanup

**Alternative**: Document how to use `rotating-file-stream` or similar

---

### 6. **HTTP Transport**
**Status**: Missing
**Priority**: Medium
**Effort**: Medium

Send logs to remote endpoints:

```typescript
const logger = createLogger({
  transports: [
    httpTransport({
      url: 'https://logs.example.com/ingest',
      headers: { 'X-API-Key': 'secret' },
      batch: true,
      batchSize: 100
    })
  ]
})
```

**Implementation**:
- Use `fetch` API (universal)
- Support batching
- Retry logic with backoff
- Buffer when offline

**Files to add**:
- `src/transports/http.ts`

---

### 7. **Levels Per Transport**
**Status**: Missing
**Priority**: Medium
**Effort**: Low

Different log levels for each transport:

```typescript
const logger = createLogger({
  level: 'trace', // Global minimum
  transports: [
    { transport: consoleTransport(), level: 'info' },
    { transport: fileTransport({ path: 'debug.log' }), level: 'debug' },
    { transport: fileTransport({ path: 'error.log' }), level: 'error' }
  ]
})
```

**Implementation**:
- Wrap transports with level filter
- Check level before calling transport
- Simple decorator pattern

---

### 8. **Lifecycle Hooks**
**Status**: Missing
**Priority**: Medium
**Effort**: Low

Add hooks for lifecycle events:

```typescript
const logger = createLogger({
  hooks: {
    beforeLog: (entry) => {
      // Modify or validate entry
      return entry
    },
    afterLog: (entry) => {
      // Perform side effects
      metrics.increment('logs.total')
    }
  }
})
```

**Implementation**:
- Add hook system to logger
- `beforeLog`, `afterLog`, `onError`
- Async hook support

---

## 💡 Low Priority / Future Enhancements

### 9. **Extreme Mode**
Pino-style extreme mode for maximum performance:
- Write to buffer, flush async
- Skip formatting until flush
- Trade durability for speed

### 10. **Source Maps Support**
When caller info is enabled, map to original TypeScript source

### 11. **Structured Context**
More advanced context binding:
- Async context tracking
- Request ID propagation
- Automatic context inheritance

### 12. **Metrics Integration**
Built-in integration with metrics libraries:
- Increment counters on log levels
- Track log frequency
- Alert on error spikes

### 13. **Browser DevTools**
Enhanced browser console output:
- Collapsible groups
- Custom styling
- Performance marks

### 14. **Syslog Transport**
Send logs to syslog servers

### 15. **CloudWatch/DataDog Transports**
Direct integration with popular log aggregation services

---

## 📊 Implementation Priority Matrix

| Feature | Impact | Effort | Priority | Target Version |
|---------|--------|--------|----------|----------------|
| Error Serialization | High | Medium | P0 | v0.2.0 |
| Custom Serializers | High | Medium-High | P0 | v0.2.0 |
| Built-in Redaction | High | Medium | P0 | v0.2.0 |
| Caller Info | Medium | High | P1 | v0.3.0 |
| Levels Per Transport | Medium | Low | P1 | v0.3.0 |
| Lifecycle Hooks | Medium | Low | P1 | v0.3.0 |
| HTTP Transport | Medium | Medium | P1 | v0.3.0 |
| Log Rotation | Low | High | P2 | v0.4.0+ |
| Extreme Mode | Low | High | P2 | v0.4.0+ |

---

## 🎯 v0.2.0 Goals (Next Release)

**Focus**: Feature Parity with Pino's Core

1. ✅ Error Serialization
2. ✅ Custom Serializers (error, req, res)
3. ✅ Built-in Redaction
4. 📚 Enhanced Documentation
5. 🧪 Additional Tests
6. 📊 More Benchmarks

**Target**: 2-3 weeks

**Breaking Changes**: None (additive only)

---

## 🎯 v0.3.0 Goals

**Focus**: Advanced Features

1. ✅ Caller Information
2. ✅ Levels Per Transport
3. ✅ Lifecycle Hooks
4. ✅ HTTP Transport

**Target**: 1-2 months

---

## 🎯 Long-term Vision

Make **@sylphx/cat** the **go-to logger** for:

- ⚡ **Performance-critical applications**
- 🪶 **Serverless & edge computing**
- 🌍 **Universal JavaScript apps**
- 🔒 **Security-conscious projects** (zero deps)
- 📦 **Bundle-size sensitive apps**

While maintaining:
- Zero breaking changes (semantic versioning)
- <5KB gzipped core
- 100% test coverage
- Best-in-class performance

---

## 🤝 Contributing

Want to help implement these features? Check our [CONTRIBUTING.md](./CONTRIBUTING.md)!

Priority contributions:
1. Error serialization
2. Custom serializers
3. Redaction plugin improvements
4. Additional transports

---

*Last updated: 2024-11-14*
