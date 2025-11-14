import type { Formatter, LogEntry, LogLevel } from "../core/types"

const COLORS = {
	reset: "\x1b[0m",
	trace: "\x1b[90m", // gray
	debug: "\x1b[36m", // cyan
	info: "\x1b[32m", // green
	warn: "\x1b[33m", // yellow
	error: "\x1b[31m", // red
	fatal: "\x1b[35m", // magenta
	time: "\x1b[90m", // gray
	msg: "\x1b[37m", // white
}

const LEVEL_LABELS: Record<LogLevel, string> = {
	trace: "TRC",
	debug: "DBG",
	info: "INF",
	warn: "WRN",
	error: "ERR",
	fatal: "FTL",
}

export interface PrettyFormatterOptions {
	colors?: boolean
	timestamp?: boolean
	timestampFormat?: "iso" | "unix" | "relative"
}

export class PrettyFormatter implements Formatter {
	private colors: boolean
	private timestamp: boolean
	private timestampFormat: "iso" | "unix" | "relative"
	private startTime: number

	constructor(options: PrettyFormatterOptions = {}) {
		this.colors = options.colors ?? true
		this.timestamp = options.timestamp ?? true
		this.timestampFormat = options.timestampFormat ?? "iso"
		this.startTime = Date.now()
	}

	format(entry: LogEntry): string {
		const parts: string[] = []

		// Timestamp
		if (this.timestamp) {
			const time = this.formatTime(entry.timestamp)
			parts.push(this.colorize(time, "time"))
		}

		// Level
		const levelLabel = LEVEL_LABELS[entry.level]
		parts.push(this.colorize(levelLabel, entry.level))

		// Message
		parts.push(this.colorize(entry.message, "msg"))

		// Data
		if (entry.data && Object.keys(entry.data).length > 0) {
			parts.push(this.formatData(entry.data))
		}

		// Context
		if (entry.context && Object.keys(entry.context).length > 0) {
			parts.push(this.formatContext(entry.context))
		}

		return parts.join(" ")
	}

	private formatTime(timestamp: number): string {
		switch (this.timestampFormat) {
			case "iso":
				return new Date(timestamp).toISOString()
			case "unix":
				return timestamp.toString()
			case "relative":
				return `+${timestamp - this.startTime}ms`
			default:
				return timestamp.toString()
		}
	}

	private formatData(data: Record<string, unknown>): string {
		try {
			return JSON.stringify(data)
		} catch {
			return "[Circular]"
		}
	}

	private formatContext(context: Record<string, unknown>): string {
		const pairs = Object.entries(context).map(([key, value]) => `${key}=${value}`)
		return `[${pairs.join(" ")}]`
	}

	private colorize(text: string, type: keyof typeof COLORS): string {
		if (!this.colors) return text
		const color = COLORS[type] || COLORS.reset
		return `${color}${text}${COLORS.reset}`
	}
}

export function prettyFormatter(options?: PrettyFormatterOptions): Formatter {
	return new PrettyFormatter(options)
}
