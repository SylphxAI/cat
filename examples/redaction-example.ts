/**
 * Redaction Plugin Example
 *
 * Demonstrates how to automatically redact sensitive data from logs
 * following OWASP 2024 security best practices.
 *
 * Features:
 * - Field-based redaction (passwords, tokens, etc.)
 * - PII detection (credit cards, SSNs, emails, phone numbers)
 * - Glob pattern matching
 * - Log injection prevention
 * - Custom redaction patterns
 */

import { createLogger } from "../src/core/logger"
import { prettyFormatter } from "../src/formatters/pretty"
import { consoleTransport } from "../src/transports/console"
import { redactionPlugin } from "../src/plugins/redaction"

// Example 1: Basic field redaction
const basicLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			// Default: redacts common sensitive fields
			// fields: ['password', 'token', 'secret', 'apiKey', etc.]
		}),
	],
})

basicLogger.info("User login", {
	username: "john",
	password: "secret123", // Will be redacted
	email: "john@example.com",
})
// Output: { username: 'john', password: '[REDACTED]', email: 'john@example.com' }

// Example 2: Custom field patterns
const customFieldLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			fields: ["password", "ssn", "creditCard", "*.secret"],
		}),
	],
})

customFieldLogger.info("Payment processed", {
	amount: 100,
	creditCard: "4532-1234-5678-9010", // Redacted
	user: {
		name: "Jane",
		ssn: "123-45-6789", // Redacted
	},
	config: {
		secret: "api-key-123", // Redacted (matches *.secret)
	},
})

// Example 3: Glob patterns for nested paths
const nestedLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			fields: [
				"password", // Exact match
				"*.password", // Any password field one level deep
				"**.token", // Any token field at any depth
				"user.*.secret", // Secret fields under user.*
			],
		}),
	],
})

nestedLogger.info("Complex data", {
	user: {
		profile: {
			password: "secret123", // Redacted (*.password)
		},
		auth: {
			token: "bearer-xyz", // Redacted (**.token)
			secret: "key-123", // Redacted (user.*.secret)
		},
	},
	api: {
		credentials: {
			token: "api-token-456", // Redacted (**.token)
		},
	},
})

// Example 4: PII detection
const piiLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			redactPII: true,
			piiPatterns: ["creditCard", "ssn", "email", "phone"],
		}),
	],
})

piiLogger.warn("Suspicious activity detected", {
	message: "User 4532-1234-5678-9010 attempted login from 192.168.1.1",
	// Credit card number will be redacted from the message
	contactInfo: {
		email: "attacker@evil.com", // Redacted
		phone: "(555) 123-4567", // Redacted
	},
})

// Example 5: Log injection prevention (OWASP compliance)
const secureLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			preventLogInjection: true,
		}),
	],
})

// Malicious input with newlines and ANSI codes
const userInput = "Admin\nERROR: System compromised\x1b[31mFAKE ERROR\x1b[0m"

secureLogger.info("User input received", {
	input: userInput,
})
// Output: input: 'Admin\\nERROR: System compromised\\x1b[31mFAKE ERROR\\x1b[0m'
// Newlines are escaped, ANSI codes are removed

// Example 6: Custom regex patterns
const customPatternLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			customPatterns: [
				{
					name: "customerId",
					pattern: /CUST-\d{6}/g,
					replacement: "[CUSTOMER-ID]",
				},
				{
					name: "orderId",
					pattern: /ORD-[A-Z0-9]{8}/g,
					replacement: "[ORDER-ID]",
				},
			],
		}),
	],
})

customPatternLogger.info("Order processed", {
	message: "Customer CUST-123456 placed order ORD-ABC12345",
	// Will become: "Customer [CUSTOMER-ID] placed order [ORDER-ID]"
})

// Example 7: Exclude fields from redaction
const excludeLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			fields: ["password"],
			excludeFields: ["system.password"], // Don't redact this specific path
		}),
	],
})

excludeLogger.info("Configuration", {
	user: {
		password: "secret123", // Redacted
	},
	system: {
		password: "system-password", // NOT redacted (excluded)
	},
})

