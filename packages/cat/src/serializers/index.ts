/**
 * Custom Serializers
 *
 * Registry and application of custom serializers for specific data types
 */

import { autoSerializeErrors, formatError, isError, serializeError } from "./error"
import type { SerializedError } from "./error"

export type { SerializedError }
export { autoSerializeErrors, formatError, isError, serializeError }

/**
 * Serializer function type
 */
export type Serializer<T = any> = (value: T) => any

/**
 * Serializer registry
 */
export interface SerializerRegistry {
	[key: string]: Serializer
}

/**
 * Apply custom serializers to a data object
 *
 * Pure function: deterministic transformation
 *
 * @param data - Data object to serialize
 * @param serializers - Registry of serializers by key
 * @returns New object with serializers applied
 */
export function applySerializers(
	data: Record<string, unknown>,
	serializers: SerializerRegistry,
): Record<string, unknown> {
	const result: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(data)) {
		// Check for registered serializer
		if (serializers[key]) {
			result[key] = serializers[key](value)
			continue
		}

		// Auto-detect and serialize errors
		if (isError(value)) {
			result[key] = serializeError(value)
			continue
		}

		// Handle arrays
		if (Array.isArray(value)) {
			result[key] = value.map((item) => {
				if (isError(item)) {
					return serializeError(item)
				}
				if (typeof item === "object" && item !== null) {
					return applySerializers(item as Record<string, unknown>, serializers)
				}
				return item
			})
			continue
		}

		// Recursively handle nested objects
		if (typeof value === "object" && value !== null) {
			result[key] = applySerializers(value as Record<string, unknown>, serializers)
			continue
		}

		// Primitive values
		result[key] = value
	}

	return result
}

/**
 * Standard serializers
 */
export const stdSerializers = {
	/**
	 * Error serializer
	 */
	err: (error: Error): SerializedError => serializeError(error),

	/**
	 * Error serializer (alias)
	 */
	error: (error: Error): SerializedError => serializeError(error),
}
