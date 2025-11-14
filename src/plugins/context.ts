import type { LogEntry, Plugin } from "../core/types"

export interface ContextPluginOptions {
	context: Record<string, unknown>
}

export class ContextPlugin implements Plugin {
	name = "context"
	private context: Record<string, unknown>

	constructor(options: ContextPluginOptions) {
		this.context = options.context
	}

	onLog(entry: LogEntry): LogEntry {
		return {
			...entry,
			context: {
				...this.context,
				...entry.context,
			},
		}
	}
}

export function contextPlugin(context: Record<string, unknown>): Plugin {
	return new ContextPlugin({ context })
}