// Example 8: Custom replacement text
const customReplacementLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			replacement: "***",
		}),
	],
})

customReplacementLogger.info("Login attempt", {
	username: "admin",
	password: "secret", // Will show as: ***
})

// Example 9: Complete security setup
const productionLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			// Enable all security features
			enabled: true,

			// Redact sensitive fields
			fields: [
				"password",
				"passwd",
				"pwd",
				"secret",
				"token",
				"apiKey",
				"api_key",
				"apiSecret",
				"api_secret",
				"auth",
				"authorization",
				"bearer",
				"cookie",
				"session",
				"sessionId",
				"session_id",
				"privateKey",
				"private_key",
				"accessToken",
				"access_token",
				"refreshToken",
				"refresh_token",
				"*.password",
				"*.token",
				"**.secret",
			],

			// Enable PII detection
			redactPII: true,
			piiPatterns: ["creditCard", "ssn", "email", "phone", "ipv4"],

			// Prevent log injection attacks
			preventLogInjection: true,

			// Custom patterns for your domain
			customPatterns: [
				{
					name: "internalId",
					pattern: /ID-\d{10}/g,
					replacement: "[INTERNAL-ID]",
				},
			],

			// Use clear redaction marker
			replacement: "[REDACTED]",
		}),
	],
})

productionLogger.info("Production log with full security", {
	user: {
		username: "admin",
		password: "super-secret", // Redacted
		email: "admin@company.com", // Redacted (PII)
	},
	payment: {
		cardNumber: "4532-1234-5678-9010", // Redacted (PII)
		amount: 99.99,
	},
	api: {
		token: "bearer-xyz-123", // Redacted
	},
	internalRef: "ID-1234567890", // Redacted (custom pattern)
})

// Example 10: Conditional redaction based on environment
const environmentLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			// Only enable in production
			enabled: process.env.NODE_ENV === "production",
			fields: ["password", "token", "secret"],
		}),
	],
})

// In development: shows actual values
// In production: redacts sensitive data
environmentLogger.info("Debug info", {
	apiKey: "dev-key-123",
})

// Example 11: Working with HTTP request/response
import { requestSerializer, responseSerializer } from "../src/serializers/index"

const httpLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			fields: [
				"password",
				"authorization", // HTTP headers
				"cookie",
				"set-cookie",
			],
		}),
	],
})

// The serializers already redact sensitive headers
const mockRequest = {
	method: "POST",
	url: "/api/login",
	headers: {
		"content-type": "application/json",
		authorization: "Bearer secret-token", // Will be redacted by serializer
	},
	body: {
		username: "admin",
		password: "secret123", // Will be redacted by plugin
	},
}

httpLogger.info("HTTP request", {
	req: requestSerializer(mockRequest),
	body: mockRequest.body,
})

// Example 12: Performance optimization - disable for development
const devLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		redactionPlugin({
			enabled: process.env.NODE_ENV === "production",
			// No redaction overhead in development
		}),
	],
})

// Example 13: Combining with other plugins
import { contextPlugin } from "../src/plugins/context"
import { tracingPlugin } from "../src/plugins/tracing"

const combinedLogger = createLogger({
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
	plugins: [
		// Add request context
		contextPlugin({
			requestId: "req-123",
			userId: "user-456",
		}),

		// Add distributed tracing
		tracingPlugin(),

		// Redact sensitive data (runs after other plugins)
		redactionPlugin({
			fields: ["password", "token"],
			redactPII: true,
		}),
	],
})

combinedLogger.info("Complete example", {
	action: "user-login",
	username: "john",
	password: "secret", // Redacted
	email: "john@example.com", // Redacted (PII)
})
// Output includes: requestId, userId, traceId, spanId, and redacted fields

console.log("\n✅ Redaction examples completed!")
console.log("\nSecurity features demonstrated:")
console.log("- Field-based redaction with glob patterns")
console.log("- PII detection (credit cards, SSNs, emails, phones)")
console.log("- Log injection prevention (OWASP 2024)")
console.log("- Custom regex patterns")
console.log("- Field exclusions")
console.log("- Production-ready configuration")
