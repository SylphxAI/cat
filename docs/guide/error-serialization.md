# Error Serialization

@sylphx/cat provides automatic error serialization with comprehensive stack traces, error causes, and metadata. Never lose error context in your logs.

## Overview

JavaScript Error objects don't serialize well with `JSON.stringify()`:

```typescript
const error = new Error('Something failed')

// ❌ Bad - loses stack trace
JSON.stringify({ error })
// {"error":{}}

// ✅ Good - preserves all error information
import { serializeError } from '@sylphx/cat'
JSON.stringify({ error: serializeError(error) })
// {"error":{"type":"Error","message":"Something failed","stack":"..."}}
```

## Automatic Error Serialization

### Auto-Serialize Plugin

Automatically detects and serializes Error objects:

```typescript
import { createLogger, autoSerializeErrors } from '@sylphx/cat'

const logger = createLogger({
  plugins: [autoSerializeErrors()]
})

// Errors are automatically serialized
logger.error('Request failed', {
  error: new Error('Connection timeout'),
  userId: '123'
})

// Output includes: type, message, stack, cause chain
```

**Output:**

```json
{
  "level": "error",
  "msg": "Request failed",
  "userId": "123",
  "error": {
    "type": "Error",
    "message": "Connection timeout",
    "stack": "Error: Connection timeout\n    at fetch (/app/api.js:42:15)\n    ..."
  }
}
```

## Manual Error Serialization

### serializeError Function

```typescript
import { serializeError } from '@sylphx/cat'

const error = new Error('Failed')
error.cause = new Error('Root cause')

const serialized = serializeError(error)

console.log(serialized)
// {
//   type: 'Error',
//   message: 'Failed',
//   stack: 'Error: Failed\n    at ...',
//   cause: {
//     type: 'Error',
//     message: 'Root cause',
//     stack: 'Error: Root cause\n    ...'
//   }
// }
```

### Serialized Error Structure

```typescript
interface SerializedError {
  type: string // Error constructor name
  message: string // Error message
  stack?: string // Stack trace
  cause?: SerializedError // Error cause chain
  [key: string]: unknown // Custom properties
}
```

## Error Cause Chains

Properly track error chains with `cause`:

```typescript
import { createLogger, autoSerializeErrors } from '@sylphx/cat'

const logger = createLogger({
  plugins: [autoSerializeErrors()]
})

async function fetchUser(userId: string) {
  try {
    return await db.query('SELECT * FROM users WHERE id = ?', [userId])
  } catch (err) {
    throw new Error(`Failed to fetch user ${userId}`, { cause: err })
  }
}

async function handleRequest(req) {
  try {
    const user = await fetchUser(req.userId)
    return user
  } catch (err) {
    logger.error('Request failed', { error: err })
    throw new Error('Request processing failed', { cause: err })
  }
}
```

**Output:**

```json
{
  "level": "error",
  "msg": "Request failed",
  "error": {
    "type": "Error",
    "message": "Failed to fetch user 123",
    "stack": "Error: Failed to fetch user 123\n    at fetchUser ...",
    "cause": {
      "type": "QueryError",
      "message": "Connection refused",
      "stack": "QueryError: Connection refused\n    at Database.query ..."
    }
  }
}
```

## Custom Error Properties

Preserve custom error properties:

```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

const error = new ValidationError('Invalid email', 'email', 'not-an-email')

logger.error('Validation failed', { error })

// Output includes custom properties
// {
//   "error": {
//     "type": "ValidationError",
//     "message": "Invalid email",
//     "stack": "...",
//     "field": "email",
//     "value": "not-an-email"
//   }
// }
```

## Request/Response Serializers

### Request Serializer

Safely serialize HTTP requests:

```typescript
import { createLogger, requestSerializer } from '@sylphx/cat'

const logger = createLogger()

app.use((req, res, next) => {
  logger.info('Incoming request', {
    req: requestSerializer(req)
  })
  next()
})
```

**Output:**

```json
{
  "req": {
    "method": "POST",
    "url": "/api/users",
    "headers": {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 ...",
      "authorization": "[REDACTED]"  // Auto-redacted
    },
    "remoteAddress": "192.168.1.1"
  }
}
```

**Auto-redacted headers:**
- `authorization`
- `cookie`
- `set-cookie`
- `x-api-key`
- `x-auth-token`

### Response Serializer

Serialize HTTP responses:

```typescript
import { responseSerializer } from '@sylphx/cat'

app.use((req, res, next) => {
  res.on('finish', () => {
    logger.info('Response sent', {
      req: requestSerializer(req),
      res: responseSerializer(res)
    })
  })
  next()
})
```

**Output:**

