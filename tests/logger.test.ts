import { beforeEach, describe, expect, test } from "bun:test"
import type { LogEntry, Transport } from "../src/index"
import { createLogger } from "../src/index"

class MockTransport implements Transport {
	logs: Array<{ entry: LogEntry; formatted: string }> = []

	log(entry: LogEntry, formatted: string): void {
		this.logs.push({ entry, formatted })
	}

	clear(): void {
		this.logs = []
	}
}

describe("Logger", () => {
	let mockTransport: MockTransport

	beforeEach(() => {
		mockTransport = new MockTransport()
	})

	test("should log messages at correct level", () => {
		const logger = createLogger({
			level: "info",
			transports: [mockTransport],
		})

		logger.debug("debug message")
		logger.info("info message")
		logger.warn("warn message")

		expect(mockTransport.logs.length).toBe(2)
		expect(mockTransport.logs[0].entry.level).toBe("info")
		expect(mockTransport.logs[1].entry.level).toBe("warn")
	})

	test("should include data in log entry", () => {
		const logger = createLogger({
			transports: [mockTransport],
		})

		logger.info("test", { userId: 123, action: "login" })

		expect(mockTransport.logs[0].entry.data).toEqual({
			userId: 123,
			action: "login",
		})
	})

	test("should support child loggers with context", () => {
		const logger = createLogger({
			transports: [mockTransport],
		})

		const child = logger.child({ service: "auth" })
		child.info("user logged in")

		expect(mockTransport.logs[0].entry.context).toEqual({
			service: "auth",
		})
	})

	test("should respect level changes", () => {
		const logger = createLogger({
			level: "info",
			transports: [mockTransport],
		})

		logger.debug("should not log")
		expect(mockTransport.logs.length).toBe(0)

		logger.setLevel("debug")
		logger.debug("should log")
		expect(mockTransport.logs.length).toBe(1)
	})

	test("should handle all log levels", () => {
		const logger = createLogger({
			level: "trace",
			transports: [mockTransport],
		})

		logger.trace("trace")
		logger.debug("debug")
		logger.info("info")
		logger.warn("warn")
		logger.error("error")
		logger.fatal("fatal")

		expect(mockTransport.logs.length).toBe(6)
		expect(mockTransport.logs.map((l) => l.entry.level)).toEqual([
			"trace",
			"debug",
			"info",
			"warn",
			"error",
			"fatal",
		])
	})

	test("should add timestamp to entries", () => {
		const logger = createLogger({
			transports: [mockTransport],
		})

		const before = Date.now()
		logger.info("test")
		const after = Date.now()

		const timestamp = mockTransport.logs[0].entry.timestamp
		expect(timestamp).toBeGreaterThanOrEqual(before)
		expect(timestamp).toBeLessThanOrEqual(after)
	})

	test("should work with multiple transports", () => {
		const transport1 = new MockTransport()
		const transport2 = new MockTransport()

		const logger = createLogger({
			transports: [transport1, transport2],
		})

		logger.info("test")

		expect(transport1.logs.length).toBe(1)
		expect(transport2.logs.length).toBe(1)
	})
})
