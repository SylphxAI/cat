import type { LogEntry, Transport } from "../core/types"

export interface StreamTransportOptions {
	stream: WritableStream<string> | { write: (chunk: string) => void }
}

export class StreamTransport implements Transport {
	private stream: WritableStream<string> | { write: (chunk: string) => void }
	private writer?: WritableStreamDefaultWriter<string>

	constructor(options: StreamTransportOptions) {
		this.stream = options.stream

		if ("getWriter" in this.stream) {
			this.writer = this.stream.getWriter()
		}
	}

	log(_entry: LogEntry, formatted: string): void {
		if (this.writer) {
			this.writer.write(`${formatted}\n`)
		} else if ("write" in this.stream) {
			this.stream.write(`${formatted}\n`)
		}
	}

	async flush(): Promise<void> {
		if (this.writer) {
			await this.writer.ready
		}
	}

	async close(): Promise<void> {
		if (this.writer) {
			await this.writer.close()
		}
	}
}

export function streamTransport(options: StreamTransportOptions): Transport {
	return new StreamTransport(options)
}
