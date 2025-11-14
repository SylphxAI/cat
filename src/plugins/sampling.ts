import type { LogEntry, Plugin } from "../core/types"

export interface SamplingPluginOptions {
	rate: number // 0.0 to 1.0
}

export class SamplingPlugin implements Plugin {
	name = "sampling"
	private rate: number

	constructor(options: SamplingPluginOptions) {
		this.rate = Math.max(0, Math.min(1, options.rate))
	}

	onLog(entry: LogEntry): LogEntry | null {
		// Always log error and fatal
		if (entry.level === "error" || entry.level === "fatal") {
			return entry
		}

		// Sample other levels
		return Math.random() < this.rate ? entry : null
	}
}

export function samplingPlugin(rate: number): Plugin {
	return new SamplingPlugin({ rate })
}
