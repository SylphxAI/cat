# Security & Redaction Examples

PII and sensitive data protection.

## Complete Security Setup

```typescript
import { createLogger, redactionPlugin, autoSerializeErrors } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    autoSerializeErrors(),
    redactionPlugin({
      fields: [
        'password', 'token', 'apiKey', 'secret',
        '*.password', '**.token'
      ],
      redactPII: true,
      piiPatterns: ['creditCard', 'ssn', 'email', 'phone'],
      preventLogInjection: true
    })
  ]
})

// Automatically redacts sensitive data
logger.info('User login', {
  username: 'john',
  password: 'secret123', // → [REDACTED]
  email: 'john@example.com' // → [REDACTED] (PII)
})
```

## GDPR Compliance

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      redactPII: true,
      piiPatterns: ['email', 'phone', 'ipv4'],
      fields: ['userId', 'sessionId']
    })
  ]
})
```

## PCI-DSS Compliance

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      redactPII: true,
      piiPatterns: ['creditCard'],
      fields: ['cardNumber', 'cvv'],
      preventLogInjection: true
    })
  ]
})
```

## See Also

- [Redaction Guide](/guide/redaction)
- [Best Practices](/guide/best-practices)
