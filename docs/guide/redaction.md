# Redaction & Security

@sylphx/cat provides OWASP 2024 compliant redaction for sensitive data, PII detection, and log injection prevention.

## Overview

Logging sensitive data can lead to:
- PII exposure (credit cards, SSNs, emails)
- Security breaches (passwords, tokens, API keys)
- Compliance violations (GDPR, HIPAA, PCI-DSS)
- Log injection attacks (OWASP A09:2021)

The redaction plugin automatically protects against these risks.

## Basic Usage

```typescript
import { createLogger, redactionPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    redactionPlugin() // Uses default settings
  ]
})

logger.info('User login', {
  username: 'john',
  password: 'secret123' // → [REDACTED]
})
```

## Field-Based Redaction

### Default Sensitive Fields

The plugin automatically redacts common sensitive fields:

```typescript
const DEFAULT_FIELDS = [
  'password', 'passwd', 'pwd',
  'secret', 'token',
  'apiKey', 'api_key', 'apiSecret', 'api_secret',
  'auth', 'authorization', 'bearer',
  'cookie', 'session', 'sessionId', 'session_id',
  'privateKey', 'private_key',
  'accessToken', 'access_token',
  'refreshToken', 'refresh_token',
  'csrfToken', 'csrf_token'
]
```

### Custom Fields

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: [
        'password',
        'creditCard',
        'ssn',
        'bankAccount'
      ]
    })
  ]
})

logger.info('Payment processed', {
  amount: 100,
  creditCard: '4532-1234-5678-9010', // → [REDACTED]
  ssn: '123-45-6789' // → [REDACTED]
})
```

### Glob Patterns

Use glob patterns for flexible matching:

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: [
        'password',        // Exact match
        '*.password',      // One level deep: user.password
        '**.token',        // Any depth: auth.api.token
        'user.*.secret'    // Specific path: user.auth.secret
      ]
    })
  ]
})

logger.info('Complex data', {
  user: {
    profile: {
      password: 'secret123' // → [REDACTED] (*.password)
    },
    auth: {
      token: 'bearer-xyz' // → [REDACTED] (**.token)
    }
  },
  api: {
    credentials: {
      token: 'api-token-456' // → [REDACTED] (**.token)
    }
  }
})
```

## PII Detection

Automatically detect and redact personally identifiable information:

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      redactPII: true,
      piiPatterns: ['creditCard', 'ssn', 'email', 'phone', 'ipv4']
    })
  ]
})

logger.warn('Suspicious activity', {
  message: 'User 4532-1234-5678-9010 from 192.168.1.1',
  // → 'User [REDACTED] from [REDACTED]'

  contact: {
    email: 'user@example.com', // → [REDACTED]
    phone: '(555) 123-4567' // → [REDACTED]
  }
})
```

### Supported PII Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| `creditCard` | Credit card numbers (Visa, MC, Amex, Discover) | 4532-1234-5678-9010 |
| `ssn` | Social Security Number | 123-45-6789 |
| `email` | Email addresses | user@example.com |
| `phone` | Phone numbers (US format) | (555) 123-4567 |
| `ipv4` | IPv4 addresses | 192.168.1.1 |
| `ipv6` | IPv6 addresses | 2001:db8::1 |

### Custom PII Patterns

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      customPatterns: [
        {
          name: 'customerId',
          pattern: /CUST-\d{6}/g,
          replacement: '[CUSTOMER-ID]'
        },
        {
          name: 'orderId',
          pattern: /ORD-[A-Z0-9]{8}/g,
          replacement: '[ORDER-ID]'
        }
      ]
    })
  ]
})

logger.info('Order processed', {
  message: 'Customer CUST-123456 placed order ORD-ABC12345'
  // → 'Customer [CUSTOMER-ID] placed order [ORDER-ID]'
})
```

## Log Injection Prevention

OWASP A09:2021 - Security Logging and Monitoring Failures

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      preventLogInjection: true
    })
  ]
})

