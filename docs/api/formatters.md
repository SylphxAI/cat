# Formatters API

Log formatters convert LogEntry objects to strings.

## Interface

```typescript
interface Formatter {
  format(entry: LogEntry): string
}
```

## Built-in Formatters

### jsonFormatter

```typescript
function jsonFormatter(): Formatter
```

Outputs newline-delimited JSON.

```typescript
import { jsonFormatter } from '@sylphx/cat'

const formatter = jsonFormatter()
// Output: {"level":"info","time":1234567890,"msg":"Message","key":"value"}
```

### prettyFormatter

```typescript
function prettyFormatter(options?: PrettyFormatterOptions): Formatter
```

Human-readable colored output.

```typescript
interface PrettyFormatterOptions {
  colors?: boolean // Enable ANSI colors (default: true)
  timestamp?: boolean // Show timestamp (default: true)
  timestampFormat?: 'iso' | 'unix' | 'relative' // Timestamp format (default: 'iso')
}
```

```typescript
import { prettyFormatter } from '@sylphx/cat'

const formatter = prettyFormatter({
  colors: true,
  timestampFormat: 'iso'
})
// Output: 2024-01-01T12:00:00.000Z INF Message {"key":"value"}
```

## Custom Formatter

```typescript
import type { Formatter, LogEntry } from '@sylphx/cat'

class CustomFormatter implements Formatter {
  format(entry: LogEntry): string {
    return `[${entry.level}] ${entry.message}`
  }
}

const logger = createLogger({
  formatter: new CustomFormatter()
})
```

## See Also

- [Logger API](/api/logger)
- [Formatters Guide](/guide/formatters)
