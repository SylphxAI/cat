/**
 * HTTP Response Serializer
 *
 * Serialize HTTP response objects for logging
 * Compatible with Node.js http.ServerResponse, Express Response, etc.
 */

export interface SerializedResponse {
	statusCode: number
	statusMessage?: string
	headers?: Record<string, string | string[]>
}

/**
 * Headers to exclude from serialization (security)
 */
const SENSITIVE_HEADERS = ["set-cookie", "authorization", "x-api-key"]

/**
 * Sanitize headers by removing sensitive values
 */
function sanitizeHeaders(
	headers: Record<string, string | string[]>,
): Record<string, string | string[]> {
	const result: Record<string, string | string[]> = {}

	for (const [key, value] of Object.entries(headers)) {
		const lowerKey = key.toLowerCase()
		if (SENSITIVE_HEADERS.includes(lowerKey)) {
			result[key] = "[REDACTED]"
		} else {
			result[key] = value
		}
	}

	return result
}

/**
 * Serialize HTTP response object
 *
 * Compatible with:
 * - Node.js http.ServerResponse
 * - Express Response
 * - Koa Context
 * - Next.js Response
 *
 * @param res - Response object
 * @returns Serialized response
 */
export function serializeResponse(res: any): SerializedResponse {
	const result: SerializedResponse = {
		statusCode: res.statusCode || 200,
	}

	// Status message
	if (res.statusMessage) {
		result.statusMessage = res.statusMessage
	}

	// Headers (sanitized)
	if (res.getHeaders && typeof res.getHeaders === "function") {
		const headers = res.getHeaders()
		result.headers = sanitizeHeaders(headers as Record<string, string | string[]>)
	} else if (res.headers) {
		result.headers = sanitizeHeaders(res.headers)
	}

	return result
}

/**
 * Response serializer for use in logger
 */
export const responseSerializer = serializeResponse
