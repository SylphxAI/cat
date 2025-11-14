import type { LogEntry, Transport } from "../core/types"

export class ConsoleTransport implements Transport {
	log(entry: LogEntry, formatted: string): void {
		// Use appropriate console method based on level
		switch (entry.level) {
			case "trace":
			case "debug":
				console.debug(formatted)
				break
			case "info":
				console.info(formatted)
				break
			case "warn":
				console.warn(formatted)
				break
			case "error":
			case "fatal":
				console.error(formatted)
				break
			default:
				console.log(formatted)
		}
	}
}

export function consoleTransport(): Transport {
	return new ConsoleTransport()
}
