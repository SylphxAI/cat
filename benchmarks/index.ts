import { bench, run } from "mitata"
import { createLogger, jsonFormatter, prettyFormatter } from "../src/index"

// Mock transport that does nothing (measure pure logging overhead)
class NoopTransport {
	log() {}
}

console.log("🚀 Logger Benchmarks\n")

bench("baseline: empty function call", () => {})

bench("logger: basic info log (noop transport)", () => {
	const logger = createLogger({
		transports: [new NoopTransport()],
	})
	logger.info("benchmark test")
})

bench("logger: info with data (noop transport)", () => {
	const logger = createLogger({
		transports: [new NoopTransport()],
	})
	logger.info("benchmark test", { userId: 123, action: "test" })
})

bench("logger: filtered debug log (below threshold)", () => {
	const logger = createLogger({
		level: "info",
		transports: [new NoopTransport()],
	})
	logger.debug("this should be filtered")
})

bench("logger: with json formatter", () => {
	const logger = createLogger({
		formatter: jsonFormatter(),
		transports: [new NoopTransport()],
	})
	logger.info("benchmark test", { data: "test" })
})

bench("logger: with pretty formatter", () => {
	const logger = createLogger({
		formatter: prettyFormatter({ colors: false }),
		transports: [new NoopTransport()],
	})
	logger.info("benchmark test", { data: "test" })
})

bench("logger: child logger", () => {
	const logger = createLogger({
		transports: [new NoopTransport()],
	})
	const child = logger.child({ service: "test" })
	child.info("benchmark test")
})

// Comparison with console.log
bench("native: console.log", () => {
	console.log("benchmark test")
})

bench("native: JSON.stringify + console.log", () => {
	console.log(JSON.stringify({ level: "info", message: "benchmark test", data: { test: 1 } }))
})

await run()
