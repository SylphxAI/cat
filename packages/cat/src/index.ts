// Core
export { createLogger, FastLogger } from "./core/logger"
export type {
	FormattedLog,
	Formatter,
	LogEntry,
	Logger,
	LoggerOptions,
	LogLevel,
	Plugin,
	Transport,
} from "./core/types"
export { LOG_LEVELS } from "./core/types"

// Formatters
export { JsonFormatter, jsonFormatter } from "./formatters/json"

// Transports
export { ConsoleTransport, consoleTransport } from "./transports/console"

// Serializers
export type { SerializedError, Serializer, SerializerRegistry } from "./serializers/index"
export {
	applySerializers,
	autoSerializeErrors,
	formatError,
	isError,
	serializeError,
	stdSerializers,
} from "./serializers/index"
