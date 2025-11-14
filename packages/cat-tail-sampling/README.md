# @sylphx/cat-tail-sampling

> Tail-based sampling plugin for @sylphx/cat logger

[![npm version](https://img.shields.io/npm/v/@sylphx/cat-tail-sampling.svg)](https://www.npmjs.com/package/@sylphx/cat-tail-sampling)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**1.82 KB** • **40-90% cost reduction** • **100% error coverage** • **Adaptive budgeting**

## Installation

```bash
npm install @sylphx/cat @sylphx/cat-tracing @sylphx/cat-tail-sampling
```

Note: Requires [@sylphx/cat-tracing](../cat-tracing) for trace ID support.

## Description

Intelligent sampling that makes decisions AFTER trace completion based on full context. Keep 100% of errors while sampling routine logs, reducing observability costs by 40-90% without losing critical data. Features rule-based sampling, adaptive budget control, and session-based buffering.

Perfect for high-volume production systems where every error matters but routine logs can be sampled.

## Usage Examples

### Basic Tail Sampling

```typescript
import { createLogger } from '@sylphx/cat'
import { tracingPlugin } from '@sylphx/cat-tracing'
import { tailSamplingPlugin } from '@sylphx/cat-tail-sampling'

const logger = createLogger({
  plugins: [
    tracingPlugin(),
    tailSamplingPlugin({
      rules: [
        {
          name: 'Keep all errors',
          condition: (trace) => trace.metadata.hasError,
          sampleRate: 1.0,  // 100%
          priority: 100
        },
        {
          name: 'Sample normal traffic',
          condition: () => true,
          sampleRate: 0.1,  // 10%
          priority: 0
        }
      ]
    })
  ]
})

logger.info('Normal request')  // 10% chance of being kept
logger.error('Failed request')  // Always kept
```

### Adaptive Budget-Based Sampling

```typescript
import { tailSamplingPlugin } from '@sylphx/cat-tail-sampling'

const logger = createLogger({
  plugins: [
    tracingPlugin(),
    tailSamplingPlugin({
      adaptive: true,
      monthlyBudget: 100_000_000,  // 100 MB per month
      rules: [
        {
          name: 'Keep all errors',
          condition: (trace) => trace.metadata.hasError,
          sampleRate: 1.0
        },
        {
          name: 'Sample normal traffic',
          condition: () => true,
          sampleRate: 0.2  // Starting rate, adjusted automatically
        }
      ]
    })
  ]
})
```

### Latency-Based Sampling

```typescript
import { tailSamplingPlugin } from '@sylphx/cat-tail-sampling'

const logger = createLogger({
  plugins: [
    tracingPlugin(),
    tailSamplingPlugin({
      rules: [
        {
          name: 'Keep all errors',
          condition: (trace) => trace.metadata.hasError,
          sampleRate: 1.0,
          priority: 100
        },
        {
          name: 'Keep slow requests (>1s)',
          condition: (trace) => {
            const duration = (trace.metadata.endTime || Date.now()) - trace.metadata.startTime
            return duration > 1000
          },
          sampleRate: 1.0,
          priority: 90
        },
        {
          name: 'Sample fast requests',
          condition: () => true,
          sampleRate: 0.05,  // 5%
          priority: 0
        }
      ]
    })
  ]
})
```

## API Reference

### `tailSamplingPlugin(options?: TailSamplingPluginOptions): Plugin`

Creates a tail-based sampling plugin.

**Options:**

- `enabled?: boolean` - Enable tail sampling (default: `true`)
- `rules?: SamplingRule[]` - Sampling rules evaluated in priority order
- `maxBufferSize?: number` - Max logs per trace (default: `1000`)
- `maxTraceDuration?: number` - Max trace duration in ms before auto-flush (default: `30000`)
- `adaptive?: boolean` - Enable adaptive budget-aware sampling (default: `false`)
- `monthlyBudget?: number` - Monthly budget in bytes for adaptive sampling
- `getTraceId?: (entry: LogEntry) => string | undefined` - Custom trace ID extractor (default: uses `entry.traceId`)
- `onFlush?: (trace: TraceBuffer, kept: boolean) => void` - Callback when trace is flushed

### `SamplingRule`

Rule for determining whether to keep a trace.

**Properties:**

- `name?: string` - Rule name for debugging
- `condition: (trace: TraceBuffer) => boolean` - Condition function
- `sampleRate: number` - Sample rate from 0.0 (discard all) to 1.0 (keep all)
- `priority?: number` - Priority (higher = evaluated first, default: `0`)

### `TraceBuffer`

Buffer containing all logs for a single trace.

**Properties:**

- `traceId: string` - Trace ID
- `logs: LogEntry[]` - All log entries in the trace
- `metadata: TraceMetadata` - Aggregated trace metadata

### `TraceMetadata`

Metadata aggregated from all logs in a trace.

**Properties:**

- `traceId: string` - Trace ID
- `startTime: number` - Trace start time (ms)
- `endTime?: number` - Trace end time (ms)
- `logCount: number` - Number of logs in trace
- `hasError: boolean` - True if any error/fatal logs
- `maxLevel: number` - Highest log level (numeric)
- `minDuration?: number` - Minimum operation duration
- `maxDuration?: number` - Maximum operation duration
- `avgDuration?: number` - Average operation duration
- `statusCode?: number` - HTTP status code (if present)
- `customFields: Record<string, unknown>` - Custom metadata

## Advanced Examples

### HTTP Status Code-Based Sampling

```typescript
tailSamplingPlugin({
  rules: [
    {
      name: 'Keep 5xx errors',
      condition: (trace) => {
        const status = trace.metadata.statusCode
        return status !== undefined && status >= 500
      },
      sampleRate: 1.0,
      priority: 100
    },
    {
      name: 'Keep 4xx errors',
      condition: (trace) => {
        const status = trace.metadata.statusCode
        return status !== undefined && status >= 400
      },
      sampleRate: 0.5,  // 50%
      priority: 90
    },
    {
      name: 'Sample 2xx/3xx',
      condition: () => true,
      sampleRate: 0.05,  // 5%
      priority: 0
    }
  ]
})
```

### Multi-Tier Sampling

```typescript
tailSamplingPlugin({
  rules: [
    // Tier 1: Always keep (priority 100)
    {
      name: 'Errors',
      condition: (trace) => trace.metadata.hasError,
      sampleRate: 1.0,
      priority: 100
    },
    // Tier 2: High-value traces (priority 50)
    {
      name: 'Slow requests',
      condition: (trace) => {
        const duration = (trace.metadata.endTime || Date.now()) - trace.metadata.startTime
        return duration > 2000
      },
      sampleRate: 0.8,  // 80%
      priority: 50
    },
    {
      name: 'High log volume',
      condition: (trace) => trace.metadata.logCount > 20,
      sampleRate: 0.6,  // 60%
      priority: 45
    },
    // Tier 3: Sample everything else (priority 0)
    {
      name: 'Normal traffic',
      condition: () => true,
      sampleRate: 0.1,  // 10%
      priority: 0
    }
  ]
})
```

### Custom Trace ID Extraction

```typescript
tailSamplingPlugin({
  getTraceId: (entry) => {
    // Extract from custom field
    return entry.data?.customTraceId || entry.traceId
  },
  rules: [...]
})
```

### Monitoring Sampling Decisions

```typescript
tailSamplingPlugin({
  onFlush: (trace, kept) => {
    console.log(`Trace ${trace.traceId}: ${kept ? 'KEPT' : 'DROPPED'}`)
    console.log(`  Logs: ${trace.metadata.logCount}`)
    console.log(`  HasError: ${trace.metadata.hasError}`)
    console.log(`  Duration: ${(trace.metadata.endTime || Date.now()) - trace.metadata.startTime}ms`)
  },
  rules: [...]
})
```

## How It Works

1. **Buffering**: Logs are grouped by trace ID and buffered in memory
2. **Metadata Collection**: Metadata is aggregated (errors, duration, status codes, etc.)
3. **Trace Completion**: Traces complete after max duration or explicit flush
4. **Rule Evaluation**: Rules are evaluated in priority order
5. **Sampling Decision**: First matching rule determines the sample rate
6. **Emission**: Logs are either emitted or discarded based on the decision

## Cost Optimization

### Expected Savings

- **High-error services**: 40-60% reduction (many traces kept due to errors)
- **Low-error services**: 70-90% reduction (most traces sampled at low rate)
- **Average service**: 50-70% reduction

### Budget Examples

**100 MB/month budget:**
```typescript
monthlyBudget: 100_000_000  // 100 MB
```

**1 GB/month budget:**
```typescript
monthlyBudget: 1_000_000_000  // 1 GB
```

The adaptive sampler automatically adjusts sample rates to stay within budget while maintaining 100% error coverage.

## Best Practices

1. **Always keep errors**: Set error sampling to 1.0 (100%)
2. **Use priorities**: Higher priority rules should be more specific
3. **Start conservative**: Begin with low sample rates (5-10%) for normal traffic
4. **Monitor costs**: Use `onFlush` callback to track sampling decisions
5. **Adjust budgets**: Review and adjust monthly budgets based on actual usage

## Package Size

- **Minified:** ~5.5 KB
- **Minified + Gzipped:** 1.82 KB
- **No additional dependencies** (requires @sylphx/cat-tracing peer dependency)

## Links

- [Main Documentation](https://cat.sylphx.com)
- [GitHub Repository](https://github.com/SylphxAI/cat)
- [npm Package](https://www.npmjs.com/package/@sylphx/cat-tail-sampling)

## Related Packages

- [@sylphx/cat](../cat) - Core logger
- [@sylphx/cat-tracing](../cat-tracing) - W3C Trace Context (required)
- [@sylphx/cat-otlp](../cat-otlp) - OpenTelemetry Protocol export

## Inspiration

- Datadog Adaptive Ingestion (2024)
- Honeycomb Tail-Based Sampling
- OpenTelemetry Tail Sampling Processor

## License

MIT © Kyle Zhu
