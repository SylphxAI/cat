import { bench, describe } from "vitest"
import type { Transport } from "../src/index"
import { consoleTransport, createLogger, jsonFormatter } from "../src/index"

class NoopTransport implements Transport {
	log() {}
}

// Mock console to avoid actual console output
const mockConsole = {
	log: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
}

describe("Comparison Benchmarks", () => {
	bench("native: console.log", () => {
		mockConsole.log("benchmark test")
	})

	bench("native: JSON.stringify + console.log", () => {
		mockConsole.log(JSON.stringify({ level: "info", message: "benchmark test", data: { test: 1 } }))
	})

	bench("@sylphx/cat: minimal (noop transport)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test")
	})

	bench("@sylphx/cat: with data (noop transport)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test", { test: 1 })
	})

	bench("@sylphx/cat: full featured", () => {
		const logger = createLogger({
			formatter: jsonFormatter(),
			transports: [consoleTransport()],
		})
		logger.info("benchmark test", { test: 1 })
	})
})
