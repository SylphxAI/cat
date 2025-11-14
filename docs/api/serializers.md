# Serializers API

Serializers convert complex objects to loggable formats.

## Error Serializer

### serializeError

```typescript
function serializeError(error: Error): SerializedError
```

Serializes Error objects with stack traces and cause chains.

```typescript
interface SerializedError {
  type: string // Error constructor name
  message: string // Error message
  stack?: string // Stack trace
  cause?: SerializedError // Error cause chain
  [key: string]: unknown // Custom properties
}
```

```typescript
import { serializeError } from '@sylphx/cat'

const error = new Error('Failed')
error.cause = new Error('Root cause')

const serialized = serializeError(error)
// {
//   type: 'Error',
//   message: 'Failed',
//   stack: 'Error: Failed\n    at ...',
//   cause: { type: 'Error', message: 'Root cause', ... }
// }
```

### autoSerializeErrors

```typescript
function autoSerializeErrors(): Plugin
```

Plugin that automatically serializes Error objects.

```typescript
import { autoSerializeErrors } from '@sylphx/cat'

const logger = createLogger({
  plugins: [autoSerializeErrors()]
})

logger.error('Failed', { error: new Error('Boom') })
// Error is automatically serialized
```

## Request/Response Serializers

### requestSerializer

```typescript
function requestSerializer(req: any): SerializedRequest
```

Serializes HTTP requests (auto-redacts sensitive headers).

```typescript
import { requestSerializer } from '@sylphx/cat'

logger.info('Request', {
  req: requestSerializer(req)
})
```

### responseSerializer

```typescript
function responseSerializer(res: any): SerializedResponse
```

Serializes HTTP responses (auto-redacts sensitive headers).

```typescript
import { responseSerializer } from '@sylphx/cat'

logger.info('Response', {
  res: responseSerializer(res)
})
```

## Standard Serializers

### stdSerializers

```typescript
const stdSerializers: {
  err: (error: Error) => SerializedError
  req: (req: any) => SerializedRequest
  res: (res: any) => SerializedResponse
}
```

Pino-compatible serializers.

```typescript
import { stdSerializers } from '@sylphx/cat'

logger.error('Failed', {
  err: stdSerializers.err(error),
  req: stdSerializers.req(request)
})
```

## See Also

- [Logger API](/api/logger)
- [Error Serialization Guide](/guide/error-serialization)
