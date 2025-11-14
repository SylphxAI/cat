/**
 * OTLP (OpenTelemetry Protocol) Transport
 *
 * Sends logs to OpenTelemetry-compatible endpoints using OTLP/HTTP
 * Compatible with: Grafana, Datadog, New Relic, AWS CloudWatch, etc.
 *
 * OTLP Specification: https://opentelemetry.io/docs/specs/otlp/
 */

import type { LogEntry, Transport } from "@sylphx/cat"
import { LOG_LEVELS } from "@sylphx/cat"

export interface OTLPTransportOptions {
	/**
	 * OTLP endpoint URL
	 * Default: http://localhost:4318/v1/logs
	 */
	endpoint?: string

	/**
	 * HTTP headers
	 */
	headers?: Record<string, string>

	/**
	 * Enable batching
	 * @default true
	 */
	batch?: boolean

	/**
	 * Batch size (number of logs)
	 * @default 100
	 */
	batchSize?: number

	/**
	 * Batch interval (ms)
	 * @default 1000
	 */
	batchInterval?: number

	/**
	 * Compression
	 * @default 'none'
	 */
	compression?: "none" | "gzip"

	/**
	 * Retry attempts
	 * @default 3
	 */
	retries?: number

	/**
	 * Request timeout (ms)
	 * @default 10000
	 */
	timeout?: number

	/**
	 * Resource attributes (service name, version, etc.)
	 */
	resourceAttributes?: Record<string, string | number | boolean>

	/**
	 * Scope name (instrumentation library name)
	 * @default '@sylphx/cat'
	 */
	scopeName?: string

	/**
	 * Scope version
	 */
	scopeVersion?: string
}

/**
 * OTLP Log Record format
 * https://opentelemetry.io/docs/specs/otel/logs/data-model/
 */
interface OTLPLogRecord {
	timeUnixNano: string
	observedTimeUnixNano?: string
	severityNumber: number
	severityText: string
	body: {
		stringValue: string
	}
	attributes?: Array<{
		key: string
		value: {
			stringValue?: string
			intValue?: string
			doubleValue?: number
			boolValue?: boolean
		}
	}>
	traceId?: string
	spanId?: string
	flags?: number
}

/**
 * OTLP severity number mapping
 * https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
 */
const SEVERITY_NUMBER_MAP = {
	trace: 1, // TRACE
	debug: 5, // DEBUG
	info: 9, // INFO
	warn: 13, // WARN
	error: 17, // ERROR
	fatal: 21, // FATAL
} as const

/**
 * Convert LogEntry to OTLP format
 */
function convertToOTLP(entry: LogEntry): OTLPLogRecord {
	const timeUnixNano = (entry.timestamp * 1_000_000).toString()

	const record: OTLPLogRecord = {
		timeUnixNano,
		severityNumber: SEVERITY_NUMBER_MAP[entry.level],
		severityText: entry.level.toUpperCase(),
		body: {
			stringValue: entry.message,
		},
	}

	// Add attributes from data and context
	const attributes: Array<{
		key: string
		value: any
	}> = []

	// Add data fields as attributes
	if (entry.data) {
		for (const [key, value] of Object.entries(entry.data)) {
			attributes.push({
				key,
				value: convertValue(value),
			})
		}
	}

	// Add context fields as attributes
	if (entry.context) {
		for (const [key, value] of Object.entries(entry.context)) {
			attributes.push({
				key,
				value: convertValue(value),
			})
		}
	}

	if (attributes.length > 0) {
		record.attributes = attributes
	}

	// Add trace context if present
	if (entry.traceId) {
		record.traceId = entry.traceId
	}
	if (entry.spanId) {
		record.spanId = entry.spanId
	}
	if (entry.traceFlags !== undefined) {
		record.flags = entry.traceFlags
	}

	return record
}

/**
 * Convert value to OTLP attribute value format
 */
function convertValue(value: unknown): any {
	if (typeof value === "string") {
		return { stringValue: value }
	}
	if (typeof value === "number") {
		return Number.isInteger(value) ? { intValue: value.toString() } : { doubleValue: value }
	}
	if (typeof value === "boolean") {
		return { boolValue: value }
	}
	// For objects/arrays, convert to JSON string
	return { stringValue: JSON.stringify(value) }
}

