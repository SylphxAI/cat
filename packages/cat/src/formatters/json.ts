import type { Formatter, LogEntry } from "../core/types"

export class JsonFormatter implements Formatter {
	format(entry: LogEntry): string {
		return JSON.stringify({
			level: entry.level,
			time: entry.timestamp,
			msg: entry.message,
			...(entry.data && { data: entry.data }),
			...(entry.context && Object.keys(entry.context).length > 0 && entry.context),
		})
	}
}

export function jsonFormatter(): Formatter {
	return new JsonFormatter()
}
