/**
 * Error Serialization
 *
 * Pure functions for serializing Error objects with:
 * - Stack traces
 * - Error causes (recursive)
 * - Custom properties
 * - Safe handling of circular references
 */

export interface SerializedError {
	type: string
	message: string
	stack?: string
	cause?: SerializedError
	code?: string
	[key: string]: unknown
}

/**
 * Serialize an Error object to a plain object
 *
 * Pure function: Same error → same output
 *
 * @param error - Error object to serialize
 * @param maxDepth - Maximum depth for cause chain (prevent infinite recursion)
 * @returns Serialized error object
 */
export function serializeError(error: Error, maxDepth = 10): SerializedError {
	const result: SerializedError = {
		type: error.name || "Error",
		message: error.message,
	}

	// Stack trace
	if (error.stack) {
		result.stack = error.stack
	}

	// Error code (common in Node.js)
	if ("code" in error && error.code) {
		result.code = String(error.code)
	}

	// Error cause (recursive, with depth limit)
	if (maxDepth > 0 && error.cause instanceof Error) {
		result.cause = serializeError(error.cause, maxDepth - 1)
	}

	// Custom properties (enumerable only)
	// Use try-catch to handle circular references
	try {
		for (const key in error) {
			if (Object.prototype.hasOwnProperty.call(error, key)) {
				// Skip standard properties
				if (["name", "message", "stack", "cause", "code"].includes(key)) {
					continue
				}

				// Get property value
				const value = (error as any)[key]

				// Skip circular references (simple check)
				if (value === error) {
					result[key] = "[Circular]"
					continue
				}

				// Serialize nested errors
				if (value instanceof Error) {
					result[key] = serializeError(value, maxDepth - 1)
				} else if (typeof value === "object" && value !== null) {
					// Skip complex objects that might be circular
					result[key] = "[Object]"
				} else {
					result[key] = value
				}
			}
		}
	} catch (e) {
		// If we hit any error (like circular reference), just skip remaining properties
	}

	return result
}

/**
 * Check if a value is an Error instance
 *
 * @param value - Value to check
 * @returns True if value is an Error
 */
export function isError(value: unknown): value is Error {
	return value instanceof Error
}

/**
 * Auto-serialize errors in data object
 *
 * Recursively finds and serializes all Error instances in an object
 *
 * @param data - Data object potentially containing errors
 * @param maxDepth - Maximum recursion depth
 * @returns New object with errors serialized
 */
export function autoSerializeErrors(
	data: Record<string, unknown>,
	maxDepth = 5,
): Record<string, unknown> {
	if (maxDepth <= 0) return data

	const result: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(data)) {
		if (isError(value)) {
			// Serialize error
			result[key] = serializeError(value)
		} else if (Array.isArray(value)) {
			// Handle arrays
			result[key] = value.map((item) =>
				isError(item)
					? serializeError(item)
					: typeof item === "object" && item !== null
						? autoSerializeErrors(item as Record<string, unknown>, maxDepth - 1)
						: item,
			)
		} else if (typeof value === "object" && value !== null) {
			// Recursively handle nested objects
			result[key] = autoSerializeErrors(value as Record<string, unknown>, maxDepth - 1)
		} else {
			// Primitive values
			result[key] = value
		}
	}

	return result
}

/**
 * Format error for human-readable output
 *
 * @param error - Error to format
 * @returns Formatted error string
 */
export function formatError(error: Error): string {
	const parts: string[] = []

	parts.push(`${error.name}: ${error.message}`)

	if (error.stack) {
		parts.push(error.stack)
	}

	if (error.cause instanceof Error) {
		parts.push("\nCaused by:")
		parts.push(formatError(error.cause))
	}

	return parts.join("\n")
}
