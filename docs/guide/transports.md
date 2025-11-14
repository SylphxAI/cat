# Transports

Transports define where logs are sent. @sylphx/cat includes Console, File, Stream, and OTLP transports, plus support for custom transports.

## Built-in Transports

### Console Transport

Writes logs to stdout/stderr:

```typescript
import { createLogger, consoleTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [consoleTransport()]
})

logger.info('Goes to stdout')
logger.error('Goes to stderr')
```

**Behavior:**
- `trace`, `debug`, `info`, `warn` → stdout
- `error`, `fatal` → stderr

**Best for:**
- Development
- Docker containers
- 12-factor apps
- Cloud platforms (logs to stdout)

### File Transport

Writes logs to a file:

```typescript
import { fileTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    fileTransport({
      path: './logs/app.log'
    })
  ]
})
```

**Options:**

```typescript
fileTransport({
  path: string // File path (required)
  // flags: 'a' // Append mode (default)
  // encoding: 'utf8' // File encoding (default)
})
```

**Best for:**
- Local development
- Legacy systems
- Simple deployments
- Backup logs

**Note:** File transport does not include log rotation. For production use with rotation, consider:
- Using `rotating-file-stream` library
- Implementing custom transport with rotation
- Using external log rotation (logrotate)

### Stream Transport

Writes logs to any writable stream:

```typescript
import { streamTransport } from '@sylphx/cat'
import fs from 'node:fs'

const logger = createLogger({
  transports: [
    streamTransport({
      stream: process.stdout
    })
  ]
})

// Or file stream
const fileStream = fs.createWriteStream('./logs/app.log')
const logger2 = createLogger({
  transports: [
    streamTransport({ stream: fileStream })
  ]
})
```

**Best for:**
- Custom stream destinations
- Network streams
- Compression streams
- Transform streams

**Example with compression:**

```typescript
import { createWriteStream } from 'node:fs'
import { createGzip } from 'node:zlib'
import { streamTransport } from '@sylphx/cat'

const fileStream = createWriteStream('./logs/app.log.gz')
const gzipStream = createGzip()
gzipStream.pipe(fileStream)

const logger = createLogger({
  transports: [
    streamTransport({ stream: gzipStream })
  ]
})
```

### OTLP Transport

Sends logs to OpenTelemetry Protocol endpoints:

```typescript
import { otlpTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    otlpTransport({
      endpoint: 'http://localhost:4318/v1/logs',
      headers: {
        'Authorization': 'Bearer <token>'
      },
      batch: true,
      batchSize: 100,
      resourceAttributes: {
        'service.name': 'my-api',
        'service.version': '1.0.0',
        'deployment.environment': 'production'
      }
    })
  ]
})
```

**Options:**

```typescript
otlpTransport({
  // Endpoint URL (default: http://localhost:4318/v1/logs)
  endpoint?: string

  // HTTP headers
  headers?: Record<string, string>

  // Enable batching
  batch?: boolean // default: false

  // Batch size (logs)
  batchSize?: number // default: 100

  // Batch interval (ms)
  batchInterval?: number // default: 1000

  // Compression ('gzip' | 'none')
  compression?: string // default: 'none'

  // Retry attempts
  retries?: number // default: 3

  // Request timeout (ms)
  timeout?: number // default: 5000

  // Resource attributes
  resourceAttributes?: Record<string, string>

  // Scope metadata
  scopeName?: string
  scopeVersion?: string
})
```

**Compatible backends:**
- Grafana Loki
- Datadog
- New Relic
- AWS CloudWatch
- Honeycomb
- Jaeger
- Zipkin
- OpenTelemetry Collector

See [OTLP Guide](/guide/otlp) for detailed examples.

## Multiple Transports

Use multiple transports for different destinations:

```typescript
import { consoleTransport, fileTransport, otlpTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [
    // Console for development
    consoleTransport(),

    // File for local backup
    fileTransport({ path: './logs/app.log' }),

    // OTLP for production observability
    otlpTransport({
      endpoint: process.env.OTLP_ENDPOINT,
      headers: { Authorization: `Bearer ${process.env.OTLP_TOKEN}` }
    })
  ]
})
```

**Use cases:**
- Development + production logging
- Local backup + remote aggregation
- Multiple log aggregation services
- Redundancy and failover

## Custom Transports

Create your own transport by implementing the `Transport` interface:

```typescript
import type { Transport, LogEntry } from '@sylphx/cat'

class CustomTransport implements Transport {
  async log(entry: LogEntry, formatted: string): Promise<void> {
    // Your custom logic here
    console.log('Custom:', formatted)
  }
}

const logger = createLogger({
  transports: [new CustomTransport()]
})
```

### Transport Interface

```typescript
interface Transport {
  log(entry: LogEntry, formatted: string): Promise<void> | void
}
```

**Parameters:**
- `entry` - Structured log entry object
- `formatted` - Pre-formatted string from formatter

### Examples

#### HTTP Transport

```typescript
class HTTPTransport implements Transport {
  constructor(
    private url: string,
    private headers: Record<string, string> = {}
  ) {}

  async log(entry: LogEntry, formatted: string): Promise<void> {
    await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: formatted
    })
  }
}

const logger = createLogger({
  transports: [
    new HTTPTransport('https://logs.example.com/ingest', {
      'X-API-Key': process.env.API_KEY!
    })
  ]
})
```

