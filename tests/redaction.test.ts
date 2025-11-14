import { describe, expect, test } from "vitest"
import type { LogEntry } from "../src/core/types"
import { RedactionPlugin, redactionPlugin } from "../src/plugins/redaction"

describe("Redaction Plugin", () => {
	test("should redact sensitive fields by exact match", () => {
		const plugin = new RedactionPlugin()

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "User login",
			data: {
				username: "john",
				password: "secret123",
				email: "john@example.com",
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.username).toBe("john")
		expect(result.data?.password).toBe("[REDACTED]")
	})

	test("should redact nested sensitive fields", () => {
		const plugin = new RedactionPlugin()

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				user: {
					name: "john",
					password: "secret123",
					auth: {
						token: "abc123",
					},
				},
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.user).toEqual({
			name: "john",
			password: "[REDACTED]",
			auth: {
				token: "[REDACTED]",
			},
		})
	})

	test("should support glob patterns with *", () => {
		const plugin = new RedactionPlugin({
			fields: ["*.secret", "user.*.token"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				api: {
					secret: "key123",
				},
				user: {
					auth: {
						token: "abc123",
					},
				},
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.api).toEqual({ secret: "[REDACTED]" })
		expect(result.data?.user).toEqual({
			auth: {
				token: "[REDACTED]",
			},
		})
	})

	test("should support glob patterns with **", () => {
		const plugin = new RedactionPlugin({
			fields: ["**.password"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				user: {
					credentials: {
						password: "secret123",
					},
				},
				admin: {
					password: "admin456",
				},
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.user).toEqual({
			credentials: {
				password: "[REDACTED]",
			},
		})
		expect(result.data?.admin).toEqual({
			password: "[REDACTED]",
		})
	})

	test("should redact arrays of objects", () => {
		const plugin = new RedactionPlugin()

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				users: [
					{ name: "john", password: "secret1" },
					{ name: "jane", password: "secret2" },
				],
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.users).toEqual([
			{ name: "john", password: "[REDACTED]" },
			{ name: "jane", password: "[REDACTED]" },
		])
	})

	test("should redact arrays of strings with PII", () => {
		const plugin = new RedactionPlugin({
			redactPII: true,
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				emails: ["john@example.com", "jane@example.com"],
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.emails).toEqual(["[REDACTED]", "[REDACTED]"])
	})

	test("should redact credit card numbers", () => {
		const plugin = new RedactionPlugin({
			redactPII: true,
			piiPatterns: ["creditCard"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Payment with card 4532015112830366",
			data: {
				card: "5425233430109903",
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("Payment with card [REDACTED]")
		expect(result.data?.card).toBe("[REDACTED]")
	})

	test("should redact SSN (Social Security Numbers)", () => {
		const plugin = new RedactionPlugin({
			redactPII: true,
			piiPatterns: ["ssn"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "SSN: 123-45-6789",
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("SSN: [REDACTED]")
	})

	test("should redact email addresses", () => {
		const plugin = new RedactionPlugin({
			redactPII: true,
			piiPatterns: ["email"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Contact john.doe@example.com for details",
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("Contact [REDACTED] for details")
	})

	test("should redact phone numbers", () => {
		const plugin = new RedactionPlugin({
			redactPII: true,
			piiPatterns: ["phone"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Call (555) 123-4567",
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("Call [REDACTED]")
	})

	test("should redact IPv4 addresses", () => {
		const plugin = new RedactionPlugin({
			redactPII: true,
			piiPatterns: ["ipv4"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Request from 192.168.1.100",
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("Request from [REDACTED]")
	})

	test("should redact IPv6 addresses", () => {
		const plugin = new RedactionPlugin({
			redactPII: true,
			piiPatterns: ["ipv6"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Request from 2001:0db8:85a3:0000:0000:8a2e:0370:7334",
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("Request from [REDACTED]")
	})

	test("should support custom patterns", () => {
		const plugin = new RedactionPlugin({
			customPatterns: [
				{
					name: "customId",
					pattern: /ID-\d{6}/g,
					replacement: "[ID-REDACTED]",
				},
			],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Processing ID-123456",
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("Processing [ID-REDACTED]")
	})

	test("should prevent log injection (newlines)", () => {
		const plugin = new RedactionPlugin({
			preventLogInjection: true,
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "User input\nINFO: Fake log entry",
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("User input\\nINFO: Fake log entry")
	})

	test("should prevent log injection (ANSI codes)", () => {
		const plugin = new RedactionPlugin({
			preventLogInjection: true,
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "User input \x1b[31mRED\x1b[0m",
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("User input RED")
	})

	test("should prevent log injection (control characters)", () => {
		const plugin = new RedactionPlugin({
			preventLogInjection: true,
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test\x00\x01\x02",
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("Test")
	})

	test("should exclude specified fields from redaction", () => {
		const plugin = new RedactionPlugin({
			fields: ["password"],
			excludeFields: ["user.password"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				password: "secret1",
				user: {
					password: "secret2",
				},
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.password).toBe("[REDACTED]")
		expect(result.data?.user).toEqual({
			password: "secret2", // Not redacted due to exclusion
		})
	})

	test("should use custom replacement text", () => {
		const plugin = new RedactionPlugin({
			replacement: "***",
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				password: "secret123",
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.password).toBe("***")
	})

	test("should be disabled when enabled is false", () => {
		const plugin = new RedactionPlugin({
			enabled: false,
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				password: "secret123",
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.password).toBe("secret123")
	})

	test("should redact context fields", () => {
		const plugin = new RedactionPlugin()

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			context: {
				user: "john",
				token: "abc123",
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.context?.user).toBe("john")
		expect(result.context?.token).toBe("[REDACTED]")
	})

	test("should handle multiple PII patterns", () => {
		const plugin = new RedactionPlugin({
			redactPII: true,
			piiPatterns: ["creditCard", "ssn", "email"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Card: 4532015112830366, SSN: 123-45-6789, Email: test@example.com",
		}

		const result = plugin.onLog!(entry)

		expect(result.message).toBe("Card: [REDACTED], SSN: [REDACTED], Email: [REDACTED]")
	})

	test("should preserve non-sensitive data", () => {
		const plugin = new RedactionPlugin()

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "User login successful",
			data: {
				username: "john",
				email: "john@example.com",
				loginTime: 1234567890,
				success: true,
				metadata: {
					ip: "192.168.1.1",
					userAgent: "Mozilla/5.0",
				},
			},
		}

		const result = plugin.onLog!(entry)

		// These should NOT be redacted
		expect(result.data?.username).toBe("john")
		expect(result.data?.loginTime).toBe(1234567890)
		expect(result.data?.success).toBe(true)
		expect(result.data?.metadata).toEqual({
			ip: "192.168.1.1",
			userAgent: "Mozilla/5.0",
		})
	})

	test("redactionPlugin factory should create plugin", () => {
		const plugin = redactionPlugin({
			fields: ["custom"],
		})

		expect(plugin).toBeInstanceOf(RedactionPlugin)
		expect(plugin.name).toBe("redaction")
	})

	test("should handle null and undefined values", () => {
		const plugin = new RedactionPlugin()

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				value1: null,
				value2: undefined,
				password: "secret",
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.value1).toBe(null)
		expect(result.data?.value2).toBe(undefined)
		expect(result.data?.password).toBe("[REDACTED]")
	})

	test("should redact case-insensitive field names", () => {
		const plugin = new RedactionPlugin({
			fields: ["password", "apiKey", "api_key"],
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				Password: "secret1", // Won't match (case-sensitive by default)
				password: "secret2", // Will match
				apiKey: "key1", // Will match
				api_key: "key2", // Will match
			},
		}

		const result = plugin.onLog!(entry)

		expect(result.data?.Password).toBe("secret1") // Not redacted
		expect(result.data?.password).toBe("[REDACTED]")
		expect(result.data?.apiKey).toBe("[REDACTED]")
		expect(result.data?.api_key).toBe("[REDACTED]")
	})
})
