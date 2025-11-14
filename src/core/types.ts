export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal"

export const LOG_LEVELS: Record<LogLevel, number> = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
}

export interface LogEntry {
	level: LogLevel
	timestamp: number
	message: string
	data?: Record<string, unknown>
	context?: Record<string, unknown>
}

export interface FormattedLog {
	formatted: string
	entry: LogEntry
}

export interface Formatter {
	format(entry: LogEntry): string
}

export interface Transport {
	log(entry: LogEntry, formatted: string): void | Promise<void>
	flush?(): void | Promise<void>
	close?(): void | Promise<void>
}

export interface Plugin {
	name: string
	onLog?(entry: LogEntry): LogEntry | null
	onInit?(logger: unknown): void
	onDestroy?(): void
}

export interface LoggerOptions {
	level?: LogLevel
	formatter?: Formatter
	transports?: Transport[]
	plugins?: Plugin[]
	context?: Record<string, unknown>
	// Performance optimizations
	batch?: boolean
	batchSize?: number
	batchInterval?: number
}

export interface Logger {
	trace(message: string, data?: Record<string, unknown>): void
	debug(message: string, data?: Record<string, unknown>): void
	info(message: string, data?: Record<string, unknown>): void
	warn(message: string, data?: Record<string, unknown>): void
	error(message: string, data?: Record<string, unknown>): void
	fatal(message: string, data?: Record<string, unknown>): void
	log(level: LogLevel, message: string, data?: Record<string, unknown>): void
	setLevel(level: LogLevel): void
	child(context: Record<string, unknown>): Logger
	flush(): Promise<void>
	close(): Promise<void>
}
