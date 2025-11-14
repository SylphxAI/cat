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

## 🎯 v0.2.0 Goals (Next Release) - 4 weeks

**Focus**: Foundational Excellence

Based on comprehensive 2024-2025 research (see [RESEARCH_2025.md](./RESEARCH_2025.md))

### Core Features
1. ✅ **Error Serialization** - Automatic Error object formatting with cause chains
2. ✅ **Custom Serializers** - Registry for error, req, res, user-defined
3. ✅ **W3C Trace Context** - traceId, spanId for distributed tracing
4. ✅ **OTLP Export** - OpenTelemetry Protocol transport
5. ✅ **Enhanced Redaction** - OWASP-compliant, regex patterns, log injection prevention
6. ✅ **Tail-Based Sampling** - Adaptive, budget-aware sampling

### Size & Performance
- **Bundle**: ~6 KB gzipped (still 2x smaller than Pino)
- **Performance**: 25M+ ops/sec filtered logs
- **Standards**: OpenTelemetry, W3C, OWASP 2024

**Breaking Changes**: None (additive only)

---

## 🎯 v0.3.0 Goals - 8 weeks

**Focus**: Advanced Features

### New Capabilities
1. ✅ **Compression** - LZ4, zstd, gzip support
2. ✅ **Binary Serialization** - MessagePack/Protobuf for efficiency
3. ✅ **HTTP Transport** - Batching, retries, compression
4. ✅ **Caller Info** - Opt-in call site tracking
5. ✅ **Levels Per Transport** - Different levels for each output
6. ✅ **Lifecycle Hooks** - beforeLog, afterLog, onError

### Size & Performance
- **Bundle**: ~8 KB gzipped
- **Performance**: 30M+ ops/sec filtered logs
- **Compression**: 15x smaller logs with zstd

---

## 🎯 v0.4.0 Goals - 12 weeks

**Focus**: Monster Features

### Advanced Integration
1. ✅ **ML Hooks** - Integration with anomaly detection services
2. ✅ **Stream Processing** - Flink, ClickHouse adapters
3. ✅ **Log Aggregation** - Loki, VictoriaLogs integration
4. ✅ **Security Hardening** - Input validation, size limits, key filtering
5. ✅ **Carbon Tracking** - Energy efficiency metrics
6. ✅ **Auto-Correlation** - Automatic trace-log correlation

### Size & Performance
- **Bundle**: ~10 KB gzipped (modular, tree-shakeable)
- **Performance**: 40M+ ops/sec filtered logs
- **Memory**: <50 MB per 1M logs

---

## 🎯 v1.0.0 Goals - 16 weeks

**Focus**: Production Hardened - World's Best Logger

### Enterprise Features
1. ✅ **WASM Build** - Rust-based, 50M+ ops/sec, <100 KB bundle
2. ✅ **eBPF Support** - Kernel-level tracing integration
3. ✅ **Full OpenTelemetry SDK** - Complete OTLP, metrics, profiling
4. ✅ **Audit Logging** - Immutable logs, digital signatures, compliance
5. ✅ **100% Quality** - Test coverage, security audit, chaos engineering

### Performance Targets
- **Filtered Logs**: 50M+ ops/sec (fastest in the world)
- **Basic Logging**: 12M ops/sec
- **Bundle**: 5 KB core, <15 KB full
- **Memory**: <30 MB per 1M logs
- **CPU Overhead**: <1%

### Standards Compliance
- ✅ OpenTelemetry 1.5.0+
- ✅ W3C Trace Context
- ✅ OWASP 2024
- ✅ ISO/IEC 21031:2024 (SCI)

---

## 🎯 Long-term Vision

Make **@sylphx/cat** the **world's best logger** for:

### Performance
- ⚡ **Fastest**: 50M+ ops/sec (3x faster than Pino)
- 🪶 **Lightest**: <5 KB core (2x smaller than Pino)
- 🚀 **Efficient**: <1% CPU overhead, minimal memory

### Universal Support
- 🌍 **Runtimes**: Node.js, Bun, Deno, Browsers, Cloudflare Workers, Edge
- 📦 **Frameworks**: Express, Next.js, Remix, Astro, SvelteKit
- ☁️ **Platforms**: AWS, GCP, Azure, Vercel, Cloudflare, Deno Deploy

### Advanced Features
- 📊 **OpenTelemetry**: Full OTLP, distributed tracing, profiling
- 🧠 **ML-Ready**: Anomaly detection, log analysis hooks
- 🔒 **Security**: OWASP-compliant, zero deps, audit logging
- 🌱 **Green**: Energy efficient, carbon tracking

### Quality
- ✅ **Zero Breaking Changes**: Semantic versioning
- ✅ **100% Test Coverage**: Unit, integration, chaos tests
- ✅ **Best-in-Class DX**: Simple API, great docs, TypeScript-first
- ✅ **Enterprise Ready**: SOC2, HIPAA, GDPR compliance

---

## 📊 Competitive Position (After v1.0.0)

| Metric | @sylphx/cat | Pino | Winston | Target |
|--------|-------------|------|---------|--------|
| **Performance** | 50M ops/s | 15M ops/s | 5M ops/s | **Fastest** ✅ |
| **Bundle Size** | 5 KB | 11 KB | 80 KB | **Smallest** ✅ |
| **Features** | 100% | 95% | 100% | **Complete** ✅ |
| **Runtimes** | Universal | Node only | Node only | **Universal** ✅ |
| **Dependencies** | 0 | Several | Many | **Zero** ✅ |
| **Standards** | OTel, W3C, OWASP | Partial | Partial | **Full** ✅ |

---

## 📅 Timeline

| Phase | Duration | Version | Size | Performance | Completion |
|-------|----------|---------|------|-------------|------------|
| 1 | 4 weeks | v0.2.0 | 6 KB | 25M ops/s | TBD |
| 2 | 8 weeks | v0.3.0 | 8 KB | 30M ops/s | TBD |
| 3 | 12 weeks | v0.4.0 | 10 KB | 40M ops/s | TBD |
| 4 | 16 weeks | v1.0.0 | 5 KB core | 50M ops/s | TBD |
| **Total** | **40 weeks** | **~10 months** | **Modular** | **Fastest** | **2025-11-15** |

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed technical specifications.

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
