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
export type { PrettyFormatterOptions } from "./formatters/pretty"
export { PrettyFormatter, prettyFormatter } from "./formatters/pretty"

// Serializers
export type { SerializedError, Serializer, SerializerRegistry } from "./serializers/index"
export {
	applySerializers,
	autoSerializeErrors,
	formatError,
	isError,
	requestSerializer,
	responseSerializer,
	serializeError,
	stdSerializers,
} from "./serializers/index"

// Plugins
export type { ContextPluginOptions } from "./plugins/context"
export { ContextPlugin, contextPlugin } from "./plugins/context"
export type { SamplingPluginOptions } from "./plugins/sampling"
export { SamplingPlugin, samplingPlugin } from "./plugins/sampling"
// Transports
export { ConsoleTransport, consoleTransport } from "./transports/console"
export type { FileTransportOptions } from "./transports/file"
export { FileTransport, fileTransport } from "./transports/file"
export type { StreamTransportOptions } from "./transports/stream"
export { StreamTransport, streamTransport } from "./transports/stream"
