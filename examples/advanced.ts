import {
	consoleTransport,
	contextPlugin,
	createLogger,
	fileTransport,
	jsonFormatter,
	samplingPlugin,
} from "../src/index"

// Advanced usage with multiple transports and plugins
const logger = createLogger({
	level: "trace",
	formatter: jsonFormatter(),
	transports: [
		// Console with pretty formatting for development
		consoleTransport(),
		// File transport for persistent logs
		fileTransport({
			path: "./logs/app.log",
		}),
	],
	plugins: [
		// Add app context to all logs
		contextPlugin({
			app: "my-app",
			version: "1.0.0",
			env: process.env.NODE_ENV || "development",
		}),
		// Sample 10% of debug/info logs (always log warn/error/fatal)
		samplingPlugin(0.1),
	],
})

// Simulate application logs
logger.info("Application initialized")

const requestLogger = logger.child({ module: "http" })
requestLogger.info("Incoming request", {
	method: "GET",
	path: "/api/users",
	ip: "192.168.1.1",
})

const dbLogger = logger.child({ module: "database" })
dbLogger.debug("Query executed", {
	query: "SELECT * FROM users",
	duration: 45,
})

dbLogger.error("Connection failed", {
	error: "ECONNREFUSED",
	host: "localhost",
	port: 5432,
})

// Batch mode for high-throughput scenarios
const highThroughputLogger = createLogger({
	level: "info",
	formatter: jsonFormatter(),
	transports: [consoleTransport()],
	batch: true,
	batchSize: 100,
	batchInterval: 1000,
})

// Simulate high-throughput logging
for (let i = 0; i < 1000; i++) {
	highThroughputLogger.info(`Log entry ${i}`, { index: i })
}

// Flush remaining logs
await highThroughputLogger.flush()

// Clean shutdown
await logger.close()
