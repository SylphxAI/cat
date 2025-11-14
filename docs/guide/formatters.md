# Formatters

Formatters control how log entries are serialized to strings. @sylphx/cat includes JSON and Pretty formatters, plus support for custom formatters.

## Built-in Formatters

### JSON Formatter

Outputs logs as newline-delimited JSON (NDJSON):

```typescript
import { createLogger, jsonFormatter } from '@sylphx/cat'

const logger = createLogger({
  formatter: jsonFormatter()
})

logger.info('User login', { userId: '123' })
// {"level":"info","time":1699564800000,"msg":"User login","userId":"123"}
```

**Best for:**
- Production environments
- Log aggregation systems
- Machine parsing
- Structured log analysis

**Options:**

```typescript
jsonFormatter({
  // No options currently
  // Pure JSON output for maximum compatibility
})
```

**Output format:**

```json
{
  "level": "info",
  "time": 1699564800000,
  "msg": "Message text",
  ...data
}
```

### Pretty Formatter

Human-readable colored output for development:

```typescript
import { createLogger, prettyFormatter } from '@sylphx/cat'

const logger = createLogger({
  formatter: prettyFormatter({
    colors: true,
    timestamp: true,
    timestampFormat: 'iso' // 'iso' | 'unix' | 'relative'
  })
})

logger.info('Server started', { port: 3000 })
// 2024-01-01T12:00:00.000Z INF Server started {"port":3000}
```

**Best for:**
- Development environments
- Local debugging
- Console output
- Human readability

**Options:**

```typescript
prettyFormatter({
  // Enable ANSI colors
  colors?: boolean // default: true

  // Show timestamp
  timestamp?: boolean // default: true

  // Timestamp format
  timestampFormat?: 'iso' | 'unix' | 'relative' // default: 'iso'

  // Custom colors per level
  levelColors?: {
    trace?: string
    debug?: string
    info?: string
    warn?: string
    error?: string
    fatal?: string
  }
})
```

**Output format:**

```
[timestamp] LEVEL Message {data}
```

**Example with colors:**

```typescript
const logger = createLogger({
  formatter: prettyFormatter({
    colors: true,
    timestampFormat: 'iso'
  })
})

logger.trace('Trace message')   // Gray
logger.debug('Debug message')   // Cyan
logger.info('Info message')     // Green
logger.warn('Warning message')  // Yellow
logger.error('Error message')   // Red
logger.fatal('Fatal message')   // Magenta
```

**Timestamp formats:**

```typescript
// ISO 8601
timestampFormat: 'iso'
// Output: 2024-01-01T12:00:00.000Z

// Unix timestamp (milliseconds)
timestampFormat: 'unix'
// Output: 1699564800000

// Relative time (since process start)
timestampFormat: 'relative'
// Output: +1234ms
```

## Custom Formatters

Create your own formatter by implementing the `Formatter` interface:

```typescript
import type { Formatter, LogEntry } from '@sylphx/cat'

class CustomFormatter implements Formatter {
  format(entry: LogEntry): string {
    return `[${entry.level.toUpperCase()}] ${entry.message}`
  }
}

const logger = createLogger({
  formatter: new CustomFormatter()
})

logger.info('Hello')
// [INFO] Hello
```

### LogEntry Structure

The `LogEntry` object passed to formatters:

```typescript
interface LogEntry {
  level: LogLevel // 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  timestamp: number // Unix timestamp in milliseconds
  message: string // Log message
  data?: Record<string, unknown> // Structured data
}
```

### Examples

#### CSV Formatter

```typescript
class CSVFormatter implements Formatter {
  format(entry: LogEntry): string {
    const { timestamp, level, message, data } = entry
    const dataStr = data ? JSON.stringify(data) : ''
    return `${timestamp},${level},${message},"${dataStr}"`
  }
}

const logger = createLogger({
  formatter: new CSVFormatter()
})

logger.info('User login', { userId: '123' })
// 1699564800000,info,User login,"{"userId":"123"}"
```

#### Syslog Formatter

```typescript
class SyslogFormatter implements Formatter {
  private hostname = require('os').hostname()
  private appName = 'myapp'

  format(entry: LogEntry): string {
    const priority = this.getPriority(entry.level)
    const timestamp = new Date(entry.timestamp).toISOString()
    const msg = `${entry.message} ${JSON.stringify(entry.data || {})}`

    return `<${priority}>1 ${timestamp} ${this.hostname} ${this.appName} - - - ${msg}`
  }

  private getPriority(level: string): number {
    const levelMap = {
      fatal: 2, error: 3, warn: 4, info: 6, debug: 7, trace: 7
    }
    return levelMap[level] || 6
  }
}
```

