# Transports API

Transports deliver formatted logs to destinations.

## Interface

```typescript
interface Transport {
  log(entry: LogEntry, formatted: string): Promise<void> | void
}
```

## Built-in Transports

### consoleTransport

```typescript
function consoleTransport(): Transport
```

Writes to stdout/stderr.

```typescript
import { consoleTransport } from '@sylphx/cat'

const transport = consoleTransport()
```

### fileTransport

```typescript
function fileTransport(options: FileTransportOptions): Transport
```

Writes to a file.

```typescript
interface FileTransportOptions {
  path: string // File path (required)
}
```

```typescript
import { fileTransport } from '@sylphx/cat'

const transport = fileTransport({
  path: './logs/app.log'
})
```

### streamTransport

```typescript
function streamTransport(options: StreamTransportOptions): Transport
```

Writes to a writable stream.

```typescript
interface StreamTransportOptions {
  stream: NodeJS.WritableStream // Writable stream (required)
}
```

```typescript
import { streamTransport } from '@sylphx/cat'
import fs from 'node:fs'

const transport = streamTransport({
  stream: process.stdout
})
```

### otlpTransport

```typescript
function otlpTransport(options?: OtlpTransportOptions): Transport
```

Sends logs via OpenTelemetry Protocol.

```typescript
interface OtlpTransportOptions {
  endpoint?: string // OTLP endpoint (default: http://localhost:4318/v1/logs)
  headers?: Record<string, string> // HTTP headers
  batch?: boolean // Enable batching (default: false)
  batchSize?: number // Batch size (default: 100)
  batchInterval?: number // Batch interval ms (default: 1000)
  compression?: 'gzip' | 'none' // Compression (default: 'none')
  retries?: number // Retry attempts (default: 3)
  timeout?: number // Request timeout ms (default: 5000)
  resourceAttributes?: Record<string, string> // Resource attributes
  scopeName?: string // Scope name
  scopeVersion?: string // Scope version
}
```

```typescript
import { otlpTransport } from '@sylphx/cat'

const transport = otlpTransport({
  endpoint: 'http://localhost:4318/v1/logs',
  batch: true,
  resourceAttributes: {
    'service.name': 'my-api'
  }
})
```

## Custom Transport

```typescript
import type { Transport, LogEntry } from '@sylphx/cat'

class CustomTransport implements Transport {
  async log(entry: LogEntry, formatted: string): Promise<void> {
    await fetch('https://logs.example.com', {
      method: 'POST',
      body: formatted
    })
  }
}

const logger = createLogger({
  transports: [new CustomTransport()]
})
```

## See Also

- [Logger API](/api/logger)
- [Transports Guide](/guide/transports)
- [OTLP Guide](/guide/otlp)
