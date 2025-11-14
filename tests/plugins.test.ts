import { describe, expect, test } from "bun:test"
import type { LogEntry, Transport } from "../src/index"
import { contextPlugin, createLogger, samplingPlugin } from "../src/index"

class MockTransport implements Transport {
	logs: Array<{ entry: LogEntry; formatted: string }> = []

	log(entry: LogEntry, formatted: string): void {
		this.logs.push({ entry, formatted })
	}
}

describe("Plugins", () => {
	describe("ContextPlugin", () => {
		test("should add context to log entries", () => {
			const mockTransport = new MockTransport()
			const logger = createLogger({
				transports: [mockTransport],
				plugins: [contextPlugin({ app: "test-app", version: "1.0.0" })],
			})

			logger.info("test")

			expect(mockTransport.logs[0].entry.context).toEqual({
				app: "test-app",
				version: "1.0.0",
			})
		})

		test("should merge with existing context", () => {
			const mockTransport = new MockTransport()
			const logger = createLogger({
				transports: [mockTransport],
				context: { env: "production" },
				plugins: [contextPlugin({ app: "test-app" })],
			})

			logger.info("test")

			expect(mockTransport.logs[0].entry.context).toEqual({
				env: "production",
				app: "test-app",
			})
		})
	})

	describe("SamplingPlugin", () => {
		test("should always log error and fatal", () => {
			const mockTransport = new MockTransport()
			const logger = createLogger({
				level: "trace",
				transports: [mockTransport],
				plugins: [samplingPlugin(0)], // 0% sampling
			})

			logger.error("error")
			logger.fatal("fatal")

			expect(mockTransport.logs.length).toBe(2)
		})

		test("should sample info logs at specified rate", () => {
			const mockTransport = new MockTransport()
			const logger = createLogger({
				transports: [mockTransport],
				plugins: [samplingPlugin(1)], // 100% sampling
			})

			for (let i = 0; i < 10; i++) {
				logger.info("test")
			}

			expect(mockTransport.logs.length).toBe(10)
		})

		test("should filter all when rate is 0", () => {
			const mockTransport = new MockTransport()
			const logger = createLogger({
				transports: [mockTransport],
				plugins: [samplingPlugin(0)],
			})

			logger.info("test")
			logger.warn("test")

			expect(mockTransport.logs.length).toBe(0)
		})
	})
})
