import { describe, expect, it, mock } from "bun:test"
import { createLogger } from "../core/logger"
import { JsonFormatter } from "../formatters/json"
import { ConsoleTransport } from "../transports/console"
import { serializeError } from "../serializers/error"
import type { LogEntry } from "../core/types"

describe("Integration Tests", () => {
	describe("Logger + Formatter + Transport", () => {
		it("should work end-to-end with JSON formatter and console transport", () => {
			const transport = {
				log: mock(() => {}),
			}

			const logger = createLogger({
				formatter: new JsonFormatter(),
				transports: [transport],
			})

			logger.info("test message", { userId: 123 })

			expect(transport.log).toHaveBeenCalledTimes(1)

			const [entry, formatted] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.level).toBe("info")
			expect(entry.message).toBe("test message")

			const parsed = JSON.parse(formatted)
			expect(parsed.level).toBe("info")
			expect(parsed.msg).toBe("test message")
			expect(parsed.data).toEqual({ userId: 123 })
		})

		it("should handle multiple transports simultaneously", () => {
			const transport1 = { log: mock(() => {}) }
			const transport2 = { log: mock(() => {}) }

			const logger = createLogger({
				transports: [transport1, transport2],
			})

			logger.warn("warning message")

			expect(transport1.log).toHaveBeenCalledTimes(1)
			expect(transport2.log).toHaveBeenCalledTimes(1)

			// Both should receive same entry
			const [entry1] = transport1.log.mock.calls[0] as unknown as [LogEntry, string]
			const [entry2] = transport2.log.mock.calls[0] as unknown as [LogEntry, string]

			expect(entry1.message).toBe("warning message")
			expect(entry2.message).toBe("warning message")
		})
	})

	describe("Logger + Context + Child Loggers", () => {
		it("should merge context through child logger chain", () => {
			const transport = { log: mock(() => {}) }

			const rootLogger = createLogger({
				context: { service: "api" },
				transports: [transport],
			})

			const requestLogger = rootLogger.child({ requestId: "123" })
			const userLogger = requestLogger.child({ userId: 456 })

			userLogger.info("user action")

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.context).toEqual({
				service: "api",
				requestId: "123",
				userId: 456,
			})
		})

		it("should inherit parent log level in children", () => {
			const transport = { log: mock(() => {}) }

			const parentLogger = createLogger({
				level: "error",
				transports: [transport],
			})

			const childLogger = parentLogger.child({ module: "auth" })

			childLogger.info("should not log")
			childLogger.debug("should not log")
			childLogger.error("should log")

			expect(transport.log).toHaveBeenCalledTimes(1)
		})
	})

	describe("Logger + Plugins", () => {
		it("should process logs through plugin pipeline", () => {
			const plugin1 = {
				name: "add-timestamp",
				onLog: (entry: LogEntry) => ({
					...entry,
					data: { ...entry.data, pluginTime: Date.now() },
				}),
			}

			const plugin2 = {
				name: "add-version",
				onLog: (entry: LogEntry) => ({
					...entry,
					data: { ...entry.data, version: "1.0" },
				}),
			}

			const transport = { log: mock(() => {}) }

			const logger = createLogger({
				plugins: [plugin1, plugin2],
				transports: [transport],
			})

			logger.info("test")

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.data).toHaveProperty("pluginTime")
			expect(entry.data).toHaveProperty("version", "1.0")
		})

		it("should allow plugins to filter logs", () => {
			const filterPlugin = {
				name: "filter-debug",
				onLog: (entry: LogEntry) => (entry.level === "debug" ? null : entry),
			}

			const transport = { log: mock(() => {}) }

			const logger = createLogger({
				level: "trace",
				plugins: [filterPlugin],
				transports: [transport],
			})

			logger.debug("should be filtered")
			logger.info("should pass")

			expect(transport.log).toHaveBeenCalledTimes(1)

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.level).toBe("info")
		})
	})

	describe("Logger + Error Serialization", () => {
		it("should serialize errors in log data", () => {
			const transport = { log: mock(() => {}) }

			const logger = createLogger({ transports: [transport] })

			const error = new Error("test error")
			logger.error("error occurred", { error: serializeError(error) })

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			const errorData = entry.data?.error as any

			expect(errorData.type).toBe("Error")
			expect(errorData.message).toBe("test error")
			expect(errorData.stack).toBeDefined()
		})

		it("should handle error cause chains", () => {
			const transport = { log: mock(() => {}) }

			const logger = createLogger({ transports: [transport] })

			const cause = new Error("root cause")
			const error = new Error("main error", { cause })

			logger.error("error with cause", { error: serializeError(error) })

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			const errorData = entry.data?.error as any

			expect(errorData.message).toBe("main error")
			expect(errorData.cause.message).toBe("root cause")
		})
	})

	describe("Logger + Batch Mode", () => {
		it("should batch logs and flush on size threshold", async () => {
			const transport = { log: mock(() => {}) }

			const logger = createLogger({
				batch: true,
				batchSize: 3,
				batchInterval: 1000,
				transports: [transport],
			})

			logger.info("log 1")
			logger.info("log 2")

			expect(transport.log).toHaveBeenCalledTimes(0)

			logger.info("log 3")

			expect(transport.log).toHaveBeenCalledTimes(3)

			await logger.close()
		})

		it("should flush batch on close", async () => {
			const transport = {
				log: mock(() => {}),
				flush: mock(async () => {}),
			}

			const logger = createLogger({
				batch: true,
				batchSize: 100,
				transports: [transport],
			})

			logger.info("pending log")

			expect(transport.log).toHaveBeenCalledTimes(0)

			await logger.close()

			expect(transport.log).toHaveBeenCalledTimes(1)
		})
	})

	describe("Logger + Dynamic Level Changes", () => {
		it("should respect level changes immediately", () => {
			const transport = { log: mock(() => {}) }

			const logger = createLogger({
				level: "warn",
				transports: [transport],
			})

			logger.info("should not log")
			expect(transport.log).toHaveBeenCalledTimes(0)

			logger.setLevel("info")

			logger.info("should log now")
			expect(transport.log).toHaveBeenCalledTimes(1)
		})
	})

	describe("Real-world Scenarios", () => {
		it("should handle typical web request logging", () => {
			const transport = { log: mock(() => {}) }

			const appLogger = createLogger({
				context: { service: "web-api", environment: "production" },
				transports: [transport],
			})

			// Request starts
			const requestId = "req-123"
			const reqLogger = appLogger.child({ requestId })

			reqLogger.info("request received", {
				method: "POST",
				path: "/api/users",
				ip: "192.168.1.1",
			})

			// User authenticated
			const userId = 456
			const userLogger = reqLogger.child({ userId })

			userLogger.info("user authenticated")

			// Error occurs
			const error = new Error("Database connection failed")
			userLogger.error("request failed", { error: serializeError(error) })

			expect(transport.log).toHaveBeenCalledTimes(3)

			// Check final log has all context
			const [lastEntry] = transport.log.mock.calls[2] as unknown as [LogEntry, string]
			expect(lastEntry.context).toEqual({
				service: "web-api",
				environment: "production",
				requestId: "req-123",
				userId: 456,
			})
			expect(lastEntry.level).toBe("error")
		})

		it("should handle high-throughput logging", () => {
			const transport = { log: mock(() => {}) }

			const logger = createLogger({
				batch: true,
				batchSize: 100,
				transports: [transport],
			})

			// Log 1000 messages
			for (let i = 0; i < 1000; i++) {
				logger.info(`message ${i}`, { index: i })
			}

			// Should have batched into groups of 100
			expect(transport.log).toHaveBeenCalledTimes(1000)
		})

		it("should handle structured logging with complex data", () => {
			const transport = { log: mock(() => {}) }

			const logger = createLogger({ transports: [transport] })

			const complexData = {
				user: {
					id: 123,
					email: "test@example.com",
					metadata: {
						loginCount: 5,
						lastLogin: Date.now(),
					},
				},
				request: {
					headers: {
						"user-agent": "Mozilla/5.0",
						authorization: "Bearer token",
					},
					body: {
						action: "update",
						changes: ["field1", "field2"],
					},
				},
			}

			logger.info("user action", complexData)

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.data).toEqual(complexData)
		})
	})
})
