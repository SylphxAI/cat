import { describe, expect, it } from "bun:test"
import { RedactionPlugin, redactionPlugin } from "../redaction"
import type { LogEntry } from "@sylphx/cat"

describe("Redaction Plugin", () => {
	describe("redactionPlugin factory", () => {
		it("should create RedactionPlugin instance", () => {
			const plugin = redactionPlugin()
			expect(plugin).toBeInstanceOf(RedactionPlugin)
		})

		it("should accept options", () => {
			const plugin = redactionPlugin({ enabled: false })
			expect(plugin).toBeInstanceOf(RedactionPlugin)
		})
	})

	describe("sensitive field redaction", () => {
		it("should redact password field", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "user login",
				timestamp: Date.now(),
				data: {
					username: "john",
					password: "secret123",
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.username).toBe("john")
			expect(redacted.data?.password).toBe("[REDACTED]")
		})

		it("should redact multiple sensitive fields", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "api call",
				timestamp: Date.now(),
				data: {
					apiKey: "key123",
					token: "token456",
					secret: "secret789",
					normalData: "visible",
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.apiKey).toBe("[REDACTED]")
			expect(redacted.data?.token).toBe("[REDACTED]")
			expect(redacted.data?.secret).toBe("[REDACTED]")
			expect(redacted.data?.normalData).toBe("visible")
		})

		it("should redact nested fields", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					user: {
						username: "john",
						password: "secret",
					},
				},
			}

			const redacted = plugin.onLog(entry)

			const user = redacted.data?.user as any
			expect(user.username).toBe("john")
			expect(user.password).toBe("[REDACTED]")
		})

		it("should redact fields in arrays", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					users: [
						{ name: "alice", password: "pass1" },
						{ name: "bob", password: "pass2" },
					],
				},
			}

			const redacted = plugin.onLog(entry)

			const users = redacted.data?.users as any[]
			expect(users[0].name).toBe("alice")
			expect(users[0].password).toBe("[REDACTED]")
			expect(users[1].name).toBe("bob")
			expect(users[1].password).toBe("[REDACTED]")
		})

		it("should support custom sensitive fields", () => {
			const plugin = new RedactionPlugin({
				fields: ["customSecret", "internalKey"],
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					customSecret: "secret",
					internalKey: "key",
					password: "should-not-redact",
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.customSecret).toBe("[REDACTED]")
			expect(redacted.data?.internalKey).toBe("[REDACTED]")
			expect(redacted.data?.password).toBe("should-not-redact")
		})

		it("should support custom replacement text", () => {
			const plugin = new RedactionPlugin({
				replacement: "***",
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					password: "secret",
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.password).toBe("***")
		})
	})

	describe("PII redaction", () => {
		it("should redact credit card numbers", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "Card: 4532015112830366 processed",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).not.toContain("4532015112830366")
			expect(redacted.message).toContain("[REDACTED]")
		})

		it("should redact SSN", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "SSN: 123-45-6789",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).not.toContain("123-45-6789")
			expect(redacted.message).toContain("[REDACTED]")
		})

		it("should redact email addresses", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "Email sent to user@example.com",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).not.toContain("user@example.com")
			expect(redacted.message).toContain("[REDACTED]")
		})

		it("should redact phone numbers", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "Call (555) 123-4567",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).not.toContain("(555) 123-4567")
			expect(redacted.message).toContain("[REDACTED]")
		})

		it("should redact IPv4 addresses", () => {
			const plugin = new RedactionPlugin({
				piiPatterns: ["ipv4"],
			})

			const entry: LogEntry = {
				level: "info",
				message: "Request from 192.168.1.100",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).not.toContain("192.168.1.100")
			expect(redacted.message).toContain("[REDACTED]")
		})

		it("should allow disabling PII redaction", () => {
			const plugin = new RedactionPlugin({
				redactPII: false,
			})

			const entry: LogEntry = {
				level: "info",
				message: "Email: test@example.com",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).toContain("test@example.com")
		})

		it("should support custom PII patterns", () => {
			const plugin = new RedactionPlugin({
				piiPatterns: ["email"], // Only email
			})

			const entry: LogEntry = {
				level: "info",
				message: "Email: test@example.com, Card: 4532015112830366",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).not.toContain("test@example.com")
			expect(redacted.message).toContain("4532015112830366") // Not redacted
		})

		it("should redact PII in data fields", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					email: "user@example.com",
					note: "Contact at test@domain.com",
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.email).not.toContain("@")
			expect(redacted.data?.note).not.toContain("test@domain.com")
		})
	})

	describe("custom patterns", () => {
		it("should support custom regex patterns", () => {
			const plugin = new RedactionPlugin({
				customPatterns: [
					{
						name: "uuid",
						pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
					},
				],
			})

			const entry: LogEntry = {
				level: "info",
				message: "UUID: 550e8400-e29b-41d4-a716-446655440000",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).not.toContain("550e8400-e29b-41d4-a716-446655440000")
			expect(redacted.message).toContain("[REDACTED]")
		})

		it("should support custom replacement for patterns", () => {
			const plugin = new RedactionPlugin({
				customPatterns: [
					{
						name: "id",
						pattern: /ID:\s*\d+/g,
						replacement: "ID: XXX",
					},
				],
			})

			const entry: LogEntry = {
				level: "info",
				message: "User ID: 12345",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).toBe("User ID: XXX")
		})
	})

	describe("log injection prevention", () => {
		it("should escape newlines", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "Line 1\nLine 2",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).not.toContain("\n")
			expect(redacted.message).toContain("\\n")
		})

		it("should escape carriage returns", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "Line 1\rLine 2",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).not.toContain("\r")
			expect(redacted.message).toContain("\\r")
		})

		it("should remove ANSI escape codes", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "\x1b[31mRed text\x1b[0m",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).not.toContain("\x1b[")
			expect(redacted.message).toBe("Red text")
		})

		it("should remove control characters", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "Text\x00with\x01control\x02chars",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).toBe("Textwithcontrolchars")
		})

		it("should allow disabling log injection prevention", () => {
			const plugin = new RedactionPlugin({
				preventLogInjection: false,
			})

			const entry: LogEntry = {
				level: "info",
				message: "Line 1\nLine 2",
				timestamp: Date.now(),
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).toContain("\n")
		})
	})

	describe("exclude fields", () => {
		it("should exclude specified fields from redaction", () => {
			const plugin = new RedactionPlugin({
				excludeFields: ["user.password"],
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					user: {
						password: "should-not-redact",
					},
					password: "should-redact",
				},
			}

			const redacted = plugin.onLog(entry)

			const user = redacted.data?.user as any
			expect(user.password).toBe("should-not-redact")
			expect(redacted.data?.password).toBe("[REDACTED]")
		})
	})

	describe("glob pattern matching", () => {
		it("should support exact match", () => {
			const plugin = new RedactionPlugin({
				fields: ["secret"],
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					secret: "value",
					notSecret: "visible",
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.secret).toBe("[REDACTED]")
			expect(redacted.data?.notSecret).toBe("visible")
		})

		it("should support * wildcard", () => {
			const plugin = new RedactionPlugin({
				fields: ["api*"],
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					apiKey: "key",
					apiSecret: "secret",
					notApi: "visible",
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.apiKey).toBe("[REDACTED]")
			expect(redacted.data?.apiSecret).toBe("[REDACTED]")
			expect(redacted.data?.notApi).toBe("visible")
		})
	})

	describe("context redaction", () => {
		it("should redact context fields", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				context: {
					user: "john",
					token: "secret-token",
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.context?.user).toBe("john")
			expect(redacted.context?.token).toBe("[REDACTED]")
		})
	})

	describe("disabled plugin", () => {
		it("should not redact when disabled", () => {
			const plugin = new RedactionPlugin({ enabled: false })
			const entry: LogEntry = {
				level: "info",
				message: "Password: secret123",
				timestamp: Date.now(),
				data: {
					password: "secret",
					email: "test@example.com",
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.message).toBe("Password: secret123")
			expect(redacted.data?.password).toBe("secret")
			expect(redacted.data?.email).toBe("test@example.com")
		})
	})

	describe("edge cases", () => {
		it("should handle null values", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					value: null,
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.value).toBeNull()
		})

		it("should handle undefined values", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					value: undefined,
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.value).toBeUndefined()
		})

		it("should handle numbers", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					count: 42,
					price: 3.14,
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.count).toBe(42)
			expect(redacted.data?.price).toBe(3.14)
		})

		it("should handle booleans", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					isActive: true,
					isDeleted: false,
				},
			}

			const redacted = plugin.onLog(entry)

			expect(redacted.data?.isActive).toBe(true)
			expect(redacted.data?.isDeleted).toBe(false)
		})

		it("should not mutate original entry", () => {
			const plugin = new RedactionPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test@example.com",
				timestamp: Date.now(),
				data: {
					password: "secret",
				},
			}

			const redacted = plugin.onLog(entry)

			expect(entry.message).toBe("test@example.com")
			expect(entry.data?.password).toBe("secret")
			expect(redacted.message).not.toBe("test@example.com")
			expect(redacted.data?.password).toBe("[REDACTED]")
		})
	})
})
