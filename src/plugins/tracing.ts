/**
 * Tracing Plugin
 *
 * Adds W3C Trace Context support to log entries
 * Automatically injects trace ID and span ID from:
 * - Environment/context
 * - HTTP headers (traceparent)
 * - Or generates new ones
 */

import type { LogEntry, Plugin } from "../core/types"
import {
	createTraceContext,
	formatTraceparent,
	parseTraceparent,
	type TraceContext,
} from "../tracing/context"

export interface TracingPluginOptions {
	/**
	 * Enable tracing
	 * @default true
	 */
	enabled?: boolean

	/**
	 * Auto-generate trace context if not present
	 * @default true
	 */
	generateTraceId?: boolean

	/**
	 * HTTP header to extract trace context from
	 * @default 'traceparent'
	 */
	traceparentHeader?: string

	/**
	 * Function to extract trace context from environment
	 * Useful for async context, request object, etc.
	 */
	getTraceContext?: () => TraceContext | null

	/**
	 * Include trace context in log entry
	 * @default true
	 */
	includeTraceContext?: boolean
}

export class TracingPlugin implements Plugin {
	name = "tracing"

	private enabled: boolean
	private generateTraceId: boolean
	private getTraceContext?: () => TraceContext | null
	private includeTraceContext: boolean

	// Cached trace context for current execution
	private currentContext: TraceContext | null = null

	constructor(options: TracingPluginOptions = {}) {
		this.enabled = options.enabled ?? true
		this.generateTraceId = options.generateTraceId ?? true
		this.getTraceContext = options.getTraceContext
		this.includeTraceContext = options.includeTraceContext ?? true
	}

	onLog(entry: LogEntry): LogEntry {
		if (!this.enabled) return entry

		// Get or generate trace context
		let context = this.getCurrentTraceContext()

		// If no context and generation disabled, return unchanged
		if (!context && !this.generateTraceId) {
			return entry
		}

		// Generate new context if needed
		if (!context) {
			context = createTraceContext()
			this.currentContext = context
		}

		// Add trace IDs to entry
		const enhanced: LogEntry = {
			...entry,
		}

		// Add trace ID and span ID as top-level fields
		// (This is the OpenTelemetry convention)
		if (this.includeTraceContext) {
			enhanced.traceId = context.traceId
			enhanced.spanId = context.spanId

			// Optionally add trace flags
			if (context.traceFlags !== undefined) {
				enhanced.traceFlags = context.traceFlags
			}
		}

		return enhanced
	}

	/**
	 * Get current trace context
	 */
	private getCurrentTraceContext(): TraceContext | null {
		// Try custom getter first
		if (this.getTraceContext) {
			const context = this.getTraceContext()
			if (context) return context
		}

		// Return cached context
		return this.currentContext
	}

	/**
	 * Set trace context (for manual control)
	 */
	setTraceContext(context: TraceContext | null): void {
		this.currentContext = context
	}

	/**
	 * Get current trace context (readonly)
	 */
	getContext(): TraceContext | null {
		return this.currentContext
	}

	/**
	 * Extract trace context from HTTP headers
	 */
	static fromHeaders(headers: Record<string, string | string[]>): TraceContext | null {
		const traceparent = headers.traceparent || headers.Traceparent

		if (!traceparent) return null

		const headerValue = Array.isArray(traceparent) ? traceparent[0] : traceparent

		return parseTraceparent(headerValue)
	}

	/**
	 * Inject trace context into HTTP headers
	 */
	static toHeaders(context: TraceContext): Record<string, string> {
		return {
			traceparent: formatTraceparent(context),
		}
	}
}

/**
 * Create tracing plugin
 */
export function tracingPlugin(options?: TracingPluginOptions): Plugin {
	return new TracingPlugin(options)
}
