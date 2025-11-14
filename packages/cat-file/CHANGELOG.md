# @sylphx/cat-file

## 0.1.0

### Minor Changes

- 4784665: # v0.1.0 - Initial Release

  First public release of @sylphx/cat logger ecosystem! 🎉

  ## 📦 Core Package (@sylphx/cat - 1.97 KB)

  **The fastest, lightest logger for JavaScript**

  - ⚡ Ultra-fast logger engine (25M+ ops/sec)
  - 🪶 Ultra-lightweight (1.97 KB gzipped)
  - 🔧 Full TypeScript support
  - 🌍 Universal runtime support (Bun, Node.js, Deno, browsers)
  - 🎯 Zero dependencies
  - 📦 Tree-shakeable
  - ⚠️ Automatic error serialization
  - 🔌 Plugin system
  - 🎨 Custom formatters and transports

  ## 🎨 Development Tools

  ### @sylphx/cat-pretty (0.81 KB)

  - Colorized, human-readable formatter
  - Timestamp formatting
  - Development-friendly output

  ### @sylphx/cat-file (1.14 KB)

  - File transport for production logging
  - Stream transport for custom outputs
  - Graceful shutdown support

  ## 🌐 HTTP & API Support

  ### @sylphx/cat-http (0.75 KB)

  - Request/Response serializers
  - Automatic sensitive header redaction
  - Express, Fastify, Koa, Next.js support

  ## 📊 Observability

  ### @sylphx/cat-otlp (1.64 KB)

  - OpenTelemetry Protocol (OTLP) HTTP/JSON export
  - Compatible with Grafana, Datadog, New Relic, Honeycomb, AWS CloudWatch
  - Automatic batching with exponential backoff retry
  - Compression support

  ### @sylphx/cat-tracing (1.46 KB)

  - Full W3C Trace Context specification
  - Distributed tracing support
  - TraceId and SpanId generation
  - HTTP header propagation
  - Parent-child span relationships

  ## 🔒 Security & Compliance

  ### @sylphx/cat-redaction (1.49 KB)

  - OWASP 2024-compliant redaction
  - Field-based redaction with glob patterns
  - Built-in PII detection (credit cards, SSNs, emails, phone numbers, IPs)
  - Log injection prevention
  - Custom regex pattern support

  ## 💰 Cost Optimization

  ### @sylphx/cat-tail-sampling (1.82 KB)

  - Tail-based sampling (decides after trace completion)
  - 40-90% cost reduction
  - 100% error and slow request coverage
  - Rule-based sampling engine
  - Adaptive budget control
  - Multi-tier sampling support

  ## 📊 Size Comparison

  | Setup                    | Bundle Size                     |
  | ------------------------ | ------------------------------- |
  | Core only                | 1.97 KB (82% smaller than Pino) |
  | Core + Pretty            | 2.78 KB                         |
  | Core + File + HTTP       | 3.86 KB                         |
  | Full observability stack | 11.08 KB                        |

  **vs Competitors:**

  - Pino core: 11 KB
  - Winston: 28 KB

  ## 🎯 Standards Compliance

  - ✅ OpenTelemetry OTLP 1.0+
  - ✅ W3C Trace Context Specification
  - ✅ OWASP Top 10 2024

  ## 🌍 Runtime Support

  - Bun 1.0+
  - Node.js 18+
  - Deno 1.37+
  - Modern browsers
  - Edge runtimes (Cloudflare Workers, Vercel Edge)

  ## 📚 Documentation

  Complete documentation available at https://cat.sylphx.com

  - Getting Started Guide
  - API Reference for all packages
  - Real-world examples
  - Migration guides

  ## 🔗 Monorepo Structure

  All packages published as separate npm packages:

  - Install only what you need
  - Granular versioning
  - Smaller bundle sizes
  - Clear dependencies
