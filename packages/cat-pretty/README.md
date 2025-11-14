# @sylphx/cat-pretty

> Pretty formatter for @sylphx/cat logger

[![npm version](https://img.shields.io/npm/v/@sylphx/cat-pretty.svg)](https://www.npmjs.com/package/@sylphx/cat-pretty)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**0.81 KB** • **Beautiful colored output** • **Perfect for development**

## Installation

```bash
npm install @sylphx/cat @sylphx/cat-pretty
```

## Description

A beautiful, human-readable formatter for @sylphx/cat logs. Adds colors, timestamps, and clean formatting to make logs easy to read during development. Optimized for terminal output with ANSI color support.

## Usage Examples

### Basic Pretty Logging

```typescript
import { createLogger } from '@sylphx/cat'
import { prettyFormatter } from '@sylphx/cat-pretty'

const logger = createLogger({
  formatter: prettyFormatter()
})

logger.info('Server started', { port: 3000 })
// [2024-11-14T20:30:15.123Z] INF Server started {"port":3000}

logger.error('Connection failed', { host: 'db.example.com' })
// [2024-11-14T20:30:16.456Z] ERR Connection failed {"host":"db.example.com"}
```

### Custom Timestamp Format

```typescript
import { prettyFormatter } from '@sylphx/cat-pretty'

// ISO format (default)
const logger1 = createLogger({
  formatter: prettyFormatter({ timestampFormat: 'iso' })
})
logger1.info('Hello')
// [2024-11-14T20:30:15.123Z] INF Hello

// Unix timestamp
const logger2 = createLogger({
  formatter: prettyFormatter({ timestampFormat: 'unix' })
})
logger2.info('Hello')
// [1700000000000] INF Hello

// Relative time (ms since start)
const logger3 = createLogger({
  formatter: prettyFormatter({ timestampFormat: 'relative' })
})
logger3.info('Hello')
// [+1234ms] INF Hello
```

### Disable Colors and Timestamps

```typescript
import { prettyFormatter } from '@sylphx/cat-pretty'

const logger = createLogger({
  formatter: prettyFormatter({
    colors: false,
    timestamp: false
  })
})

logger.info('Hello world')
// INF Hello world
```

## API Reference

### `prettyFormatter(options?: PrettyFormatterOptions): Formatter`

Creates a pretty formatter instance.

**Options:**

- `colors?: boolean` - Enable ANSI colors (default: `true`)
- `timestamp?: boolean` - Show timestamps (default: `true`)
- `timestampFormat?: 'iso' | 'unix' | 'relative'` - Timestamp format (default: `'iso'`)

**Color scheme:**
- `trace` - Gray
- `debug` - Cyan
- `info` - Green
- `warn` - Yellow
- `error` - Red
- `fatal` - Magenta

**Level labels:**
- `trace` → TRC
- `debug` → DBG
- `info` → INF
- `warn` → WRN
- `error` → ERR
- `fatal` → FTL

### Output Format

```
[timestamp] LEVEL message {data} [context]
```

**Example:**
```
[2024-11-14T20:30:15.123Z] INF User logged in {"userId":123} [service=auth requestId=abc-123]
```

## Package Size

- **Minified:** ~2.5 KB
- **Minified + Gzipped:** 0.81 KB
- **No additional dependencies**

## Links

- [Main Documentation](https://cat.sylphx.com)
- [GitHub Repository](https://github.com/SylphxAI/cat)
- [npm Package](https://www.npmjs.com/package/@sylphx/cat-pretty)

## Related Packages

- [@sylphx/cat](../cat) - Core logger
- [@sylphx/cat-file](../cat-file) - File and stream transports
- [@sylphx/cat-http](../cat-http) - HTTP request/response serializers

## License

MIT © Kyle Zhu
