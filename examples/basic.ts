import { consoleTransport, createLogger, prettyFormatter } from "../src/index"

// Simple usage
const logger = createLogger({
	level: "debug",
	formatter: prettyFormatter(),
	transports: [consoleTransport()],
})

logger.debug("Debug message")
logger.info("Application started")
logger.warn("This is a warning", { code: "WARN_001" })
logger.error("An error occurred", { error: "Connection failed", retries: 3 })

// Child logger with context
const authLogger = logger.child({ service: "auth" })
authLogger.info("User logged in", { userId: "user123" })

// Different log levels
logger.trace("Very detailed trace")
logger.debug("Debug information")
logger.info("General information")
logger.warn("Warning message")
logger.error("Error message")
logger.fatal("Fatal error")
