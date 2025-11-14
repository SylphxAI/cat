/**
 * W3C Trace Context Support
 *
 * Implements W3C Trace Context specification for distributed tracing
 * https://www.w3.org/TR/trace-context/
 *
 * Traceparent header format:
 * 00-{trace-id}-{span-id}-{trace-flags}
 *
 * Example:
 * 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 */

export interface TraceContext {
	traceId: string // 32 hex chars (16 bytes)
	spanId: string // 16 hex chars (8 bytes)
	traceFlags: number // 1 byte (00 or 01)
	traceState?: string // Optional vendor-specific data
}

/**
 * W3C Trace Context version
 */
const VERSION = "00"

/**
 * Trace flags
 */
export const TraceFlags = {
	NONE: 0x00,
	SAMPLED: 0x01,
} as const

/**
 * Generate a random hex string of specified length
 */
function randomHex(length: number): string {
	const bytes = new Uint8Array(length / 2)
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		crypto.getRandomValues(bytes)
	} else {
		// Fallback for older environments
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = Math.floor(Math.random() * 256)
		}
	}
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Generate a trace ID (32 hex chars)
 *
 * Pure function with random output (unavoidable for ID generation)
 */
export function generateTraceId(): string {
	return randomHex(32)
}

/**
 * Generate a span ID (16 hex chars)
 *
 * Pure function with random output (unavoidable for ID generation)
 */
export function generateSpanId(): string {
	return randomHex(16)
}

/**
 * Validate trace ID format
 */
export function isValidTraceId(traceId: string): boolean {
	// Must be 32 hex chars and not all zeros
	return /^[0-9a-f]{32}$/.test(traceId) && traceId !== "00000000000000000000000000000000"
}

/**
 * Validate span ID format
 */
export function isValidSpanId(spanId: string): boolean {
	// Must be 16 hex chars and not all zeros
	return /^[0-9a-f]{16}$/.test(spanId) && spanId !== "0000000000000000"
}

/**
 * Parse traceparent header
 *
 * Format: version-trace-id-parent-id-trace-flags
 * Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 *
 * Pure function: same input → same output
 */
export function parseTraceparent(header: string): TraceContext | null {
	if (!header || typeof header !== "string") {
		return null
	}

	const parts = header.split("-")

	// Must have exactly 4 parts
	if (parts.length !== 4) {
		return null
	}

	const [version, traceId, spanId, flags] = parts

	// Check version (currently only 00 is supported)
	if (version !== VERSION) {
		return null
	}

	// Validate trace ID
	if (!isValidTraceId(traceId)) {
		return null
	}

	// Validate span ID
	if (!isValidSpanId(spanId)) {
		return null
	}

	// Parse flags (must be 2 hex chars)
	if (!/^[0-9a-f]{2}$/.test(flags)) {
		return null
	}

	const traceFlags = Number.parseInt(flags, 16)

	return {
		traceId,
		spanId,
		traceFlags,
	}
}

/**
 * Format trace context as traceparent header
 *
 * Pure function: deterministic output
 */
export function formatTraceparent(context: TraceContext): string {
	const flags = context.traceFlags.toString(16).padStart(2, "0")
	return `${VERSION}-${context.traceId}-${context.spanId}-${flags}`
}

/**
 * Parse tracestate header
 *
 * Format: key1=value1,key2=value2
 * Example: vendor1=value1,vendor2=value2
 */
export function parseTracestate(header: string): Record<string, string> {
	if (!header || typeof header !== "string") {
		return {}
	}

	const result: Record<string, string> = {}
	const pairs = header.split(",")

	for (const pair of pairs) {
		const trimmed = pair.trim()
		const index = trimmed.indexOf("=")

		if (index === -1) continue

		const key = trimmed.slice(0, index).trim()
		const value = trimmed.slice(index + 1).trim()

		if (key && value) {
			result[key] = value
		}
	}

	return result
}

/**
 * Format tracestate as header string
 */
export function formatTracestate(state: Record<string, string>): string {
	const pairs = Object.entries(state).map(([key, value]) => `${key}=${value}`)
	return pairs.join(",")
}

/**
 * Create a new trace context
 *
 * If parent is provided, uses the same trace ID but generates new span ID
 */
export function createTraceContext(parent?: TraceContext): TraceContext {
	if (parent) {
		return {
			traceId: parent.traceId,
			spanId: generateSpanId(),
			traceFlags: parent.traceFlags,
			traceState: parent.traceState,
		}
	}

	return {
		traceId: generateTraceId(),
		spanId: generateSpanId(),
		traceFlags: TraceFlags.SAMPLED,
	}
}

/**
 * Check if trace is sampled
 */
export function isSampled(context: TraceContext): boolean {
	return (context.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED
}

/**
 * Set sampled flag
 */
export function setSampled(context: TraceContext, sampled: boolean): TraceContext {
	return {
		...context,
		traceFlags: sampled ? context.traceFlags | TraceFlags.SAMPLED : context.traceFlags & ~TraceFlags.SAMPLED,
	}
}