#### Database Transport

```typescript
import { createPool } from 'mysql2/promise'

class DatabaseTransport implements Transport {
  private pool = createPool({
    host: 'localhost',
    user: 'logger',
    database: 'logs'
  })

  async log(entry: LogEntry, formatted: string): Promise<void> {
    await this.pool.execute(
      'INSERT INTO logs (level, timestamp, message, data) VALUES (?, ?, ?, ?)',
      [
        entry.level,
        new Date(entry.timestamp),
        entry.message,
        JSON.stringify(entry.data || {})
      ]
    )
  }
}
```

#### Discord/Slack Transport

```typescript
class DiscordTransport implements Transport {
  constructor(private webhookUrl: string) {}

  async log(entry: LogEntry, formatted: string): Promise<void> {
    // Only send errors
    if (entry.level !== 'error' && entry.level !== 'fatal') {
      return
    }

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **${entry.level.toUpperCase()}**: ${entry.message}`,
        embeds: [{
          description: '```json\n' + JSON.stringify(entry.data, null, 2) + '\n```'
        }]
      })
    })
  }
}
```

#### Batching Transport

```typescript
class BatchTransport implements Transport {
  private batch: string[] = []
  private timer?: NodeJS.Timeout

  constructor(
    private innerTransport: Transport,
    private batchSize = 100,
    private interval = 1000
  ) {}

  async log(entry: LogEntry, formatted: string): Promise<void> {
    this.batch.push(formatted)

    if (this.batch.length >= this.batchSize) {
      await this.flush()
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.interval)
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }

    if (this.batch.length === 0) return

    const logs = this.batch.splice(0)
    for (const log of logs) {
      await this.innerTransport.log(JSON.parse(log), log)
    }
  }
}
```

#### Filtered Transport

```typescript
class FilteredTransport implements Transport {
  constructor(
    private innerTransport: Transport,
    private filter: (entry: LogEntry) => boolean
  ) {}

  async log(entry: LogEntry, formatted: string): Promise<void> {
    if (this.filter(entry)) {
      await this.innerTransport.log(entry, formatted)
    }
  }
}

// Only send errors to Slack
const slackTransport = new FilteredTransport(
  new DiscordTransport(process.env.SLACK_WEBHOOK!),
  (entry) => entry.level === 'error' || entry.level === 'fatal'
)
```

#### Failover Transport

```typescript
class FailoverTransport implements Transport {
  constructor(private transports: Transport[]) {}

  async log(entry: LogEntry, formatted: string): Promise<void> {
    for (const transport of this.transports) {
      try {
        await transport.log(entry, formatted)
        return // Success, stop trying
      } catch (error) {
        console.error('Transport failed, trying next:', error)
      }
    }

    console.error('All transports failed for log:', entry)
  }
}

const logger = createLogger({
  transports: [
    new FailoverTransport([
      otlpTransport({ endpoint: 'https://primary.example.com' }),
      otlpTransport({ endpoint: 'https://backup.example.com' }),
      fileTransport({ path: './logs/failover.log' })
    ])
  ]
})
```

## Transport Best Practices

### Error Handling

```typescript
class SafeTransport implements Transport {
  constructor(private innerTransport: Transport) {}

  async log(entry: LogEntry, formatted: string): Promise<void> {
    try {
      await this.innerTransport.log(entry, formatted)
    } catch (error) {
      // Don't let transport errors crash the app
      console.error('Transport error:', error)
    }
  }
}
```

### Performance

```typescript
// ✅ Good - async/non-blocking
class AsyncTransport implements Transport {
  async log(entry: LogEntry, formatted: string): Promise<void> {
    // Non-blocking I/O
    await fetch(url, { body: formatted })
  }
}

// ⚠️ Acceptable - sync/blocking (for local files)
class SyncTransport implements Transport {
  log(entry: LogEntry, formatted: string): void {
    // Blocking I/O (keep it fast!)
    fs.appendFileSync('./logs/app.log', formatted + '\n')
  }
}
```

### Resource Cleanup

```typescript
class CleanupTransport implements Transport {
  private connection: Connection

  async log(entry: LogEntry, formatted: string): Promise<void> {
    await this.connection.send(formatted)
  }

  async close(): Promise<void> {
    await this.connection.close()
  }
}
```

## Testing Transports

```typescript
class MemoryTransport implements Transport {
  logs: Array<{ entry: LogEntry; formatted: string }> = []

  async log(entry: LogEntry, formatted: string): Promise<void> {
    this.logs.push({ entry, formatted })
  }

  clear() {
    this.logs = []
  }
}

describe('MyService', () => {
  let transport: MemoryTransport
  let logger: Logger

  beforeEach(() => {
    transport = new MemoryTransport()
    logger = createLogger({ transports: [transport] })
  })

  it('logs user creation', async () => {
    await createUser({ name: 'John' })

    expect(transport.logs).toHaveLength(1)
    expect(transport.logs[0].entry.message).toBe('User created')
  })
})
```

## See Also

- [Loggers](/guide/loggers) - Logger creation and usage
- [Formatters](/guide/formatters) - Output formatting
- [OTLP Guide](/guide/otlp) - OpenTelemetry integration
- [API Reference](/api/transports) - Complete transport API
