import { describe, expect, it, mock } from "bun:test"
import { createLogger, FastLogger } from "../logger"
import type { LogEntry, Transport } from "../types"

describe("FastLogger", () => {
	describe("createLogger", () => {
		it("should create a logger instance", () => {
			const logger = createLogger()
			expect(logger).toBeInstanceOf(FastLogger)
		})

		it("should create with custom options", () => {
			const logger = createLogger({
				level: "debug",
				context: { service: "test" },
			})
			expect(logger).toBeInstanceOf(FastLogger)
		})
	})

	describe("log levels", () => {
		it("should log info messages by default", () => {
			const transport = {
				log: mock(() => {}),
			}
			const logger = createLogger({ transports: [transport] })

			logger.info("test message")

			expect(transport.log).toHaveBeenCalledTimes(1)
			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.level).toBe("info")
			expect(entry.message).toBe("test message")
		})

		it("should respect log level filtering", () => {
			const transport = {
				log: mock(() => {}),
			}
			const logger = createLogger({
				level: "warn",
				transports: [transport],
			})

			logger.debug("debug message") // Should be filtered
			logger.info("info message") // Should be filtered
			logger.warn("warn message") // Should pass
			logger.error("error message") // Should pass

			expect(transport.log).toHaveBeenCalledTimes(2)
		})

		it("should support all log levels", () => {
			const transport = {
				log: mock(() => {}),
			}
			const logger = createLogger({
				level: "trace",
				transports: [transport],
			})

			logger.trace("trace")
			logger.debug("debug")
			logger.info("info")
			logger.warn("warn")
			logger.error("error")
			logger.fatal("fatal")

			expect(transport.log).toHaveBeenCalledTimes(6)

			const levels = transport.log.mock.calls.map(
				(call) => (call as unknown as [LogEntry, string])[0].level,
			)
			expect(levels).toEqual(["trace", "debug", "info", "warn", "error", "fatal"])
		})

		it("should allow changing log level dynamically", () => {
			const transport = {
				log: mock(() => {}),
			}
			const logger = createLogger({
				level: "info",
				transports: [transport],
			})

			logger.debug("should not log")
			expect(transport.log).toHaveBeenCalledTimes(0)

			logger.setLevel("debug")
			logger.debug("should log now")
			expect(transport.log).toHaveBeenCalledTimes(1)
		})
	})

	describe("data and context", () => {
		it("should include data in log entry", () => {
			const transport = {
				log: mock(() => {}),
			}
			const logger = createLogger({ transports: [transport] })

			const data = { userId: 123, action: "login" }
			logger.info("user action", data)

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.data).toEqual(data)
		})

		it("should include context in log entry", () => {
			const transport = {
				log: mock(() => {}),
			}
			const context = { service: "api", version: "1.0" }
			const logger = createLogger({
				context,
				transports: [transport],
			})

			logger.info("test")

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.context).toEqual(context)
		})
	})

	describe("child loggers", () => {
		it("should create child logger with merged context", () => {
			const transport = {
				log: mock(() => {}),
			}
			const parentLogger = createLogger({
				context: { service: "api" },
				transports: [transport],
			})

			const childLogger = parentLogger.child({ requestId: "123" })
			childLogger.info("request processed")

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.context).toEqual({
				service: "api",
				requestId: "123",
			})
		})

		it("should inherit parent's log level", () => {
			const transport = {
				log: mock(() => {}),
			}
			const parentLogger = createLogger({
				level: "error",
				transports: [transport],
			})

			const childLogger = parentLogger.child({ requestId: "123" })
			childLogger.info("should not log")
			childLogger.error("should log")

			expect(transport.log).toHaveBeenCalledTimes(1)
		})

		it("should inherit parent's transports", () => {
			const transport = {
				log: mock(() => {}),
			}
			const parentLogger = createLogger({ transports: [transport] })

			const childLogger = parentLogger.child({ test: true })
			childLogger.info("test")

			expect(transport.log).toHaveBeenCalledTimes(1)
		})
	})

	describe("multiple transports", () => {
		it("should log to all transports", () => {
			const transport1 = { log: mock(() => {}) }
			const transport2 = { log: mock(() => {}) }

			const logger = createLogger({
				transports: [transport1, transport2],
			})

			logger.info("test")

			expect(transport1.log).toHaveBeenCalledTimes(1)
			expect(transport2.log).toHaveBeenCalledTimes(1)
		})
	})

	describe("plugins", () => {
		it("should call plugin onInit during construction", () => {
			const plugin = {
				name: "test",
				onInit: mock(() => {}),
			}

			createLogger({ plugins: [plugin] })

			expect(plugin.onInit).toHaveBeenCalledTimes(1)
		})

		it("should call plugin onLog for each log entry", () => {
			const plugin = {
				name: "test",
				onLog: mock((entry: LogEntry) => entry),
			}

			const logger = createLogger({
				plugins: [plugin],
				transports: [{ log: () => {} }],
			})

			logger.info("test")

			expect(plugin.onLog).toHaveBeenCalledTimes(1)
		})

		it("should filter logs when plugin returns null", () => {
			const plugin = {
				name: "filter",
				onLog: () => null,
			}

			const transport = { log: mock(() => {}) }
			const logger = createLogger({
				plugins: [plugin],
				transports: [transport],
			})

			logger.info("filtered")

			expect(transport.log).toHaveBeenCalledTimes(0)
		})

		it("should allow plugins to modify log entries", () => {
			const plugin = {
				name: "modifier",
				onLog: (entry: LogEntry) => ({
					...entry,
					data: { ...entry.data, modified: true },
				}),
			}

			const transport = { log: mock(() => {}) }
			const logger = createLogger({
				plugins: [plugin],
				transports: [transport],
			})

			logger.info("test", { original: true })

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.data).toEqual({
				original: true,
				modified: true,
			})
		})

		it("should call onDestroy when closing logger", async () => {
			const plugin = {
				name: "test",
				onDestroy: mock(() => {}),
			}

			const logger = createLogger({ plugins: [plugin] })
			await logger.close()

			expect(plugin.onDestroy).toHaveBeenCalledTimes(1)
		})
	})

	describe("batch mode", () => {
		it("should batch logs when batch mode is enabled", async () => {
			const transport = { log: mock(() => {}) }

			const logger = createLogger({
				batch: true,
				batchSize: 3,
				batchInterval: 100,
				transports: [transport],
			})

			logger.info("log 1")
			logger.info("log 2")

			// Should not log yet
			expect(transport.log).toHaveBeenCalledTimes(0)

			logger.info("log 3") // Triggers batch

			// Should log all 3
			expect(transport.log).toHaveBeenCalledTimes(3)

			await logger.close()
		})

		it("should flush batch after interval", async () => {
			const transport = { log: mock(() => {}) }

			const logger = createLogger({
				batch: true,
				batchSize: 100,
				batchInterval: 50,
				transports: [transport],
			})

			logger.info("test")

			// Should not log immediately
			expect(transport.log).toHaveBeenCalledTimes(0)

			// Wait for interval
			await new Promise((resolve) => setTimeout(resolve, 60))

			// Should have flushed
			expect(transport.log).toHaveBeenCalledTimes(1)

			await logger.close()
		})
	})

	describe("flush and close", () => {
		it("should flush pending logs", async () => {
			const transport = {
				log: mock(() => {}),
				flush: mock(async () => {}),
			}

			const logger = createLogger({
				batch: true,
				batchSize: 100,
				transports: [transport],
			})

			logger.info("test")
			await logger.flush()

			expect(transport.log).toHaveBeenCalledTimes(1)
			expect(transport.flush).toHaveBeenCalledTimes(1)
		})

		it("should close all transports", async () => {
			const transport = {
				log: () => {},
				close: mock(async () => {}),
			}

			const logger = createLogger({ transports: [transport] })
			await logger.close()

			expect(transport.close).toHaveBeenCalledTimes(1)
		})
	})

	describe("timestamp", () => {
		it("should add timestamp to log entries", () => {
			const transport = { log: mock(() => {}) }
			const logger = createLogger({ transports: [transport] })

			const before = Date.now()
			logger.info("test")
			const after = Date.now()

			const [entry] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			expect(entry.timestamp).toBeGreaterThanOrEqual(before)
			expect(entry.timestamp).toBeLessThanOrEqual(after)
		})
	})

	describe("default formatting", () => {
		it("should use JSON.stringify as default formatter", () => {
			const transport = { log: mock(() => {}) }
			const logger = createLogger({ transports: [transport] })

			logger.info("test message", { key: "value" })

			const [, formatted] = transport.log.mock.calls[0] as unknown as [LogEntry, string]
			const parsed = JSON.parse(formatted)

			expect(parsed.level).toBe("info")
			expect(parsed.message).toBe("test message")
			expect(parsed.data).toEqual({ key: "value" })
		})
	})
})
