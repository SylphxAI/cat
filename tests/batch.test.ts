import { beforeEach, describe, expect, test } from "vitest"
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

describe("Batch Mode", () => {
	let mockTransport: MockTransport

	beforeEach(() => {
		mockTransport = new MockTransport()
	})

	test("should batch logs up to batchSize", async () => {
		const logger = createLogger({
			transports: [mockTransport],
			batch: true,
			batchSize: 3,
			batchInterval: 10000, // Long interval to test size-based flushing
		})

		logger.info("log 1")
		logger.info("log 2")
		expect(mockTransport.logs.length).toBe(0) // Not flushed yet

		logger.info("log 3") // Should trigger flush
		expect(mockTransport.logs.length).toBe(3)
	})

	test("should flush on interval", async () => {
		const logger = createLogger({
			transports: [mockTransport],
			batch: true,
			batchSize: 100, // Large size to test interval-based flushing
			batchInterval: 50, // Short interval for testing
		})

		logger.info("log 1")
		logger.info("log 2")
		expect(mockTransport.logs.length).toBe(0)

		// Wait for interval to trigger
		await new Promise((resolve) => setTimeout(resolve, 100))
		expect(mockTransport.logs.length).toBe(2)
	})

	test("should flush manually", async () => {
		const logger = createLogger({
			transports: [mockTransport],
			batch: true,
			batchSize: 100,
			batchInterval: 10000,
		})

		logger.info("log 1")
		logger.info("log 2")
		expect(mockTransport.logs.length).toBe(0)

		await logger.flush()
		expect(mockTransport.logs.length).toBe(2)
	})

	test("should flush on close", async () => {
		const logger = createLogger({
			transports: [mockTransport],
			batch: true,
			batchSize: 100,
			batchInterval: 10000,
		})

		logger.info("log 1")
		logger.info("log 2")
		expect(mockTransport.logs.length).toBe(0)

		await logger.close()
		expect(mockTransport.logs.length).toBe(2)
	})

	test("should handle default batch settings", () => {
		const logger = createLogger({
			transports: [mockTransport],
			batch: true,
		})

		// Should use default batchSize (100) and batchInterval (1000)
		for (let i = 0; i < 99; i++) {
			logger.info(`log ${i}`)
		}
		expect(mockTransport.logs.length).toBe(0)

		logger.info("log 100") // Should trigger flush at 100
		expect(mockTransport.logs.length).toBe(100)
	})

	test("should not batch when disabled", () => {
		const logger = createLogger({
			transports: [mockTransport],
			batch: false, // Explicit disable
		})

		logger.info("log 1")
		expect(mockTransport.logs.length).toBe(1)

		logger.info("log 2")
		expect(mockTransport.logs.length).toBe(2)
	})

	test("should batch with child logger", async () => {
		const logger = createLogger({
			transports: [mockTransport],
			batch: true,
			batchSize: 2,
		})

		const child = logger.child({ service: "test" })

		child.info("log 1")
		expect(mockTransport.logs.length).toBe(0)

		child.info("log 2")
		expect(mockTransport.logs.length).toBe(2)
		expect(mockTransport.logs[0].entry.context).toEqual({ service: "test" })
		expect(mockTransport.logs[1].entry.context).toEqual({ service: "test" })
	})
})