// Malicious input with newlines and ANSI codes
const userInput = "Admin\nERROR: System compromised\x1b[31mFAKE ERROR\x1b[0m"

logger.info('User input', { input: userInput })
// Output: input: 'Admin\\nERROR: System compromised\\x1b[31mFAKE ERROR\\x1b[0m'
// Newlines escaped, ANSI codes removed
```

**Protection against:**
- Newline injection (`\n`, `\r`)
- ANSI escape codes (`\x1b[...`)
- Log forging attacks
- Terminal exploitation

## Configuration

### Full Configuration

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      // Enable/disable plugin
      enabled: true,

      // Fields to redact (glob patterns supported)
      fields: ['password', '*.secret', '**.token'],

      // Enable PII detection
      redactPII: true,
      piiPatterns: ['creditCard', 'ssn', 'email', 'phone'],

      // Custom regex patterns
      customPatterns: [
        {
          name: 'apiKey',
          pattern: /sk-[a-zA-Z0-9]{48}/g,
          replacement: '[API-KEY]'
        }
      ],

      // Redaction replacement text
      replacement: '[REDACTED]',

      // Log injection prevention
      preventLogInjection: true,

      // Exclude specific fields from redaction
      excludeFields: ['system.password']
    })
  ]
})
```

### Environment-Based Configuration

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      // Only enable in production
      enabled: process.env.NODE_ENV === 'production',

      fields: ['password', 'token', 'secret'],
      redactPII: true
    })
  ]
})

// Development: shows actual values for debugging
// Production: redacts sensitive data
```

## Field Exclusions

Exclude specific fields from redaction:

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: ['password'],
      excludeFields: [
        'system.password',  // Don't redact system passwords
        'config.*.password' // Exclude config passwords
      ]
    })
  ]
})

logger.info('Configuration', {
  user: {
    password: 'secret123' // → [REDACTED]
  },
  system: {
    password: 'system-password' // → NOT redacted (excluded)
  },
  config: {
    db: {
      password: 'db-password' // → NOT redacted (excluded)
    }
  }
})
```

## HTTP Request/Response

Automatically redact sensitive headers:

```typescript
import { createLogger, requestSerializer, redactionPlugin } from '@sylphx/cat'

const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: ['authorization', 'cookie', 'set-cookie']
    })
  ]
})

const mockRequest = {
  method: 'POST',
  url: '/api/login',
  headers: {
    'content-type': 'application/json',
    'authorization': 'Bearer secret-token', // → [REDACTED]
    'cookie': 'session=abc123' // → [REDACTED]
  }
}

logger.info('HTTP request', {
  req: requestSerializer(mockRequest)
})
```

**Auto-redacted headers:**
- `authorization`
- `cookie`
- `set-cookie`
- `x-api-key`
- `x-auth-token`

## Production Setup

Complete security configuration:

```typescript
import { createLogger, redactionPlugin, consoleTransport } from '@sylphx/cat'

const logger = createLogger({
  transports: [consoleTransport()],
  plugins: [
    redactionPlugin({
      // Enable all security features
      enabled: true,

      // Comprehensive field list
      fields: [
        'password', 'passwd', 'pwd',
        'secret', 'token',
        'apiKey', 'api_key', 'apiSecret', 'api_secret',
        'auth', 'authorization', 'bearer',
        'cookie', 'session', 'sessionId', 'session_id',
        'privateKey', 'private_key',
        'accessToken', 'access_token',
        'refreshToken', 'refresh_token',
        '*.password', '*.token', '**.secret'
      ],

      // PII detection
      redactPII: true,
      piiPatterns: ['creditCard', 'ssn', 'email', 'phone', 'ipv4'],

      // Log injection prevention
      preventLogInjection: true,

      // Custom patterns for your domain
      customPatterns: [
        {
          name: 'internalId',
          pattern: /ID-\d{10}/g,
          replacement: '[INTERNAL-ID]'
        }
      ],

      // Clear redaction marker
      replacement: '[REDACTED]'
    })
  ]
})
```