#### Colored JSON Formatter

```typescript
import chalk from 'chalk'

class ColoredJSONFormatter implements Formatter {
  format(entry: LogEntry): string {
    const json = JSON.stringify({
      level: entry.level,
      time: entry.timestamp,
      msg: entry.message,
      ...entry.data
    }, null, 2)

    // Colorize based on level
    switch (entry.level) {
      case 'error':
      case 'fatal':
        return chalk.red(json)
      case 'warn':
        return chalk.yellow(json)
      case 'info':
        return chalk.green(json)
      default:
        return chalk.gray(json)
    }
  }
}
```

#### Template Formatter

```typescript
class TemplateFormatter implements Formatter {
  constructor(private template: string) {}

  format(entry: LogEntry): string {
    return this.template
      .replace('{timestamp}', new Date(entry.timestamp).toISOString())
      .replace('{level}', entry.level.toUpperCase())
      .replace('{message}', entry.message)
      .replace('{data}', JSON.stringify(entry.data || {}))
  }
}

const logger = createLogger({
  formatter: new TemplateFormatter('[{timestamp}] {level}: {message} {data}')
})

logger.info('Test', { foo: 'bar' })
// [2024-01-01T12:00:00.000Z] INFO: Test {"foo":"bar"}
```

#### Compact Formatter

```typescript
class CompactFormatter implements Formatter {
  format(entry: LogEntry): string {
    const parts = [
      entry.level[0].toUpperCase(), // First letter of level
      entry.message
    ]

    if (entry.data && Object.keys(entry.data).length > 0) {
      parts.push(JSON.stringify(entry.data))
    }

    return parts.join(' ')
  }
}

logger.info('Server started', { port: 3000 })
// I Server started {"port":3000}
```

## Environment-Based Formatting

Choose formatter based on environment:

```typescript
import { createLogger, jsonFormatter, prettyFormatter } from '@sylphx/cat'

const isDev = process.env.NODE_ENV === 'development'

const logger = createLogger({
  formatter: isDev
    ? prettyFormatter({ colors: true })
    : jsonFormatter()
})
```

## Performance Considerations

### JSON is Fastest

JSON formatter is optimized for performance:

```typescript
// Fastest - minimal processing
const logger = createLogger({
  formatter: jsonFormatter()
})
```

### Pretty Adds Overhead

Pretty formatter adds color codes and formatting:

```typescript
// Slower - ANSI color codes, timestamp formatting
const logger = createLogger({
  formatter: prettyFormatter({ colors: true })
})
```

**Recommendation:**
- Use JSON in production
- Use Pretty in development
- Disable colors in CI/CD (`colors: false`)

### Custom Formatter Optimization

```typescript
class OptimizedFormatter implements Formatter {
  format(entry: LogEntry): string {
    // ✅ Pre-allocate string builder
    const parts: string[] = []

    parts.push('[', entry.level, '] ', entry.message)

    if (entry.data) {
      parts.push(' ', JSON.stringify(entry.data))
    }

    return parts.join('')
  }
}

// ❌ Avoid string concatenation in loops
class SlowFormatter implements Formatter {
  format(entry: LogEntry): string {
    let result = '[' + entry.level + '] ' + entry.message
    if (entry.data) {
      result += ' ' + JSON.stringify(entry.data)
    }
    return result
  }
}
```

## Testing Formatters

```typescript
import { jsonFormatter } from '@sylphx/cat'

describe('Formatter', () => {
  it('formats log entry', () => {
    const formatter = jsonFormatter()

    const entry = {
      level: 'info' as const,
      timestamp: 1699564800000,
      message: 'Test',
      data: { key: 'value' }
    }

    const result = formatter.format(entry)
    const parsed = JSON.parse(result)

    expect(parsed.level).toBe('info')
    expect(parsed.msg).toBe('Test')
    expect(parsed.key).toBe('value')
  })
})
```

## See Also

- [Loggers](/guide/loggers) - Logger creation and usage
- [Transports](/guide/transports) - Log destinations
- [API Reference](/api/formatters) - Complete formatter API
