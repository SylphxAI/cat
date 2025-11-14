# Getting Started

Get up and running with @sylphx/cat in minutes.

## Installation

::: code-group
```bash [npm]
npm install @sylphx/cat
```

```bash [bun]
bun add @sylphx/cat
```

```bash [pnpm]
pnpm add @sylphx/cat
```

```bash [yarn]
yarn add @sylphx/cat
```
:::

## Basic Usage

Create a logger and start logging:

```typescript
import { createLogger } from '@sylphx/cat'

const logger = createLogger()

logger.info('Application started')
logger.warn('This is a warning')
logger.error('Something went wrong')
```

## With Formatters and Transports

Configure how logs are formatted and where they go:

```typescript
import {
  createLogger,
  prettyFormatter,
  consoleTransport,
  fileTransport
} from '@sylphx/cat'

const logger = createLogger({
  level: 'info',
  formatter: prettyFormatter({
    colors: true,
    timestamp: true
  }),
  transports: [
    consoleTransport(),
    fileTransport({ path: './logs/app.log' })
  ]
})

logger.info('Hello world!')
```

## Structured Logging

Add structured data to your logs:

```typescript
logger.info('User logged in', {
  userId: '123',
  action: 'login',
  ip: '192.168.1.1',
  timestamp: Date.now()
})

// Output (JSON format):
// {
//   "level": "info",
//   "msg": "User logged in",
//   "data": {
//     "userId": "123",
//     "action": "login",
//     "ip": "192.168.1.1",
//     "timestamp": 1234567890
//   }
// }
```

## Child Loggers

Create child loggers with inherited context:

```typescript
const logger = createLogger({
  context: {
    app: 'my-api',
    version: '1.0.0'
  }
})

// Create child logger for auth service
const authLogger = logger.child({
  service: 'auth'
})

authLogger.info('User authenticated', { userId: '123' })
// Includes: app, version, service, userId
```

## Next Steps

- [Core Concepts](/guide/loggers) - Understand loggers, formatters, and transports
- [Security](/guide/redaction) - Learn about data redaction and OWASP compliance
- [Observability](/guide/tracing) - Integrate with OpenTelemetry
- [Examples](/examples/) - Browse real-world examples

## Quick Links

- [API Reference](/api/) - Complete API documentation
- [Migration Guide](/guide/migration) - Migrate from Pino or Winston
- [Best Practices](/guide/best-practices) - Production tips and patterns
