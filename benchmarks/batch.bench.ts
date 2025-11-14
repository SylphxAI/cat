import { bench, describe } from "vitest"
import type { Transport } from "../src/index"
import { createLogger } from "../src/index"

class NoopTransport implements Transport {
	log() {}
}

describe("Batch Mode Performance", () => {
	bench("non-batch mode", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
			batch: false,
		})
		for (let i = 0; i < 100; i++) {
			logger.info(`log ${i}`)
		}
	})

	bench("batch mode (size: 10)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
			batch: true,
			batchSize: 10,
		})
		for (let i = 0; i < 100; i++) {
			logger.info(`log ${i}`)
		}
	})

	bench("batch mode (size: 50)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
			batch: true,
			batchSize: 50,
		})
		for (let i = 0; i < 100; i++) {
			logger.info(`log ${i}`)
		}
	})

	bench("batch mode (size: 100)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
			batch: true,
			batchSize: 100,
		})
		for (let i = 0; i < 100; i++) {
			logger.info(`log ${i}`)
		}
	})

	bench("batch mode (size: 1000)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
			batch: true,
			batchSize: 1000,
		})
		for (let i = 0; i < 100; i++) {
			logger.info(`log ${i}`)
		}
	})
})
