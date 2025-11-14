import { bench, describe } from "vitest"
import type { Transport } from "../src/index"
import { createLogger } from "../src/index"

// Noop transport for measuring pure logging overhead
class NoopTransport implements Transport {
	log() {}
}

describe("Logger Core Performance", () => {
	bench("baseline: empty function call", () => {})

	bench("filtered debug log (below threshold)", () => {
		const logger = createLogger({
			level: "info",
			transports: [new NoopTransport()],
		})
		logger.debug("this should be filtered")
	})

	bench("basic info log (noop transport)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test")
	})

	bench("info with data (noop transport)", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test", { userId: 123, action: "test" })
	})

	bench("info with complex data", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
		})
		logger.info("benchmark test", {
			userId: 123,
			action: "test",
			metadata: {
				ip: "192.168.1.1",
				userAgent: "Mozilla/5.0",
				timestamp: Date.now(),
			},
		})
	})

	bench("child logger", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
		})
		const child = logger.child({ service: "test" })
		child.info("benchmark test")
	})

	bench("nested child logger", () => {
		const logger = createLogger({
			transports: [new NoopTransport()],
		})
		const child1 = logger.child({ service: "test" })
		const child2 = child1.child({ module: "auth" })
		child2.info("benchmark test")
	})

	bench("all log levels", () => {
		const logger = createLogger({
			level: "trace",
			transports: [new NoopTransport()],
		})
		logger.trace("trace")
		logger.debug("debug")
		logger.info("info")
		logger.warn("warn")
		logger.error("error")
		logger.fatal("fatal")
	})
})
