import { beforeEach, describe, expect, test } from "vitest"
import type { LogEntry, Plugin, Transport } from "../src/index"
import { createLogger, jsonFormatter, LOG_LEVELS, prettyFormatter } from "../src/index"

class MockTransport implements Transport {
	logs: Array<{ entry: LogEntry; formatted: string }> = []

	log(entry: LogEntry, formatted: string): void {
		this.logs.push({ entry, formatted })
	}

	clear(): void {
		this.logs = []
	}
}

describe("Edge Cases", () => {
	let mockTransport: MockTransport

	beforeEach(() => {
		mockTransport = new MockTransport()
	})

	test("should handle empty message", () => {
		const logger = createLogger({
			transports: [mockTransport],
		})

		logger.info("")
		expect(mockTransport.logs.length).toBe(1)
		expect(mockTransport.logs[0].entry.message).toBe("")
	})

	test("should handle undefined data", () => {
		const logger = createLogger({
			transports: [mockTransport],
		})

		logger.info("test", undefined)
		expect(mockTransport.logs.length).toBe(1)
		expect(mockTransport.logs[0].entry.data).toBeUndefined()
	})

	test("should handle empty context", () => {
		const logger = createLogger({
			transports: [mockTransport],
			context: {},
		})

		logger.info("test")
		expect(mockTransport.logs[0].entry.context).toEqual({})
	})

	test("should handle no transports", () => {
		const logger = createLogger({
			transports: [],
		})

		expect(() => logger.info("test")).not.toThrow()
	})

	test("should handle no formatter", () => {
		const logger = createLogger({
			transports: [mockTransport],
			formatter: undefined,
		})

		logger.info("test", { key: "value" })
		expect(mockTransport.logs.length).toBe(1)
		// Should use default JSON formatter
		expect(() => JSON.parse(mockTransport.logs[0].formatted)).not.toThrow()
	})

	test("should handle circular references in data", () => {
		const logger = createLogger({
			transports: [mockTransport],
			formatter: prettyFormatter(),
		})

		const circular: any = { key: "value" }
		circular.self = circular

		expect(() => logger.info("test", circular)).not.toThrow()
	})

	test("should handle very long messages", () => {
		const logger = createLogger({
			transports: [mockTransport],
		})

		const longMessage = "a".repeat(10000)
		logger.info(longMessage)

		expect(mockTransport.logs.length).toBe(1)
		expect(mockTransport.logs[0].entry.message).toBe(longMessage)
	})

	test("should handle special characters in message", () => {
		const logger = createLogger({
			transports: [mockTransport],
		})

		const specialMessage = '{"test": "\n\t\r\\"}'
		logger.info(specialMessage)

		expect(mockTransport.logs.length).toBe(1)
		expect(mockTransport.logs[0].entry.message).toBe(specialMessage)
	})

	test("should handle plugin that returns null", () => {
		const filterPlugin: Plugin = {
			name: "filter",
			onLog: () => null, // Filter everything
		}

		const logger = createLogger({
			transports: [mockTransport],
			plugins: [filterPlugin],
		})

		logger.info("test")
		expect(mockTransport.logs.length).toBe(0)
	})

	test("should handle plugin that modifies entry", () => {
		const transformPlugin: Plugin = {
			name: "transform",
			onLog: (entry) => ({
				...entry,
				message: entry.message.toUpperCase(),
			}),
		}

		const logger = createLogger({
			transports: [mockTransport],
			plugins: [transformPlugin],
		})

		logger.info("test")
		expect(mockTransport.logs[0].entry.message).toBe("TEST")
	})

	test("should handle multiple plugins in order", () => {
		const plugin1: Plugin = {
			name: "plugin1",
			onLog: (entry) => ({
				...entry,
				message: `${entry.message}-1`,
			}),
		}

		const plugin2: Plugin = {
			name: "plugin2",
			onLog: (entry) => ({
				...entry,
				message: `${entry.message}-2`,
			}),
		}

		const logger = createLogger({
			transports: [mockTransport],
			plugins: [plugin1, plugin2],
		})

		logger.info("test")
		expect(mockTransport.logs[0].entry.message).toBe("test-1-2")
	})

	test("should handle LOG_LEVELS constant", () => {
		expect(LOG_LEVELS.trace).toBe(10)
		expect(LOG_LEVELS.debug).toBe(20)
		expect(LOG_LEVELS.info).toBe(30)
		expect(LOG_LEVELS.warn).toBe(40)
		expect(LOG_LEVELS.error).toBe(50)
		expect(LOG_LEVELS.fatal).toBe(60)
	})

	test("should handle child logger with merged context", () => {
		const logger = createLogger({
			transports: [mockTransport],
			context: { app: "test", env: "dev" },
		})

		const child = logger.child({ service: "api", env: "prod" }) // Override env

		child.info("test")
		expect(mockTransport.logs[0].entry.context).toEqual({
			app: "test",
			env: "prod", // Overridden
			service: "api",
		})
	})

	test("should handle nested child loggers", () => {
		const logger = createLogger({
			transports: [mockTransport],
			context: { level1: "root" },
		})

		const child1 = logger.child({ level2: "child1" })
		const child2 = child1.child({ level3: "child2" })

		child2.info("test")
		expect(mockTransport.logs[0].entry.context).toEqual({
			level1: "root",
			level2: "child1",
			level3: "child2",
		})
	})

	test("should handle formatter with all fields", () => {
		const formatter = jsonFormatter()
		const entry: LogEntry = {
			level: "info",
			timestamp: 1234567890,
			message: "test",
			data: { key: "value" },
			context: { service: "test" },
		}

		const result = formatter.format(entry)
		const parsed = JSON.parse(result)

		expect(parsed.level).toBe("info")
		expect(parsed.time).toBe(1234567890)
		expect(parsed.msg).toBe("test")
		expect(parsed.data).toEqual({ key: "value" })
		expect(parsed.service).toBe("test")
	})

	test("should handle pretty formatter with all timestamp formats", () => {
		const entry: LogEntry = {
			level: "info",
			timestamp: 1234567890,
			message: "test",
		}

		const isoFormatter = prettyFormatter({ timestampFormat: "iso" })
		const unixFormatter = prettyFormatter({ timestampFormat: "unix" })
		const relativeFormatter = prettyFormatter({ timestampFormat: "relative" })

		expect(isoFormatter.format(entry)).toContain("T")
		expect(unixFormatter.format(entry)).toContain("1234567890")
		expect(relativeFormatter.format(entry)).toContain("ms")
	})

	test("should handle pretty formatter without timestamp", () => {
		const formatter = prettyFormatter({ timestamp: false })
		const entry: LogEntry = {
			level: "info",
			timestamp: 1234567890,
			message: "test",
		}

		const result = formatter.format(entry)
		expect(result).not.toContain("1970") // ISO timestamp year
		expect(result).toContain("INF")
		expect(result).toContain("test")
	})

	test("should handle transport async flush", async () => {
		const asyncTransport: Transport = {
			log: () => {},
			flush: async () => {
				await new Promise((resolve) => setTimeout(resolve, 10))
			},
		}

		const logger = createLogger({
			transports: [asyncTransport],
		})

		logger.info("test")
		await expect(logger.flush()).resolves.toBeUndefined()
	})

	test("should handle transport async close", async () => {
		const asyncTransport: Transport = {
			log: () => {},
			close: async () => {
				await new Promise((resolve) => setTimeout(resolve, 10))
			},
		}

		const logger = createLogger({
			transports: [asyncTransport],
		})

		logger.info("test")
		await expect(logger.close()).resolves.toBeUndefined()
	})
})
