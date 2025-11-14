# @sylphx/cat-redaction

> OWASP-compliant redaction plugin for @sylphx/cat logger

[![npm version](https://img.shields.io/npm/v/@sylphx/cat-redaction.svg)](https://www.npmjs.com/package/@sylphx/cat-redaction)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**1.49 KB** • **OWASP 2024 compliant** • **PII detection** • **Log injection prevention**

## Installation

```bash
npm install @sylphx/cat @sylphx/cat-redaction
```

## Description

Automatically redacts sensitive data from logs to prevent data leaks and comply with security standards. Includes field-based redaction with glob patterns, built-in PII detection (credit cards, SSNs, emails, phones), and log injection attack prevention. Follows OWASP Top 10 2024 security guidelines.

## Usage Examples

### Basic Redaction

```typescript
import { createLogger } from '@sylphx/cat'
import { redactionPlugin } from '@sylphx/cat-redaction'

const logger = createLogger({
  plugins: [redactionPlugin()]
})

logger.info('User login', {
  username: 'alice',
  password: 'secret123',  // Will be redacted
  email: 'alice@example.com'
})
// {"level":"info","message":"User login","data":{"username":"alice","password":"[REDACTED]","email":"[REDACTED]"}}
```

### Custom Field Patterns

```typescript
import { redactionPlugin } from '@sylphx/cat-redaction'

const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: [
        'password',
        'apiKey',
        'creditCard',
        'user.ssn',           // Nested field
        '*.token',            // Glob pattern
        'auth.**'             // Match any nested field under auth
      ]
    })
  ]
})

logger.info('Payment processed', {
  user: { name: 'Alice', ssn: '123-45-6789' },
  auth: { token: 'abc123', secret: 'xyz789' }
})
// SSN, token, and secret are redacted
```

### PII Detection

```typescript
import { redactionPlugin } from '@sylphx/cat-redaction'

const logger = createLogger({
  plugins: [
    redactionPlugin({
      redactPII: true,
      piiPatterns: ['creditCard', 'ssn', 'email', 'phone', 'ipv4']
    })
  ]
})

logger.info('User submitted: 4532-1234-5678-9010 and ssn 123-45-6789')
// {"level":"info","message":"User submitted: [REDACTED] and ssn [REDACTED]"}

logger.info('Contact', {
  message: 'Call me at (555) 123-4567 or email test@example.com'
})
// Both phone and email redacted from message
```

### Exclude Fields from Redaction

```typescript
import { redactionPlugin } from '@sylphx/cat-redaction'

const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: ['*'],  // Redact all fields
      excludeFields: ['userId', 'timestamp', 'requestId']  // Except these
    })
  ]
})
```

## API Reference

### `redactionPlugin(options?: RedactionPluginOptions): Plugin`

Creates a redaction plugin instance.

**Options:**

- `enabled?: boolean` - Enable redaction (default: `true`)
- `fields?: string[]` - Field paths to redact with glob pattern support (default: common sensitive fields)
- `redactPII?: boolean` - Enable PII detection and redaction (default: `true`)
- `piiPatterns?: Array<'creditCard' | 'ssn' | 'email' | 'phone' | 'ipv4' | 'ipv6'>` - PII patterns to detect (default: `['creditCard', 'ssn', 'email', 'phone']`)
- `customPatterns?: Array<{ name: string, pattern: RegExp, replacement?: string }>` - Custom regex patterns
- `replacement?: string` - Redaction replacement text (default: `'[REDACTED]'`)
- `preventLogInjection?: boolean` - Prevent log injection attacks (default: `true`)
- `excludeFields?: string[]` - Fields to exclude from redaction

### Default Sensitive Fields

The following fields are redacted by default:

- `password`, `passwd`, `pwd`
- `secret`
- `token`
- `apiKey`, `api_key`
- `apiSecret`, `api_secret`
- `auth`, `authorization`
- `bearer`
- `cookie`
- `session`, `sessionId`, `session_id`
- `privateKey`, `private_key`
- `accessToken`, `access_token`
- `refreshToken`, `refresh_token`
- `csrfToken`, `csrf_token`

### Built-in PII Patterns

#### Credit Card
Detects major credit card formats (Visa, MasterCard, Amex, Discover):
```
4532-1234-5678-9010 → [REDACTED]
```

#### SSN (Social Security Number)
Detects US SSN format:
```
123-45-6789 → [REDACTED]
```

#### Email
Detects email addresses:
```
user@example.com → [REDACTED]
```

#### Phone
Detects US phone number formats:
```
(555) 123-4567 → [REDACTED]
555-123-4567 → [REDACTED]
+1-555-123-4567 → [REDACTED]
```

#### IPv4/IPv6
Detects IP addresses:
```
192.168.1.1 → [REDACTED]
2001:0db8:85a3::8a2e:0370:7334 → [REDACTED]
```

## Advanced Examples

### Custom Regex Patterns

```typescript
import { redactionPlugin } from '@sylphx/cat-redaction'

const logger = createLogger({
  plugins: [
    redactionPlugin({
      customPatterns: [
        {
          name: 'employeeId',
          pattern: /EMP-\d{6}/g,
          replacement: 'EMP-XXXXX'
        },
        {
          name: 'apiKey',
          pattern: /sk-[a-zA-Z0-9]{32}/g
        }
      ]
    })
  ]
})

logger.info('Employee EMP-123456 used key sk-abcdef1234567890abcdef1234567890')
// "Employee EMP-XXXXX used key [REDACTED]"
```

### Nested Object Redaction

```typescript
const logger = createLogger({
  plugins: [
    redactionPlugin({
      fields: ['user.password', 'payment.*.cardNumber']
    })
  ]
})

logger.info('Payment', {
  user: {
    id: 123,
    password: 'secret'  // Redacted
  },
  payment: {
    method: {
      cardNumber: '4532-1234-5678-9010'  // Redacted
    }
  }
})
```

### Log Injection Prevention

The plugin automatically sanitizes logs to prevent injection attacks:

```typescript
const logger = createLogger({
  plugins: [redactionPlugin({ preventLogInjection: true })]
})

// Malicious input with newlines and ANSI codes
const maliciousInput = 'Normal log\n\x1b[31mFAKE ERROR\x1b[0m'

logger.info(maliciousInput)
// "Normal log\\nFAKE ERROR" (newlines escaped, ANSI codes removed)
```

This prevents:
- Log forging via newline injection
- ANSI escape code injection
- Control character injection

## OWASP 2024 Compliance

This plugin helps meet OWASP Top 10 2024 requirements:

- **A01:2024 - Broken Access Control**: Prevents accidental logging of authentication tokens
- **A02:2024 - Cryptographic Failures**: Redacts sensitive data like passwords and keys
- **A03:2024 - Injection**: Prevents log injection attacks
- **A09:2024 - Security Logging Failures**: Ensures logs don't contain sensitive information

## Package Size

- **Minified:** ~4.5 KB
- **Minified + Gzipped:** 1.49 KB
- **No additional dependencies**

## Links

- [Main Documentation](https://cat.sylphx.com)
- [GitHub Repository](https://github.com/SylphxAI/cat)
- [npm Package](https://www.npmjs.com/package/@sylphx/cat-redaction)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Related Packages

- [@sylphx/cat](../cat) - Core logger
- [@sylphx/cat-http](../cat-http) - HTTP serializers with header redaction
- [@sylphx/cat-tracing](../cat-tracing) - Distributed tracing

## License

MIT © Kyle Zhu
