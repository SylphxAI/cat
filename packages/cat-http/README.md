# @sylphx/cat-http

> HTTP request/response serializers for @sylphx/cat logger

[![npm version](https://img.shields.io/npm/v/@sylphx/cat-http.svg)](https://www.npmjs.com/package/@sylphx/cat-http)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**0.75 KB** • **Express/Fastify compatible** • **Automatic header redaction**

## Installation

```bash
npm install @sylphx/cat @sylphx/cat-http
```

## Description

Provides standardized serializers for HTTP requests and responses in @sylphx/cat. Automatically extracts relevant information from request/response objects while redacting sensitive headers (authorization, cookies, API keys). Compatible with Express, Fastify, Koa, Next.js, and standard Node.js HTTP objects.

## Usage Examples

### Express Middleware

```typescript
import { createLogger } from '@sylphx/cat'
import { httpSerializers } from '@sylphx/cat-http'
import express from 'express'

const logger = createLogger({
  serializers: httpSerializers
})

const app = express()

app.use((req, res, next) => {
  logger.info({ req }, 'Incoming request')
  next()
})

app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id })
  logger.info({ req, res }, 'Request completed')
})
```

Output:
```json
{
  "level": "info",
  "message": "Incoming request",
  "req": {
    "method": "GET",
    "url": "/users/123",
    "headers": { "user-agent": "...", "authorization": "[REDACTED]" },
    "params": { "id": "123" },
    "remoteAddress": "::1"
  }
}
```

### Standalone Request Serialization

```typescript
import { createLogger } from '@sylphx/cat'
import { requestSerializer, responseSerializer } from '@sylphx/cat-http'

const logger = createLogger({
  serializers: {
    req: requestSerializer,
    res: responseSerializer
  }
})

// In your HTTP handler
logger.info({ req, res }, 'HTTP request processed')
```

### Next.js API Route

```typescript
import { createLogger } from '@sylphx/cat'
import { httpSerializers } from '@sylphx/cat-http'
import type { NextApiRequest, NextApiResponse } from 'next'

const logger = createLogger({
  serializers: httpSerializers
})

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  logger.info({ req }, 'API request received')

  res.status(200).json({ message: 'Success' })

  logger.info({ req, res }, 'API request completed')
}
```

## API Reference

### `httpSerializers`

Combined serializers object containing both request and response serializers.

```typescript
import { httpSerializers } from '@sylphx/cat-http'

const logger = createLogger({
  serializers: httpSerializers
})
```

**Includes:**
- `req` - Request serializer
- `request` - Alias for `req`
- `res` - Response serializer
- `response` - Alias for `res`

### `requestSerializer(req: any): SerializedRequest`

Serializes HTTP request objects.

**Extracts:**
- `method` - HTTP method (GET, POST, etc.)
- `url` - Request URL
- `headers` - HTTP headers (sensitive headers redacted)
- `query` - Query parameters (if available)
- `params` - Route parameters (if available)
- `remoteAddress` - Client IP address
- `remotePort` - Client port
- `protocol` - HTTP/HTTPS
- `httpVersion` - HTTP version

**Sensitive headers redacted:**
- `authorization`
- `cookie`
- `x-api-key`
- `x-auth-token`
- `x-csrf-token`
- `x-session-id`

### `responseSerializer(res: any): SerializedResponse`

Serializes HTTP response objects.

**Extracts:**
- `statusCode` - HTTP status code
- `statusMessage` - Status message
- `headers` - Response headers (sensitive headers redacted)

**Sensitive headers redacted:**
- `set-cookie`
- `authorization`
- `x-api-key`

## Framework Compatibility

### Express
```typescript
app.use((req, res, next) => {
  logger.info({ req }, 'Request received')
  res.on('finish', () => {
    logger.info({ req, res }, 'Request completed')
  })
  next()
})
```

### Fastify
```typescript
fastify.addHook('onRequest', (request, reply, done) => {
  logger.info({ req: request.raw }, 'Request received')
  done()
})
```

### Koa
```typescript
app.use(async (ctx, next) => {
  logger.info({ req: ctx.request }, 'Request received')
  await next()
  logger.info({ req: ctx.request, res: ctx.response }, 'Request completed')
})
```

### Node.js HTTP
```typescript
import { createServer } from 'http'

const server = createServer((req, res) => {
  logger.info({ req }, 'Request received')
  res.writeHead(200)
  res.end('Hello')
  logger.info({ req, res }, 'Request completed')
})
```

## Package Size

- **Minified:** ~2.2 KB
- **Minified + Gzipped:** 0.75 KB
- **No additional dependencies**

## Links

- [Main Documentation](https://cat.sylphx.com)
- [GitHub Repository](https://github.com/SylphxAI/cat)
- [npm Package](https://www.npmjs.com/package/@sylphx/cat-http)

## Related Packages

- [@sylphx/cat](../cat) - Core logger
- [@sylphx/cat-redaction](../cat-redaction) - Advanced PII redaction
- [@sylphx/cat-tracing](../cat-tracing) - Distributed tracing

## License

MIT © Kyle Zhu
