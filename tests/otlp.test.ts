import { beforeEach, describe, expect, test, vi } from "vitest"
import type { LogEntry } from "../src/core/types"
import { OTLPTransport, otlpTransport } from "../src/transports/otlp"

describe("OTLP Transport", () => {
	let fetchMock: any

	beforeEach(() => {
		// Mock global fetch
		fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: "OK",
		})
		global.fetch = fetchMock
	})

	test("should convert log entry to OTLP format", async () => {
		const transport = new OTLPTransport({ batch: false })

		const entry: LogEntry = {
			level: "info",
			timestamp: 1704067200000, // 2024-01-01 00:00:00 UTC
			message: "Test message",
		}

		transport.log(entry, "")

		// Wait for async send
		await new Promise((resolve) => setTimeout(resolve, 100))

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, options] = fetchMock.mock.calls[0]

		expect(url).toBe("http://localhost:4318/v1/logs")
		expect(options.method).toBe("POST")
		expect(options.headers["Content-Type"]).toBe("application/json")

		const payload = JSON.parse(options.body)
		const logRecord = payload.resourceLogs[0].scopeLogs[0].logRecords[0]

		expect(logRecord.timeUnixNano).toBe("1704067200000000000")
		expect(logRecord.severityNumber).toBe(9) // INFO
		expect(logRecord.severityText).toBe("INFO")
		expect(logRecord.body.stringValue).toBe("Test message")
	})

	test("should map severity levels correctly", async () => {
		const transport = new OTLPTransport({ batch: false })

		const severityMap = {
			trace: 1,
			debug: 5,
			info: 9,
			warn: 13,
			error: 17,
			fatal: 21,
		}

		for (const [level, expectedSeverity] of Object.entries(severityMap)) {
			fetchMock.mockClear()

			const entry: LogEntry = {
				level: level as any,
				timestamp: Date.now(),
				message: "test",
			}

			transport.log(entry, "")
			await new Promise((resolve) => setTimeout(resolve, 50))

			const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
			const logRecord = payload.resourceLogs[0].scopeLogs[0].logRecords[0]

			expect(logRecord.severityNumber).toBe(expectedSeverity)
			expect(logRecord.severityText).toBe(level.toUpperCase())
		}
	})

	test("should include log data as attributes", async () => {
		const transport = new OTLPTransport({ batch: false })

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				userId: "123",
				requestId: "req-456",
				count: 42,
				isActive: true,
			},
		}

		transport.log(entry, "")
		await new Promise((resolve) => setTimeout(resolve, 100))

		const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
		const logRecord = payload.resourceLogs[0].scopeLogs[0].logRecords[0]

		expect(logRecord.attributes).toBeDefined()
		expect(logRecord.attributes).toHaveLength(4)

		const attrs = logRecord.attributes.reduce((acc: any, attr: any) => {
			acc[attr.key] = attr.value
			return acc
		}, {})

		expect(attrs.userId.stringValue).toBe("123")
		expect(attrs.requestId.stringValue).toBe("req-456")
		expect(attrs.count.intValue).toBe("42")
		expect(attrs.isActive.boolValue).toBe(true)
	})

	test("should include trace context", async () => {
		const transport = new OTLPTransport({ batch: false })

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			traceId: "0af7651916cd43dd8448eb211c80319c",
			spanId: "b7ad6b7169203331",
			traceFlags: 1,
		}

		transport.log(entry, "")
		await new Promise((resolve) => setTimeout(resolve, 100))

		const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
		const logRecord = payload.resourceLogs[0].scopeLogs[0].logRecords[0]

		expect(logRecord.traceId).toBe("0af7651916cd43dd8448eb211c80319c")
		expect(logRecord.spanId).toBe("b7ad6b7169203331")
		expect(logRecord.flags).toBe(1)
	})

	test("should include context as attributes", async () => {
		const transport = new OTLPTransport({ batch: false })

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			context: {
				service: "api",
				environment: "production",
			},
		}

		transport.log(entry, "")
		await new Promise((resolve) => setTimeout(resolve, 100))

		const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
		const logRecord = payload.resourceLogs[0].scopeLogs[0].logRecords[0]

		const attrs = logRecord.attributes.reduce((acc: any, attr: any) => {
			acc[attr.key] = attr.value
			return acc
		}, {})

		expect(attrs.service.stringValue).toBe("api")
		expect(attrs.environment.stringValue).toBe("production")
	})

	test("should batch logs by size", async () => {
		const transport = new OTLPTransport({
			batch: true,
			batchSize: 3,
			batchInterval: 10000, // Long interval to test size trigger
		})

		for (let i = 0; i < 3; i++) {
			transport.log(
				{
					level: "info",
					timestamp: Date.now(),
					message: `Message ${i}`,
				},
				"",
			)
		}

		// Wait for batch to flush
		await new Promise((resolve) => setTimeout(resolve, 100))

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
		expect(payload.resourceLogs[0].scopeLogs[0].logRecords).toHaveLength(3)
	})

	test("should batch logs by interval", async () => {
		const transport = new OTLPTransport({
			batch: true,
			batchSize: 100,
			batchInterval: 100, // Short interval
		})

		transport.log(
			{
				level: "info",
				timestamp: Date.now(),
				message: "Message 1",
			},
			"",
		)

		// Should not send yet
		expect(fetchMock).toHaveBeenCalledTimes(0)

		// Wait for interval
		await new Promise((resolve) => setTimeout(resolve, 150))

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	test(
		"should retry on failure",
		async () => {
			let attempts = 0
			fetchMock = vi.fn().mockImplementation(() => {
				attempts++
				if (attempts < 3) {
					return Promise.resolve({
						ok: false,
						status: 500,
						statusText: "Internal Server Error",
					})
				}
				return Promise.resolve({
					ok: true,
					status: 200,
					statusText: "OK",
				})
			})
			global.fetch = fetchMock

			const transport = new OTLPTransport({
				batch: false,
				retries: 3,
			})

			transport.log(
				{
					level: "info",
					timestamp: Date.now(),
					message: "Test",
				},
				"",
			)

			// Wait for retries (exponential backoff: 1s + 2s + 4s = 7s)
			await new Promise((resolve) => setTimeout(resolve, 8000))

			expect(fetchMock).toHaveBeenCalledTimes(3)
			expect(attempts).toBe(3)
		},
		10000,
	)

	test("should include resource attributes", async () => {
		const transport = new OTLPTransport({
			batch: false,
			resourceAttributes: {
				"service.name": "my-service",
				"service.version": "1.0.0",
				"deployment.environment": "production",
			},
		})

		transport.log(
			{
				level: "info",
				timestamp: Date.now(),
				message: "Test",
			},
			"",
		)

		await new Promise((resolve) => setTimeout(resolve, 100))

		const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
		const resource = payload.resourceLogs[0].resource

		const attrs = resource.attributes.reduce((acc: any, attr: any) => {
			acc[attr.key] = attr.value
			return acc
		}, {})

		expect(attrs["service.name"].stringValue).toBe("my-service")
		expect(attrs["service.version"].stringValue).toBe("1.0.0")
		expect(attrs["deployment.environment"].stringValue).toBe("production")
	})

	test("should include scope metadata", async () => {
		const transport = new OTLPTransport({
			batch: false,
			scopeName: "@myorg/logger",
			scopeVersion: "2.0.0",
		})

		transport.log(
			{
				level: "info",
				timestamp: Date.now(),
				message: "Test",
			},
			"",
		)

		await new Promise((resolve) => setTimeout(resolve, 100))

		const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
		const scope = payload.resourceLogs[0].scopeLogs[0].scope

		expect(scope.name).toBe("@myorg/logger")
		expect(scope.version).toBe("2.0.0")
	})

	test("should use custom endpoint", async () => {
		const transport = new OTLPTransport({
			batch: false,
			endpoint: "https://otlp.example.com/v1/logs",
		})

		transport.log(
			{
				level: "info",
				timestamp: Date.now(),
				message: "Test",
			},
			"",
		)

		await new Promise((resolve) => setTimeout(resolve, 100))

		const [url] = fetchMock.mock.calls[0]
		expect(url).toBe("https://otlp.example.com/v1/logs")
	})

	test("should include custom headers", async () => {
		const transport = new OTLPTransport({
			batch: false,
			headers: {
				"X-API-Key": "secret-key",
				"X-Custom-Header": "value",
			},
		})

		transport.log(
			{
				level: "info",
				timestamp: Date.now(),
				message: "Test",
			},
			"",
		)

		await new Promise((resolve) => setTimeout(resolve, 100))

		const [, options] = fetchMock.mock.calls[0]
		expect(options.headers["X-API-Key"]).toBe("secret-key")
		expect(options.headers["X-Custom-Header"]).toBe("value")
	})

	test("should flush on close", async () => {
		const transport = new OTLPTransport({
			batch: true,
			batchSize: 100,
			batchInterval: 10000,
		})

		transport.log(
			{
				level: "info",
				timestamp: Date.now(),
				message: "Message 1",
			},
			"",
		)

		transport.log(
			{
				level: "info",
				timestamp: Date.now(),
				message: "Message 2",
			},
			"",
		)

		// Should not have sent yet
		expect(fetchMock).toHaveBeenCalledTimes(0)

		await transport.close()

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
		expect(payload.resourceLogs[0].scopeLogs[0].logRecords).toHaveLength(2)
	})

	test("should handle objects and arrays in data", async () => {
		const transport = new OTLPTransport({ batch: false })

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: {
				user: { id: 123, name: "John" },
				tags: ["a", "b", "c"],
			},
		}

		transport.log(entry, "")
		await new Promise((resolve) => setTimeout(resolve, 100))

		const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
		const logRecord = payload.resourceLogs[0].scopeLogs[0].logRecords[0]

		const attrs = logRecord.attributes.reduce((acc: any, attr: any) => {
			acc[attr.key] = attr.value
			return acc
		}, {})

		expect(attrs.user.stringValue).toBe(JSON.stringify({ id: 123, name: "John" }))
		expect(attrs.tags.stringValue).toBe(JSON.stringify(["a", "b", "c"]))
	})

	test("otlpTransport factory should create transport", () => {
		const transport = otlpTransport({
			endpoint: "https://example.com",
		})

		expect(transport).toBeInstanceOf(OTLPTransport)
	})
})
