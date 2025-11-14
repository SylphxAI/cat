/**
 * Pure Functions Refactoring Example
 *
 * Demonstrates how to refactor the logger to use pure functions
 * where possible, with side effects clearly isolated.
 */

import type { LogEntry, LogLevel, Plugin } from "../src/core/types"

// ============================================================================
// PURE LAYER - 100% Testable, No Side Effects
// ============================================================================

/**
 * Pure: Create log entry from inputs
 */
export function createLogEntry(
	level: LogLevel,
	message: string,
	data?: Record<string, unknown>,
	context?: Record<string, unknown>,
): LogEntry {
	return {
		level,
		timestamp: Date.now(), // Only time-based impurity (unavoidable)
		message,
		data,
		context: context ?? {},
	}
}

/**
 * Pure: Apply single plugin to entry
 */
export function applyPlugin(entry: LogEntry, plugin: Plugin): LogEntry | null {
	if (!plugin.onLog) return entry
	return plugin.onLog(entry)
}

/**
 * Pure: Apply all plugins in sequence (functional pipeline)
 */
export function applyPlugins(entry: LogEntry, plugins: Plugin[]): LogEntry | null {
	return plugins.reduce((acc, plugin) => {
		if (acc === null) return null // Plugin filtered it out
		return applyPlugin(acc, plugin)
	}, entry as LogEntry | null)
}

/**
 * Pure: Format entry as JSON string
 */
export function formatJSON(entry: LogEntry): string {
	return JSON.stringify({
		level: entry.level,
		time: entry.timestamp,
		msg: entry.message,
		...(entry.data && { data: entry.data }),
		...(entry.context && Object.keys(entry.context).length > 0 && entry.context),
	})
}

/**
 * Pure: Format entry as pretty string (with injected dependencies)
 */
export function formatPretty(
	entry: LogEntry,
	options: {
		colors?: boolean
		timestampFormat?: "iso" | "unix"
	} = {},
): string {
	const parts: string[] = []

	// Timestamp
	const timestamp =
		options.timestampFormat === "iso"
			? new Date(entry.timestamp).toISOString()
			: entry.timestamp.toString()
	parts.push(timestamp)

	// Level
	parts.push(`[${entry.level.toUpperCase()}]`)

	// Message
	parts.push(entry.message)

	// Data
	if (entry.data && Object.keys(entry.data).length > 0) {
		parts.push(JSON.stringify(entry.data))
	}

	// Context
	if (entry.context && Object.keys(entry.context).length > 0) {
		const contextStr = Object.entries(entry.context)
			.map(([k, v]) => `${k}=${v}`)
			.join(" ")
		parts.push(`[${contextStr}]`)
	}

	return parts.join(" ")
}

/**
 * Pure: Serialize Error object
 */
export interface ErrorSerialized {
	type: string
	message: string
	stack?: string
	cause?: ErrorSerialized
	[key: string]: unknown
}

export function serializeError(error: Error): ErrorSerialized {
	const result: ErrorSerialized = {
		type: error.name || "Error",
		message: error.message,
	}

	// Stack trace
	if (error.stack) {
		result.stack = error.stack
	}

	// Error cause (recursive)
	if (error.cause instanceof Error) {
		result.cause = serializeError(error.cause)
	}

	// Custom properties
	for (const key in error) {
		if (!["name", "message", "stack", "cause"].includes(key)) {
			result[key] = (error as any)[key]
		}
	}

	return result
}

/**
 * Pure: Apply custom serializers to data
 */
export type Serializer<T = any> = (value: T) => any

export function applySerializers(
	data: Record<string, unknown>,
	serializers: Record<string, Serializer>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(data)) {
		// Check for registered serializer
		if (serializers[key]) {
			result[key] = serializers[key](value)
			continue
		}

		// Auto-detect Error
		if (value instanceof Error) {
			result[key] = serializeError(value)
			continue
		}

		// Recursively serialize nested objects
		if (typeof value === "object" && value !== null && !Array.isArray(value)) {
			result[key] = applySerializers(value as Record<string, unknown>, serializers)
		} else {
			result[key] = value
		}
	}

	return result
}

/**
 * Pure: Sanitize log message to prevent log injection
 */
export function sanitizeLogMessage(message: string): string {
	// Remove CR/LF to prevent log injection attacks
	return message.replace(/[\r\n]/g, " ")
}

/**
 * Pure: Validate message length
 */
export function validateMessage(message: string, maxLength: number): string {
	if (message.length > maxLength) {
		return message.slice(0, maxLength) + "..."
	}
	return message
}

/**
 * Pure: Redact sensitive data by path
 */
export function redactByPath(
	data: Record<string, unknown>,
	paths: string[],
	replacement = "[REDACTED]",
): Record<string, unknown> {
	const result = { ...data }

	for (const path of paths) {
		const keys = path.split(".")
		let current: any = result

		for (let i = 0; i < keys.length - 1; i++) {
			if (current[keys[i]] === undefined) break
			current = current[keys[i]]
		}

		const lastKey = keys[keys.length - 1]
		if (current && current[lastKey] !== undefined) {
			current[lastKey] = replacement
		}
	}

	return result
}

/**
 * Pure: Redact by regex pattern
 */
export function redactByPattern(
	value: string,
	patterns: RegExp[],
	replacement = "[REDACTED]",
): string {
	let result = value
	for (const pattern of patterns) {
		result = result.replace(pattern, replacement)
	}
	return result
}