```json
{
  "res": {
    "statusCode": 200,
    "headers": {
      "content-type": "application/json",
      "content-length": "42",
      "set-cookie": "[REDACTED]"  // Auto-redacted
    }
  }
}
```

## Standard Serializers

Use standard Pino-compatible serializers:

```typescript
import { stdSerializers } from '@sylphx/cat'

// Error serializer
const serializedErr = stdSerializers.err(error)

// Request serializer
const serializedReq = stdSerializers.req(request)

// Response serializer
const serializedRes = stdSerializers.res(response)
```

### Custom Serializers

Create custom serializers for domain objects:

```typescript
import { createLogger } from '@sylphx/cat'

// Define serializers
const serializers = {
  user: (user: User) => ({
    id: user.id,
    username: user.username,
    email: user.email
    // Omit sensitive fields like password
  }),

  order: (order: Order) => ({
    id: order.id,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt.toISOString()
  })
}

// Apply manually
logger.info('User created order', {
  user: serializers.user(user),
  order: serializers.order(order)
})
```

## Integration with Plugins

### Combined with Redaction

```typescript
import {
  createLogger,
  autoSerializeErrors,
  redactionPlugin
} from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    // 1. Serialize errors first
    autoSerializeErrors(),

    // 2. Then redact sensitive data
    redactionPlugin({
      fields: ['password', 'token']
    })
  ]
})

const error = new Error('Auth failed')
;(error as any).password = 'secret123'

logger.error('Error occurred', { error })

// Output:
// {
//   "error": {
//     "type": "Error",
//     "message": "Auth failed",
//     "stack": "...",
//     "password": "[REDACTED]"  // Redacted after serialization
//   }
// }
```

## Error Handling Patterns

### Try-Catch with Context

```typescript
async function processOrder(orderId: string) {
  try {
    const order = await fetchOrder(orderId)
    await validateOrder(order)
    await chargeCustomer(order)
    await fulfillOrder(order)

    logger.info('Order processed', { orderId })
  } catch (error) {
    logger.error('Order processing failed', {
      error,
      orderId,
      stage: getCurrentStage()
    })
    throw error
  }
}
```

### Async Error Boundaries

```typescript
// Express error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err,
    req: requestSerializer(req)
  })

  res.status(500).json({ error: 'Internal server error' })
})

// Global error handler
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', { error })
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled rejection', {
    error: reason,
    promise: String(promise)
  })
})
```

### Structured Error Context

```typescript
class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApplicationError'
  }
}

try {
  throw new ApplicationError(
    'User not found',
    'USER_NOT_FOUND',
    404,
    { userId: '123' }
  )
} catch (error) {
  logger.error('Application error', { error })

  // Output includes code, statusCode, context
}
```

## Performance Considerations

### Lazy Serialization

Only serialize errors when needed:

```typescript
// ✅ Good - only serializes if error level is enabled
if (logger.isLevelEnabled('error')) {
  logger.error('Failed', { error: serializeError(largeError) })
}

// ❌ Bad - always serializes even if filtered
logger.error('Failed', { error: serializeError(largeError) })
```

### Stack Trace Limits

Control stack trace size:

```typescript
// Limit stack traces to reduce log size
Error.stackTraceLimit = 10 // Default: 10

// Or strip stack traces in production
const serializeErrorProd = (err: Error) => {
  const serialized = serializeError(err)
  if (process.env.NODE_ENV === 'production') {
    delete serialized.stack
  }
  return serialized
}
```

## Testing

```typescript
import { serializeError } from '@sylphx/cat'

describe('Error serialization', () => {
  it('serializes error with stack', () => {
    const error = new Error('Test error')
    const serialized = serializeError(error)

    expect(serialized.type).toBe('Error')
    expect(serialized.message).toBe('Test error')
    expect(serialized.stack).toContain('Error: Test error')
  })

  it('serializes error cause chain', () => {
    const rootError = new Error('Root cause')
    const error = new Error('Failed', { cause: rootError })
    const serialized = serializeError(error)

    expect(serialized.message).toBe('Failed')
    expect(serialized.cause).toBeDefined()
    expect(serialized.cause.message).toBe('Root cause')
  })

  it('preserves custom properties', () => {
    const error = new Error('Custom')
    ;(error as any).code = 'E_CUSTOM'

    const serialized = serializeError(error)
    expect(serialized.code).toBe('E_CUSTOM')
  })
})
```

## See Also

- [Plugins](/guide/plugins) - Plugin system
- [Redaction](/guide/redaction) - Security and PII
- [Best Practices](/guide/best-practices) - Production patterns
- [API Reference](/api/serializers) - Serializer API
