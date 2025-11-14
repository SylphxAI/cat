/**
 * HTTP Request Serializer
 *
 * Serialize HTTP request objects for logging
 * Compatible with Node.js http.IncomingMessage, Express Request, etc.
 */

export interface SerializedRequest {
	method: string
	url: string
	headers?: Record<string, string | string[]>
	query?: Record<string, any>
	params?: Record<string, any>
	remoteAddress?: string
	remotePort?: number
	protocol?: string
	httpVersion?: string
}

/**
 * Headers to exclude from serialization (security)
 */
const SENSITIVE_HEADERS = [
	"authorization",
	"cookie",
	"x-api-key",
	"x-auth-token",
	"x-csrf-token",
	"x-session-id",
]

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
 * Serialize HTTP request object
 *
 * Compatible with:
 * - Node.js http.IncomingMessage
 * - Express Request
 * - Koa Context
 * - Next.js Request
 *
 * @param req - Request object
 * @returns Serialized request
 */
export function serializeRequest(req: any): SerializedRequest {
	const result: SerializedRequest = {
		method: req.method || "UNKNOWN",
		url: req.originalUrl || req.url || "/", // Prefer originalUrl (Express)
	}

	// Headers (sanitized)
	if (req.headers) {
		result.headers = sanitizeHeaders(req.headers)
	}

	// Query parameters
	if (req.query) {
		result.query = req.query
	}

	// Route parameters (Express)
	if (req.params) {
		result.params = req.params
	}

	// Remote address
	if (req.socket) {
		result.remoteAddress = req.socket.remoteAddress
		result.remotePort = req.socket.remotePort
	} else if (req.connection) {
		result.remoteAddress = req.connection.remoteAddress
		result.remotePort = req.connection.remotePort
	} else if (req.ip) {
		result.remoteAddress = req.ip
	}

	// Protocol
	if (req.protocol) {
		result.protocol = req.protocol
	} else if (req.socket?.encrypted) {
		result.protocol = "https"
	}

	// HTTP version
	if (req.httpVersion) {
		result.httpVersion = req.httpVersion
	}

	return result
}

/**
 * Request serializer for use in logger
 */
export const requestSerializer = serializeRequest
