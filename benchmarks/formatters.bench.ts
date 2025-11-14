import { bench, describe } from "vitest"
import type { Transport } from "../src/index"
import { createLogger, jsonFormatter, prettyFormatter } from "../src/index"

class NoopTransport implements Transport {
	log() {}
}

describe("Formatters Performance", () => {
	bench("no formatter (default JSON)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test", { data: "test" })
	})

	bench("json formatter", () => {
		const logger = createLogger({
			formatter: jsonFormatter(),
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test", { data: "test" })
	})

	bench("pretty formatter (colors)", () => {
		const logger = createLogger({
			formatter: prettyFormatter({ colors: true }),
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test", { data: "test" })
	})

	bench("pretty formatter (no colors)", () => {
		const logger = createLogger({
			formatter: prettyFormatter({ colors: false }),
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test", { data: "test" })
	})

	bench("pretty formatter (ISO timestamp)", () => {
		const logger = createLogger({
			formatter: prettyFormatter({ timestampFormat: "iso" }),
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test", { data: "test" })
	})

	bench("pretty formatter (unix timestamp)", () => {
		const logger = createLogger({
			formatter: prettyFormatter({ timestampFormat: "unix" }),
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test", { data: "test" })
	})

	bench("pretty formatter (relative timestamp)", () => {
		const logger = createLogger({
			formatter: prettyFormatter({ timestampFormat: "relative" }),
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test", { data: "test" })
	})
})