## Compliance

### GDPR

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      redactPII: true,
      piiPatterns: ['email', 'phone', 'ipv4', 'ipv6'],
      fields: ['userId', 'sessionId']
    })
  ]
})

// Automatically redacts personal data
logger.info('User activity', {
  email: 'user@example.com', // → [REDACTED]
  ip: '192.168.1.1' // → [REDACTED]
})
```

### PCI-DSS

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      redactPII: true,
      piiPatterns: ['creditCard'],
      fields: ['cardNumber', 'cvv', 'expiryDate'],
      preventLogInjection: true
    })
  ]
})

// Compliant with PCI-DSS logging requirements
logger.info('Payment processed', {
  cardNumber: '4532-1234-5678-9010', // → [REDACTED]
  amount: 99.99 // Not redacted
})
```

### HIPAA

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      redactPII: true,
      piiPatterns: ['ssn', 'email', 'phone'],
      fields: ['medicalRecordNumber', 'patientId'],
      preventLogInjection: true
    })
  ]
})

// Protects protected health information (PHI)
logger.info('Patient record accessed', {
  patientId: 'P123456', // → [REDACTED]
  ssn: '123-45-6789' // → [REDACTED]
})
```

## Testing

```typescript
import { createLogger, redactionPlugin } from '@sylphx/cat'

describe('Redaction', () => {
  it('redacts passwords', () => {
    const logs: any[] = []
    const logger = createLogger({
      transports: [{
        log: (entry) => logs.push(entry)
      }],
      plugins: [redactionPlugin({ fields: ['password'] })]
    })

    logger.info('Login', { username: 'john', password: 'secret' })

    expect(logs[0].data.password).toBe('[REDACTED]')
    expect(logs[0].data.username).toBe('john')
  })

  it('detects credit cards', () => {
    const logs: any[] = []
    const logger = createLogger({
      transports: [{
        log: (entry) => logs.push(entry)
      }],
      plugins: [
        redactionPlugin({
          redactPII: true,
          piiPatterns: ['creditCard']
        })
      ]
    })

    logger.info('Payment', {
      message: 'Card 4532-1234-5678-9010 charged'
    })

    expect(logs[0].message).toContain('[REDACTED]')
    expect(logs[0].message).not.toContain('4532')
  })
})
```

## Performance

### Lazy Evaluation

Only redact when log level is enabled:

```typescript
// ✅ Good - no redaction overhead when filtered
const logger = createLogger({
  level: 'info',
  plugins: [redactionPlugin()]
})

logger.debug('Sensitive data', { password: 'secret' })
// Filtered before redaction
```

### Regex Optimization

```typescript
// ✅ Good - specific patterns
customPatterns: [
  { name: 'apiKey', pattern: /sk-[a-z0-9]{48}/g }
]

// ❌ Bad - overly broad
customPatterns: [
  { name: 'apiKey', pattern: /.*key.*/gi }
]
```

## Best Practices

### Always Enable in Production

```typescript
// ✅ Good
enabled: process.env.NODE_ENV === 'production'

// ❌ Bad
enabled: false // Sensitive data logged
```

### Use Comprehensive Field List

```typescript
// ✅ Good - covers many cases
fields: ['password', '*.password', '**.token', '*.secret']

// ❌ Bad - easy to miss fields
fields: ['password']
```

### Combine with Other Plugins

```typescript
const logger = createLogger({
  plugins: [
    contextPlugin({ app: 'my-app' }),
    tracingPlugin(),
    redactionPlugin({ /* ... */ }) // Redact last
  ]
})
```

## See Also

- [Error Serialization](/guide/error-serialization) - Error handling
- [Plugins](/guide/plugins) - Plugin system
- [Best Practices](/guide/best-practices) - Production patterns
- [API Reference](/api/plugins) - Plugin API
