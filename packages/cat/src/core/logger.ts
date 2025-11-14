import type { LogEntry, Logger, LoggerOptions, LogLevel, Plugin, Transport } from "./types"
import { LOG_LEVELS } from "./types"

export class FastLogger implements Logger {
	private level: LogLevel
	private levelValue: number
	private formatter: LoggerOptions["formatter"]
	private transports: Transport[]
	private plugins: Plugin[]
	private context: Record<string, unknown>
	private batch: boolean
	private batchSize: number
	private batchInterval: number
	private batchQueue: LogEntry[] = []
	private batchTimer: Timer | null = null

	constructor(options: LoggerOptions = {}) {
		this.level = options.level ?? "info"
		this.levelValue = LOG_LEVELS[this.level]
		this.formatter = options.formatter
		this.transports = options.transports ?? []
		this.plugins = options.plugins ?? []
		this.context = options.context ?? {}
		this.batch = options.batch ?? false
		this.batchSize = options.batchSize ?? 100
		this.batchInterval = options.batchInterval ?? 1000

		// Initialize plugins
		for (const plugin of this.plugins) {
			plugin.onInit?.(this)
		}
	}

	setLevel(level: LogLevel): void {
		this.level = level
		this.levelValue = LOG_LEVELS[level]
	}

	trace(message: string, data?: Record<string, unknown>): void {
		this.log("trace", message, data)
	}

	debug(message: string, data?: Record<string, unknown>): void {
		this.log("debug", message, data)
	}

	info(message: string, data?: Record<string, unknown>): void {
		this.log("info", message, data)
	}

	warn(message: string, data?: Record<string, unknown>): void {
		this.log("warn", message, data)
	}

	error(message: string, data?: Record<string, unknown>): void {
		this.log("error", message, data)
	}

	fatal(message: string, data?: Record<string, unknown>): void {
		this.log("fatal", message, data)
	}

	log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
		// FAST PATH: Level check - bail early if below threshold
		if (LOG_LEVELS[level] < this.levelValue) return

		// Create log entry
		let entry: LogEntry = {
			level,
			timestamp: Date.now(),
			message,
			data,
			context: this.context,
		}

		// Apply plugins
		for (const plugin of this.plugins) {
			if (plugin.onLog) {
				const result = plugin.onLog(entry)
				if (result === null) return // Plugin filtered out this log
				entry = result
			}
		}

		// Batch or immediate processing
		if (this.batch) {
			this.batchQueue.push(entry)
			if (this.batchQueue.length >= this.batchSize) {
				this.flushBatch()
			} else if (!this.batchTimer) {
				this.batchTimer = setTimeout(() => this.flushBatch(), this.batchInterval)
			}
		} else {
			this.processEntry(entry)
		}
	}

	private processEntry(entry: LogEntry): void {
		const formatted = this.formatter ? this.formatter.format(entry) : this.defaultFormat(entry)

		for (const transport of this.transports) {
			transport.log(entry, formatted)
		}
	}

	private flushBatch(): void {
		if (this.batchTimer) {
			clearTimeout(this.batchTimer)
			this.batchTimer = null
		}

		const entries = this.batchQueue.splice(0)
		for (const entry of entries) {
			this.processEntry(entry)
		}
	}

	private defaultFormat(entry: LogEntry): string {
		return JSON.stringify(entry)
	}

	child(context: Record<string, unknown>): Logger {
		return new FastLogger({
			level: this.level,
			formatter: this.formatter,
			transports: this.transports,
			plugins: this.plugins,
			context: { ...this.context, ...context },
			batch: this.batch,
			batchSize: this.batchSize,
			batchInterval: this.batchInterval,
		})
	}

	async flush(): Promise<void> {
		if (this.batch) {
			this.flushBatch()
		}

		await Promise.all(this.transports.map((transport) => transport.flush?.()).filter(Boolean))
	}

	async close(): Promise<void> {
		await this.flush()

		await Promise.all(this.transports.map((transport) => transport.close?.()).filter(Boolean))

		for (const plugin of this.plugins) {
			plugin.onDestroy?.()
		}
	}
}

export function createLogger(options: LoggerOptions = {}): Logger {
	return new FastLogger(options)
}
