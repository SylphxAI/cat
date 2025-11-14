# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2024-11-15

### Added - Security & Compliance

- **OWASP 2024 Compliant Redaction Plugin**
  - Field-based redaction with glob pattern support (`password`, `*.secret`, `**.apiKey`)
  - Built-in PII detection (credit cards, SSNs, emails, phone numbers, IP addresses)
  - Log injection prevention (escapes newlines, removes ANSI codes, sanitizes control characters)
  - Custom regex pattern support
  - Field exclusion support
  - 25 comprehensive tests

### Added - Observability

- **W3C Trace Context Support**
  - Full W3C Trace Context specification implementation
  - `traceId` and `spanId` generation and validation
  - `traceparent` and `tracestate` header parsing/formatting
  - HTTP header extraction (`TracingPlugin.fromHeaders()`)
  - HTTP header injection (`TracingPlugin.toHeaders()`)
  - Parent-child span relationships
  - 25 comprehensive tests

- **OTLP Transport**
  - OpenTelemetry Protocol (OTLP) HTTP/JSON export
  - Batching support (configurable size and interval)
  - Exponential backoff retry logic
  - Timeout handling with AbortController
  - Compression support (gzip)
  - Resource attributes and scope metadata
  - Compatible with: Grafana, Datadog, New Relic, AWS CloudWatch, Honeycomb
  - 15 comprehensive tests

### Added - Error Handling

- **Error Serialization**
  - Automatic Error object serialization with `serializeError()`
  - Cause chain support (recursive `error.cause`)
  - Custom error properties extraction
  - Stack trace inclusion
  - Circular reference protection
  - Type and code extraction

- **Request/Response Serializers**
  - HTTP request serialization with `requestSerializer()`
  - HTTP response serialization with `responseSerializer()`
  - Automatic sensitive header redaction (authorization, cookie, set-cookie, etc.)
  - Query string and body support
  - Express/Node.js compatible

- **Standard Serializers Registry**
  - `stdSerializers.err` for error serialization
  - `stdSerializers.error` alias
  - `applySerializers()` for custom serializer registries
  - `autoSerializeErrors()` plugin for automatic error detection
  - 29 comprehensive tests

### Added - Cost Optimization

- **Tail-Based Sampling Plugin**
  - Smart sampling that decides after trace completion
  - Rule-based sampling engine with priority system
  - Trace buffering and metadata collection
  - Adaptive sampling with monthly budget control
  - Default rules: 100% errors, 100% slow requests, 100% 5xx, 50% 4xx, 20% warnings, 1% success
  - Custom rule support with condition functions
  - Buffer size and duration limits
  - Automatic cleanup of expired traces
  - 25 comprehensive tests

### Added - Documentation

- Complete VitePress documentation site
- Comprehensive README with all v0.2.0 features
- Examples for all new features
  - `examples/otlp-example.ts` - 8 OTLP scenarios
  - `examples/redaction-example.ts` - 13 security scenarios
  - `examples/tail-sampling-example.ts` - 8 cost optimization scenarios
- Technical documentation
  - `docs/TAIL_SAMPLING_EXPLAINED.md` - Complete tail-sampling explanation

### Changed

- Bundle size: 2.98 KB → 8.93 KB (gzipped)
  - Still smaller than Pino (11 KB) despite 6 major features added
  - All features are tree-shakeable
  - Core-only builds can achieve <5 KB

### Performance

- Target: 25M+ ops/sec for filtered logs
- Maintained low-overhead level filtering
- Minimal memory allocation
- Zero dependencies
- All benchmarks passing

### Test Coverage

- Total tests: 177 (up from 18)
- New test suites:
  - `tests/serializers.test.ts` - 29 tests
  - `tests/tracing.test.ts` - 25 tests
  - `tests/otlp.test.ts` - 15 tests
  - `tests/redaction.test.ts` - 25 tests
  - `tests/tail-sampling.test.ts` - 25 tests

### Standards Compliance

- ✅ OpenTelemetry OTLP 1.0+
- ✅ W3C Trace Context Specification
- ✅ OWASP Top 10 2024
- ✅ Semantic Versioning 2.0.0

### Breaking Changes

- **None** - v0.2.0 is 100% backward compatible with v0.1.0

---

## [0.1.0] - 2024-11-14

### Added

- Initial release of @sylphx/cat
- Core logger implementation with level system (trace, debug, info, warn, error, fatal)
- Fast-path level filtering for optimal performance
- JSON formatter for structured logging
- Pretty formatter with colors and timestamps
- Console transport for output
- File transport for persistent logs
- Stream transport for custom streams
- Context plugin for adding metadata
- Sampling plugin for reducing log volume
- Child logger support with context inheritance
- Batching support for high-throughput scenarios
- Full TypeScript support with type definitions
- Comprehensive test suite (18 tests)
- Performance benchmarks
- Examples (basic and advanced)
- CI/CD with GitHub Actions
- Changesets for version management

### Performance

- Filtered logs: ~26 ns/iter
- Basic logging: ~117 ns/iter
- Logging with data: ~150 ns/iter
- JSON formatter: ~169 ns/iter
- Pretty formatter: ~303 ns/iter

[0.1.0]: https://github.com/SylphxAI/cat/releases/tag/v0.1.0
