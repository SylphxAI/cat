import { bench, describe } from "vitest"
import type { Plugin, Transport } from "../src/index"
import { contextPlugin, createLogger, samplingPlugin } from "../src/index"

class NoopTransport implements Transport {
	log() {}
}

describe("Plugins Performance", () => {
	bench("no plugins", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
		})
		logger.info("test")
	})

	bench("context plugin", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
			plugins: [contextPlugin({ app: "test", version: "1.0.0" })],
		})
		logger.info("test")
	})

	bench("sampling plugin (100%)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
			plugins: [samplingPlugin(1)],
		})
		logger.info("test")
	})

	bench("sampling plugin (50%)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
			plugins: [samplingPlugin(0.5)],
		})
		logger.info("test")
	})

	bench("sampling plugin (0%)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
			plugins: [samplingPlugin(0)],
		})
		logger.info("test")
	})

	bench("multiple plugins", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
			plugins: [contextPlugin({ app: "test" }), samplingPlugin(1), contextPlugin({ env: "prod" })],
		})
		logger.info("test")
	})

	bench("custom transform plugin", () => {
		const transformPlugin: Plugin = {
			name: "transform",
			onLog: (entry) => ({
				...entry,
				message: entry.message.toUpperCase(),
			}),
		}

		const logger = createLogger({
			transports: [new NoopTransport()],
			plugins: [transformPlugin],
		})
		logger.info("test")
	})
})
