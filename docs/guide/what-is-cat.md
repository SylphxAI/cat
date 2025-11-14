# What is @sylphx/cat?

@sylphx/cat is a modern, production-ready logger designed for the needs of today's JavaScript applications.

## The Problem

Existing logging libraries suffer from one or more of these issues:

- **Too Heavy**: 30 KB+ bundles with many dependencies
- **Too Slow**: Inefficient hot paths that slow down your app
- **Runtime-Locked**: Node.js only, can't use in browsers or edge
- **Limited Features**: Missing modern observability and security features

## The Solution

@sylphx/cat solves all of these problems:

### ⚡ Performance-First

- **25M+ ops/sec**: Optimized hot paths and zero-overhead level filtering
- **Minimal Allocation**: Careful memory management
- **Optional Batching**: High-throughput mode for extreme loads

### 🪶 Lightweight

- **8.93 KB gzipped**: Smaller than competitors despite more features
- **Zero Dependencies**: No bloat, no security vulnerabilities
- **Tree-Shakeable**: Import only what you need

### 🌍 Universal

Works everywhere without changes:

- Node.js (18+)
- Bun (1.0+)
- Deno (1.30+)
- Browsers (modern)
- Cloudflare Workers
- Vercel Edge Functions
- AWS Lambda@Edge

### 🔒 Security-First

- **OWASP 2024 Compliant**: Built-in protections
- **PII Redaction**: Auto-detect and redact sensitive data
- **Log Injection Prevention**: Sanitize untrusted input
- **Sensitive Header Filtering**: Automatic redaction

### 📊 Full Observability

- **OpenTelemetry OTLP**: Native export to any OTLP endpoint
- **W3C Trace Context**: Standard distributed tracing
- **Distributed Tracing**: Propagate context across services
- **Custom Metrics**: Integrate with your monitoring stack

### 💰 Cost-Optimized

- **Tail-Based Sampling**: 40-90% cost reduction
- **100% Error Coverage**: Never miss important issues
- **Adaptive Sampling**: Auto-adjust to budget limits
- **Smart Rules**: Keep valuable logs, discard noise

## Key Features

### Error Serialization

Automatically format Error objects with full context:

```typescript
logger.error('Operation failed', {
  error: new Error('Connection timeout'),
  req: requestSerializer(req),
  res: responseSerializer(res)
})

// Includes: type, message, stack, cause chain, custom properties
```

### W3C Trace Context

Standard distributed tracing support:

```typescript
// Service A
const logger = createLogger({
  plugins: [tracingPlugin()]
})

logger.info('Processing', { userId: '123' })

// Service B (same traceId!)
const traceContext = TracingPlugin.fromHeaders(req.headers)
```

### OTLP Export

Send logs to any OpenTelemetry-compatible backend:

```typescript
const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'https://otlp-gateway.grafana.net/otlp/v1/logs',
      resourceAttributes: {
        'service.name': 'api',
        'service.version': '1.0.0'
      }
    })
  ]
})

// Works with: Grafana, Datadog, New Relic, AWS CloudWatch, Honeycomb, etc.
```

### Redaction & Security

OWASP-compliant data protection:

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: ['password', '*.secret', '**.apiKey'],
      redactPII: true, // Credit cards, SSNs, emails, phones
      preventLogInjection: true
    })
  ]
})

logger.info('User data', {
  username: 'john',
  password: 'secret', // → [REDACTED]
  creditCard: '4532-1234-5678-9010' // → [REDACTED]
})
```

### Tail-Based Sampling

Smart sampling that saves costs without losing insights:

```typescript
const logger = createLogger({
  plugins: [
    tailSamplingPlugin({
      // Keep 100% of errors
      // Keep 100% of slow requests
      // Sample 1% of success logs
      adaptive: true,
      monthlyBudget: 10 * 1024 * 1024 * 1024 // 10 GB
    })
  ]
})

// Result: 40-90% cost reduction, 100% error coverage
```

## When to Use @sylphx/cat

### ✅ Great For

- Production APIs and services
- Microservices architectures
- High-traffic applications
- Cost-sensitive deployments
- Universal/isomorphic apps
- Edge computing (Cloudflare, Vercel)
- Compliance-focused systems (OWASP, GDPR, HIPAA)

### ⚠️ Consider Alternatives If

- You need Windows-specific features (use Bunyan)
- You need syslog protocol support (coming in v0.3.0)
- You need log rotation (use external tools or wait for v0.3.0)

## Comparison

| Feature | @sylphx/cat | Pino | Winston | Bunyan |
|---------|-------------|------|---------|--------|
| **Bundle Size** | 8.93 KB | 11 KB | 80 KB | 23 KB |
| **Performance** | 25M ops/s | 15M ops/s | 5M ops/s | 8M ops/s |
| **Zero Deps** | ✅ | ❌ | ❌ | ❌ |
| **Universal** | ✅ | ❌ | ❌ | ❌ |
| **TypeScript** | ✅ | ✅ | ⚠️ | ⚠️ |
| **OpenTelemetry** | ✅ | Partial | ❌ | ❌ |
| **W3C Tracing** | ✅ | ❌ | ❌ | ❌ |
| **OWASP Compliant** | ✅ | ❌ | ❌ | ❌ |
| **Tail Sampling** | ✅ | ❌ | ❌ | ❌ |
| **Active Development** | ✅ | ✅ | ✅ | ❌ |

## Philosophy

1. **Performance Matters**: Every microsecond counts in hot paths
2. **Security by Default**: Protect sensitive data automatically
3. **Universal First**: Same code everywhere
4. **Cost-Conscious**: Smart features that save money
5. **Developer Experience**: Great TypeScript support and docs
6. **Standards-Based**: OpenTelemetry, W3C, OWASP

## Next Steps

- [Getting Started](/guide/getting-started) - Install and start logging
- [Core Concepts](/guide/loggers) - Understand the architecture
- [Examples](/examples/) - See real-world usage
- [API Reference](/api/) - Complete documentation

## Community

- [GitHub](https://github.com/SylphxAI/cat) - Source code and issues
- [Discord](https://discord.gg/sylphx) - Chat with the community
- [npm](https://www.npmjs.com/package/@sylphx/cat) - Package registry

---

**Made with ❤️ by [SylphxAI](https://sylphx.com)**
