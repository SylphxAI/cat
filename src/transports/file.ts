import type { LogEntry, Transport } from "../core/types"

export interface FileTransportOptions {
	path: string
	mode?: number
	flags?: string
}

export class FileTransport implements Transport {
	private path: string
	private file: any
	private writeQueue: string[] = []
	private writePromise: Promise<void> | null = null

	constructor(options: FileTransportOptions) {
		this.path = options.path
		this.initFile(options)
	}

	private initFile(options: FileTransportOptions): void {
		// Lazy file opening - will be opened on first write
		try {
			// Check if we're in Bun/Node environment
			if (typeof Bun !== "undefined") {
				this.file = Bun.file(this.path)
			} else if (typeof process !== "undefined") {
				// Node.js environment - use dynamic import
				import("node:fs").then((fs) => {
					this.file = fs.createWriteStream(this.path, {
						flags: options.flags || "a",
						mode: options.mode || 0o666,
					})
				})
			}
		} catch {
			console.error(`Failed to initialize file transport: ${this.path}`)
		}
	}

	log(_entry: LogEntry, formatted: string): void {
		this.writeQueue.push(`${formatted}\n`)
		if (!this.writePromise) {
			this.writePromise = this.processQueue()
		}
	}

	private async processQueue(): Promise<void> {
		// Keep processing while there are items in the queue
		while (this.writeQueue.length > 0) {
			const lines = this.writeQueue.splice(0)
			const content = lines.join("")

			try {
				if (typeof Bun !== "undefined") {
					// Use appendFile for Bun
					const fs = await import("node:fs/promises")
					await fs.appendFile(this.path, content)
				} else if (this.file?.write) {
					// For Node.js streams, wrap in promise
					await new Promise<void>((resolve, reject) => {
						this.file.write(content, (err: Error | null | undefined) => {
							if (err) reject(err)
							else resolve()
						})
					})
				}
			} catch (error) {
				console.error("Failed to write to log file:", error)
			}
		}

		this.writePromise = null
	}

	async flush(): Promise<void> {
		// Wait for any pending writes
		if (this.writePromise) {
			await this.writePromise
		}
		// Process any remaining items
		if (this.writeQueue.length > 0) {
			await this.processQueue()
		}
	}

	async close(): Promise<void> {
		await this.flush()
		if (this.file?.end) {
			this.file.end()
		}
	}
}

export function fileTransport(options: FileTransportOptions): Transport {
	return new FileTransport(options)
}