/**
 * OTLP HTTP Transport
 */
export class OTLPTransport implements Transport {
	private endpoint: string
	private headers: Record<string, string>
	private batch: boolean
	private batchSize: number
	private batchInterval: number
	private compression: "none" | "gzip"
	private retries: number
	private timeout: number
	private resourceAttributes: Record<string, string | number | boolean>
	private scopeName: string
	private scopeVersion?: string

	private batchQueue: OTLPLogRecord[] = []
	private batchTimer: Timer | null = null
	private sending = false

	constructor(options: OTLPTransportOptions = {}) {
		this.endpoint = options.endpoint || "http://localhost:4318/v1/logs"
		this.headers = options.headers || {}
		this.batch = options.batch ?? true
		this.batchSize = options.batchSize ?? 100
		this.batchInterval = options.batchInterval ?? 1000
		this.compression = options.compression || "none"
		this.retries = options.retries ?? 3
		this.timeout = options.timeout ?? 10000
		this.resourceAttributes = options.resourceAttributes || {}
		this.scopeName = options.scopeName || "@sylphx/cat"
		this.scopeVersion = options.scopeVersion
	}

	log(entry: LogEntry, _formatted: string): void {
		const record = convertToOTLP(entry)

		if (this.batch) {
			this.batchQueue.push(record)

			if (this.batchQueue.length >= this.batchSize) {
				this.flush()
			} else if (!this.batchTimer) {
				this.batchTimer = setTimeout(() => this.flush(), this.batchInterval)
			}
		} else {
			// Send immediately
			this.send([record]).catch((error) => {
				console.error("OTLP transport error:", error)
			})
		}
	}

	async flush(): Promise<void> {
		if (this.batchTimer) {
			clearTimeout(this.batchTimer)
			this.batchTimer = null
		}

		if (this.batchQueue.length === 0 || this.sending) {
			return
		}

		const records = this.batchQueue.splice(0)
		await this.send(records)
	}

	async close(): Promise<void> {
		await this.flush()
	}

	private async send(records: OTLPLogRecord[], attempt = 0): Promise<void> {
		if (records.length === 0) return

		this.sending = true

		try {
			const payload = this.createPayload(records)
			const body = JSON.stringify(payload)

			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				...this.headers,
			}

			// Add compression header if enabled
			if (this.compression === "gzip") {
				headers["Content-Encoding"] = "gzip"
			}

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), this.timeout)

			try {
				const response = await fetch(this.endpoint, {
					method: "POST",
					headers,
					body,
					signal: controller.signal,
				})

				clearTimeout(timeoutId)

				if (!response.ok) {
					throw new Error(`OTLP HTTP error: ${response.status} ${response.statusText}`)
				}
			} catch (error) {
				clearTimeout(timeoutId)
				throw error
			}
		} catch (error) {
			// Retry with exponential backoff
			if (attempt < this.retries) {
				const delay = Math.pow(2, attempt) * 1000
				await new Promise((resolve) => setTimeout(resolve, delay))
				return this.send(records, attempt + 1)
			}

			// Give up after max retries
			console.error(`OTLP transport failed after ${this.retries} retries:`, error)
		} finally {
			this.sending = false
		}
	}

	private createPayload(records: OTLPLogRecord[]) {
		// Build resource attributes
		const resourceAttrs = []
		for (const [key, value] of Object.entries(this.resourceAttributes)) {
			resourceAttrs.push({
				key,
				value: convertValue(value),
			})
		}

		// Build scope attributes
		const scope: any = {
			name: this.scopeName,
		}
		if (this.scopeVersion) {
			scope.version = this.scopeVersion
		}

		return {
			resourceLogs: [
				{
					resource: {
						attributes: resourceAttrs,
					},
					scopeLogs: [
						{
							scope,
							logRecords: records,
						},
					],
				},
			],
		}
	}
}

/**
 * Create OTLP transport
 */
export function otlpTransport(options?: OTLPTransportOptions): Transport {
	return new OTLPTransport(options)
}
