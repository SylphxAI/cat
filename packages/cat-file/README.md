# @sylphx/cat-file

> File and stream transports for @sylphx/cat logger

[![npm version](https://img.shields.io/npm/v/@sylphx/cat-file.svg)](https://www.npmjs.com/package/@sylphx/cat-file)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**1.14 KB** • **File logging** • **Stream support** • **Universal runtime**

## Installation

```bash
npm install @sylphx/cat @sylphx/cat-file
```

## Description

Provides file-based and stream-based transports for @sylphx/cat. Write logs to files with automatic buffering, or pipe to custom streams. Works in both Bun and Node.js environments.

## Usage Examples

### File Transport

```typescript
import { createLogger } from '@sylphx/cat'
import { fileTransport } from '@sylphx/cat-file'

const logger = createLogger({
  transports: [
    fileTransport({ path: './logs/app.log' })
  ]
})

logger.info('This goes to the file')
// Writes to ./logs/app.log
```

### Multiple File Transports (Log Rotation)

```typescript
import { createLogger } from '@sylphx/cat'
import { fileTransport } from '@sylphx/cat-file'

const logger = createLogger({
  transports: [
    fileTransport({ path: './logs/app.log' }),
    fileTransport({ path: './logs/error.log' })
  ]
})

// You can filter by level in your application logic
logger.info('General log')  // Goes to both files
logger.error('Error log')   // Goes to both files
```

### Stream Transport

```typescript
import { createLogger } from '@sylphx/cat'
import { streamTransport } from '@sylphx/cat-file'
import { createWriteStream } from 'node:fs'

const stream = createWriteStream('./logs/app.log', { flags: 'a' })

const logger = createLogger({
  transports: [
    streamTransport({ stream })
  ]
})

logger.info('This goes to the stream')
```

## API Reference

### `fileTransport(options: FileTransportOptions): Transport`

Creates a file transport that writes logs to a file.

**Options:**

- `path: string` - File path (required)
- `mode?: number` - File mode (default: `0o666`)
- `flags?: string` - File open flags (default: `'a'` for append)

**Features:**
- Automatic directory creation
- Buffered writes for performance
- Async flush support
- Works in Bun and Node.js

**Example:**

```typescript
fileTransport({
  path: './logs/app.log',
  mode: 0o644,
  flags: 'a'
})
```

### `streamTransport(options: StreamTransportOptions): Transport`

Creates a stream transport that writes logs to a writable stream.

**Options:**

- `stream: WritableStream` - Writable stream (required)

**Features:**
- Works with any Node.js writable stream
- Buffered writes
- Async flush support

**Example:**

```typescript
import { createWriteStream } from 'node:fs'

streamTransport({
  stream: createWriteStream('./logs/app.log')
})
```

### Transport Methods

Both transports implement the standard Transport interface:

- `log(entry: LogEntry, formatted: string): void` - Write a log entry
- `flush(): Promise<void>` - Flush pending writes
- `close(): Promise<void>` - Close the transport

## Advanced Usage

### Graceful Shutdown

```typescript
const logger = createLogger({
  transports: [fileTransport({ path: './logs/app.log' })]
})

process.on('SIGTERM', async () => {
  await logger.close()  // Flushes and closes all transports
  process.exit(0)
})
```

### Multiple Outputs

```typescript
import { createLogger, consoleTransport } from '@sylphx/cat'
import { fileTransport } from '@sylphx/cat-file'

const logger = createLogger({
  transports: [
    consoleTransport(),  // Console output
    fileTransport({ path: './logs/app.log' })  // File output
  ]
})

logger.info('Logged to both console and file')
```

## Package Size

- **Minified:** ~3.5 KB
- **Minified + Gzipped:** 1.14 KB
- **No additional dependencies**

## Runtime Compatibility

- ✅ Bun 1.0+
- ✅ Node.js 18+
- ⚠️ Browser/Edge (use stream transport with custom writable streams)

## Links

- [Main Documentation](https://cat.sylphx.com)
- [GitHub Repository](https://github.com/SylphxAI/cat)
- [npm Package](https://www.npmjs.com/package/@sylphx/cat-file)

## Related Packages

- [@sylphx/cat](../cat) - Core logger
- [@sylphx/cat-pretty](../cat-pretty) - Pretty formatter
- [@sylphx/cat-otlp](../cat-otlp) - OpenTelemetry Protocol export

## License

MIT © Kyle Zhu