// ============================================================================
// FUNCTIONAL COMPOSITION UTILITIES
// ============================================================================

/**
 * Pipe functions left to right
 */
export function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
	return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg)
}

/**
 * Compose functions right to left
 */
export function compose<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
	return (arg: T) => fns.reduceRight((acc, fn) => fn(acc), arg)
}

/**
 * Memoize pure function results
 */
export function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
	const cache = new Map<T, R>()
	return (arg: T): R => {
		if (cache.has(arg)) {
			return cache.get(arg)!
		}
		const result = fn(arg)
		cache.set(arg, result)
		return result
	}
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Pure transformation pipeline
export function processPureLogEntry(
	level: LogLevel,
	message: string,
	data: Record<string, unknown>,
): string {
	// All pure functions - easy to test, no side effects
	const sanitized = sanitizeLogMessage(message)
	const validated = validateMessage(sanitized, 1000)

	const entry = createLogEntry(level, validated, data)
	const formatted = formatJSON(entry)

	return formatted
}

// Example 2: Functional composition
export function createLogProcessor(
	plugins: Plugin[],
	serializers: Record<string, Serializer> = {},
) {
	return (entry: LogEntry): string | null => {
		// Pure pipeline
		const pipeline = pipe<LogEntry | null>(
			(e) => (e ? { ...e, message: sanitizeLogMessage(e.message) } : null),
			(e) => (e && e.data ? { ...e, data: applySerializers(e.data, serializers) } : e),
			(e) => (e ? applyPlugins(e, plugins) : null),
		)

		const processed = pipeline(entry)
		return processed ? formatJSON(processed) : null
	}
}

// Example 3: Memoized formatter (performance optimization)
export const memoizedJSONFormat = memoize(formatJSON)

// Example 4: Testing pure functions (no mocks needed!)
export function testPureFunctions() {
	// Test 1: Error serialization
	const error = new Error("Test error")
	const serialized = serializeError(error)
	console.assert(serialized.type === "Error")
	console.assert(serialized.message === "Test error")

	// Test 2: Log injection prevention
	const malicious = "Normal message\nINJECTED LOG ENTRY"
	const safe = sanitizeLogMessage(malicious)
	console.assert(!safe.includes("\n"))

	// Test 3: Data redaction
	const data = { password: "secret123", username: "john" }
	const redacted = redactByPath(data, ["password"])
	console.assert(redacted.password === "[REDACTED]")
	console.assert(redacted.username === "john")

	// Test 4: Functional pipeline
	const entry = createLogEntry("info", "test", { key: "value" })
	const formatted = formatJSON(entry)
	console.assert(formatted.includes('"msg":"test"'))

	console.log("✅ All pure function tests passed!")
}

// ============================================================================
// IMPURE LAYER - Side Effects Clearly Isolated
// ============================================================================

/**
 * Impure: Write to console (side effect)
 */
export function writeToConsole(formatted: string): void {
	console.log(formatted)
}

/**
 * Impure: Write to file (side effect)
 */
export async function writeToFile(formatted: string, path: string): Promise<void> {
	const fs = await import("node:fs/promises")
	await fs.appendFile(path, `${formatted}\n`)
}

/**
 * Impure: Logger class (orchestrates pure functions + side effects)
 */
export class PureLogger {
	constructor(
		private plugins: Plugin[] = [],
		private serializers: Record<string, Serializer> = {},
		private writer: (msg: string) => void = writeToConsole,
	) {}

	// Impure: Main entry point with side effects
	log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
		// Use pure functions for all transformations
		const sanitized = sanitizeLogMessage(message)
		const validated = validateMessage(sanitized, 10000)

		const entry = createLogEntry(level, validated, data)

		// Apply serializers (pure)
		const withSerializers = entry.data
			? { ...entry, data: applySerializers(entry.data, this.serializers) }
			: entry

		// Apply plugins (pure)
		const processed = applyPlugins(withSerializers, this.plugins)
		if (processed === null) return // Filtered out

		// Format (pure)
		const formatted = formatJSON(processed)

		// ONLY side effect: write to output
		this.writer(formatted)
	}

	info(message: string, data?: Record<string, unknown>): void {
		this.log("info", message, data)
	}

	error(message: string, data?: Record<string, unknown>): void {
		this.log("error", message, data)
	}
}

// ============================================================================
// PERFORMANCE COMPARISON
// ============================================================================

export function benchmarkPureFunctions() {
	const iterations = 1_000_000
	const entry = createLogEntry("info", "test message", { key: "value" })

	console.log("Benchmarking pure functions...")

	// Benchmark 1: Direct formatting
	console.time("Direct format")
	for (let i = 0; i < iterations; i++) {
		formatJSON(entry)
	}
	console.timeEnd("Direct format")

	// Benchmark 2: Memoized formatting (same input)
	console.time("Memoized format")
	for (let i = 0; i < iterations; i++) {
		memoizedJSONFormat(entry)
	}
	console.timeEnd("Memoized format")
	// Should be MUCH faster for repeated calls

	// Benchmark 3: Pure pipeline
	console.time("Pure pipeline")
	const processor = createLogProcessor([], {})
	for (let i = 0; i < iterations; i++) {
		processor(entry)
	}
	console.timeEnd("Pure pipeline")
}

// Run tests if executed directly
if (import.meta.main) {
	testPureFunctions()
	benchmarkPureFunctions()
}
