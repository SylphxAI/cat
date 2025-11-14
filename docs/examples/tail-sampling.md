# Cost Optimization Examples

Tail-based sampling for cost reduction.

## Basic Tail-Based Sampling

```typescript
import { createLogger, tracingPlugin, tailSamplingPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    tracingPlugin(),
    tailSamplingPlugin() // Default rules: 100% errors, 1% success
  ]
})

// Errors are kept (100%)
logger.error('Payment failed')

// Success logs are sampled (1%)
logger.info('Order processed')
```

## Custom Rules

```typescript
import { tailSamplingPlugin, type SamplingRule } from '@sylphx/cat'

const rules: SamplingRule[] = [
  // Keep all errors
  { name: 'errors', condition: (t) => t.metadata.hasError, sampleRate: 1.0 },

  // Keep slow requests
  { name: 'slow', condition: (t) => (t.metadata.maxDuration || 0) > 1000, sampleRate: 1.0 },

  // Sample success at 1%
  { name: 'default', condition: () => true, sampleRate: 0.01 }
]

const logger = createLogger({
  plugins: [
    tracingPlugin(),
    tailSamplingPlugin({ rules })
  ]
})
```

## Budget-Aware Sampling

```typescript
const logger = createLogger({
  plugins: [
    tracingPlugin(),
    tailSamplingPlugin({
      adaptive: true,
      monthlyBudget: 10 * 1024 * 1024 * 1024, // 10 GB/month

      onBudgetUpdate: (stats) => {
        console.log(`Budget: ${stats.usedPercent}% used`)
      }
    })
  ]
})
```

**Result:** 40-90% cost reduction with 100% error coverage

## See Also

- [Tail-Based Sampling Guide](/guide/tail-sampling)
- [Performance](/guide/performance)
