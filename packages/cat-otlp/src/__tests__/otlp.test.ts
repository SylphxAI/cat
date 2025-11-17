import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test"
import { OTLPTransport, otlpTransport } from "../otlp"
import type { LogEntry } from "@sylphx/cat"

describe("OTLP Transport", () => {
	let originalFetch: typeof global.fetch

	beforeEach(() => {
		originalFetch = global.fetch
	})

	afterEach(() => {
		global.fetch = originalFetch
	})

	describe("otlpTransport factory", () => {
		it("should create OTLPTransport instance", () => {
			const transport = otlpTransport()
			expect(transport).toBeInstanceOf(OTLPTransport)
		})

		it("should accept options", () => {
			const transport = otlpTransport({
				endpoint: "https://custom-endpoint.com/v1/logs",
				batch: false,
			})
			expect(transport).toBeInstanceOf(OTLPTransport)
		})
	})

	describe("configuration", () => {
		it("should use default endpoint", () => {
			const transport = new OTLPTransport()
			// Default endpoint is http://localhost:4318/v1/logs
			expect(transport).toBeDefined()
		})

		it("should use custom endpoint", () => {
			const transport = new OTLPTransport({
				endpoint: "https://api.example.com/otlp/v1/logs",
			})
			expect(transport).toBeDefined()
		})

		it("should use default batch settings", () => {
			const transport = new OTLPTransport()
			expect(transport).toBeDefined()
		})

		it("should use custom batch settings", () => {
			const transport = new OTLPTransport({
				batch: true,
				batchSize: 50,
				batchInterval: 500,
			})
			expect(transport).toBeDefined()
		})
	})

	describe("log", () => {
		it("should convert log entry to OTLP format", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({ batch: false })
			const entry: LogEntry = {
				level: "info",
				message: "test message",
				timestamp: 1234567890,
			}

			transport.log(entry, "formatted")

			// Wait for async send
			await new Promise((resolve) => setTimeout(resolve, 50))

			expect(mockFetch).toHaveBeenCalled()
			const [url, options] = mockFetch.mock.calls[0]

			expect(url).toBe("http://localhost:4318/v1/logs")
			expect(options.method).toBe("POST")

			const body = JSON.parse(options.body)
			const logRecord = body.resourceLogs[0].scopeLogs[0].logRecords[0]

			expect(logRecord.severityText).toBe("INFO")
			expect(logRecord.body.stringValue).toBe("test message")
		})

		it("should batch logs", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({
				batch: true,
				batchSize: 3,
				batchInterval: 10000,
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted")
			transport.log(entry, "formatted")

			// Should not send yet
			expect(mockFetch).not.toHaveBeenCalled()

			transport.log(entry, "formatted")

			// Should send batch of 3
			await new Promise((resolve) => setTimeout(resolve, 50))
			expect(mockFetch).toHaveBeenCalledTimes(1)

			const body = JSON.parse(mockFetch.mock.calls[0][1].body)
			expect(body.resourceLogs[0].scopeLogs[0].logRecords).toHaveLength(3)
		})

		it("should send immediately when batch is disabled", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({ batch: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted")

			await new Promise((resolve) => setTimeout(resolve, 50))
			expect(mockFetch).toHaveBeenCalledTimes(1)
		})
	})

	describe("severity mapping", () => {
		const severityTests = [
			{ level: "trace" as const, number: 1, text: "TRACE" },
			{ level: "debug" as const, number: 5, text: "DEBUG" },
			{ level: "info" as const, number: 9, text: "INFO" },
			{ level: "warn" as const, number: 13, text: "WARN" },
			{ level: "error" as const, number: 17, text: "ERROR" },
			{ level: "fatal" as const, number: 21, text: "FATAL" },
		]

		for (const { level, number, text } of severityTests) {
			it(`should map ${level} to severity ${number}`, async () => {
				const mockFetch = mock(async () =>
					Response.json({ status: "ok" }, { status: 200 }),
				)
				global.fetch = mockFetch as any

				const transport = new OTLPTransport({ batch: false })
				const entry: LogEntry = {
					level,
					message: "test",
					timestamp: Date.now(),
				}

				transport.log(entry, "formatted")
				await new Promise((resolve) => setTimeout(resolve, 50))

				const body = JSON.parse(mockFetch.mock.calls[0][1].body)
				const logRecord = body.resourceLogs[0].scopeLogs[0].logRecords[0]

				expect(logRecord.severityNumber).toBe(number)
				expect(logRecord.severityText).toBe(text)
			})
		}
	})

	describe("attributes", () => {
		it("should include data as attributes", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({ batch: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					userId: 123,
					action: "login",
					success: true,
				},
			}

			transport.log(entry, "formatted")
			await new Promise((resolve) => setTimeout(resolve, 50))

			const body = JSON.parse(mockFetch.mock.calls[0][1].body)
			const logRecord = body.resourceLogs[0].scopeLogs[0].logRecords[0]

			expect(logRecord.attributes).toBeDefined()
			expect(logRecord.attributes.length).toBe(3)

			const userIdAttr = logRecord.attributes.find((a: any) => a.key === "userId")
			expect(userIdAttr.value.intValue).toBe("123")

			const actionAttr = logRecord.attributes.find((a: any) => a.key === "action")
			expect(actionAttr.value.stringValue).toBe("login")

			const successAttr = logRecord.attributes.find(
				(a: any) => a.key === "success",
			)
			expect(successAttr.value.boolValue).toBe(true)
		})

		it("should include context as attributes", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({ batch: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				context: {
					service: "api",
					version: "1.0",
				},
			}

			transport.log(entry, "formatted")
			await new Promise((resolve) => setTimeout(resolve, 50))

			const body = JSON.parse(mockFetch.mock.calls[0][1].body)
			const logRecord = body.resourceLogs[0].scopeLogs[0].logRecords[0]

			const serviceAttr = logRecord.attributes.find(
				(a: any) => a.key === "service",
			)
			expect(serviceAttr.value.stringValue).toBe("api")

			const versionAttr = logRecord.attributes.find(
				(a: any) => a.key === "version",
			)
			expect(versionAttr.value.stringValue).toBe("1.0")
		})

		it("should handle different value types", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({ batch: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {
					stringValue: "text",
					intValue: 42,
					floatValue: 3.14,
					boolValue: false,
					objectValue: { nested: "value" },
				},
			}

			transport.log(entry, "formatted")
			await new Promise((resolve) => setTimeout(resolve, 50))

			const body = JSON.parse(mockFetch.mock.calls[0][1].body)
			const attrs = body.resourceLogs[0].scopeLogs[0].logRecords[0].attributes

			const stringAttr = attrs.find((a: any) => a.key === "stringValue")
			expect(stringAttr.value.stringValue).toBe("text")

			const intAttr = attrs.find((a: any) => a.key === "intValue")
			expect(intAttr.value.intValue).toBe("42")

			const floatAttr = attrs.find((a: any) => a.key === "floatValue")
			expect(floatAttr.value.doubleValue).toBe(3.14)

			const boolAttr = attrs.find((a: any) => a.key === "boolValue")
			expect(boolAttr.value.boolValue).toBe(false)

			const objAttr = attrs.find((a: any) => a.key === "objectValue")
			expect(objAttr.value.stringValue).toBe('{"nested":"value"}')
		})
	})

	describe("trace context", () => {
		it("should include trace context when present", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({ batch: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				traceId: "abc123def456",
				spanId: "span789",
				traceFlags: 1,
			}

			transport.log(entry, "formatted")
			await new Promise((resolve) => setTimeout(resolve, 50))

			const body = JSON.parse(mockFetch.mock.calls[0][1].body)
			const logRecord = body.resourceLogs[0].scopeLogs[0].logRecords[0]

			expect(logRecord.traceId).toBe("abc123def456")
			expect(logRecord.spanId).toBe("span789")
			expect(logRecord.flags).toBe(1)
		})
	})

	describe("resource attributes", () => {
		it("should include resource attributes", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({
				batch: false,
				resourceAttributes: {
					"service.name": "my-service",
					"service.version": "1.0.0",
					"deployment.environment": "production",
				},
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted")
			await new Promise((resolve) => setTimeout(resolve, 50))

			const body = JSON.parse(mockFetch.mock.calls[0][1].body)
			const resourceAttrs = body.resourceLogs[0].resource.attributes

			expect(resourceAttrs).toHaveLength(3)

			const serviceNameAttr = resourceAttrs.find(
				(a: any) => a.key === "service.name",
			)
			expect(serviceNameAttr.value.stringValue).toBe("my-service")
		})
	})

	describe("flush", () => {
		it("should flush pending logs", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({
				batch: true,
				batchSize: 100,
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted")

			// Should not have sent yet
			expect(mockFetch).not.toHaveBeenCalled()

			await transport.flush()

			// Should have sent after flush
			expect(mockFetch).toHaveBeenCalledTimes(1)
		})

		it("should not error on empty flush", async () => {
			const transport = new OTLPTransport()

			await expect(transport.flush()).resolves.toBeUndefined()
		})
	})

	describe("close", () => {
		it("should flush on close", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({
				batch: true,
				batchSize: 100,
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted")

			await transport.close()

			expect(mockFetch).toHaveBeenCalledTimes(1)
		})
	})

	describe("headers", () => {
		it("should send custom headers", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({
				batch: false,
				headers: {
					"x-api-key": "secret-key",
					"x-custom-header": "custom-value",
				},
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted")
			await new Promise((resolve) => setTimeout(resolve, 50))

			const [, options] = mockFetch.mock.calls[0]
			expect(options.headers["x-api-key"]).toBe("secret-key")
			expect(options.headers["x-custom-header"]).toBe("custom-value")
			expect(options.headers["Content-Type"]).toBe("application/json")
		})
	})

	describe("scope", () => {
		it("should use default scope name", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({ batch: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted")
			await new Promise((resolve) => setTimeout(resolve, 50))

			const body = JSON.parse(mockFetch.mock.calls[0][1].body)
			const scope = body.resourceLogs[0].scopeLogs[0].scope

			expect(scope.name).toBe("@sylphx/cat")
		})

		it("should use custom scope", async () => {
			const mockFetch = mock(async () =>
				Response.json({ status: "ok" }, { status: 200 }),
			)
			global.fetch = mockFetch as any

			const transport = new OTLPTransport({
				batch: false,
				scopeName: "my-custom-logger",
				scopeVersion: "2.0.0",
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted")
			await new Promise((resolve) => setTimeout(resolve, 50))

			const body = JSON.parse(mockFetch.mock.calls[0][1].body)
			const scope = body.resourceLogs[0].scopeLogs[0].scope

			expect(scope.name).toBe("my-custom-logger")
			expect(scope.version).toBe("2.0.0")
		})
	})
})
