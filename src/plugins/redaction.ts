/**
 * Redaction Plugin
 *
 * OWASP 2024 Compliant log redaction
 * - Sensitive field redaction (passwords, tokens, etc.)
 * - PII detection (credit cards, SSNs, emails, etc.)
 * - Log injection prevention (newlines, ANSI codes)
 * - Glob pattern matching for field paths
 */

import type { LogEntry, Plugin } from "../core/types"

export interface RedactionPluginOptions {
	/**
	 * Enable redaction
	 * @default true
	 */
	enabled?: boolean

	/**
	 * Field paths to redact (supports glob patterns)
	 * @default ['password', 'token', 'secret', 'apiKey', 'apiSecret', 'auth', 'authorization']
	 */
	fields?: string[]

	/**
	 * Enable PII detection and redaction
	 * @default true
	 */
	redactPII?: boolean

	/**
	 * PII patterns to detect
	 * @default ['creditCard', 'ssn', 'email', 'phone']
	 */
	piiPatterns?: Array<"creditCard" | "ssn" | "email" | "phone" | "ipv4" | "ipv6">

	/**
	 * Custom regex patterns to redact
	 */
	customPatterns?: Array<{
		name: string
		pattern: RegExp
		replacement?: string
	}>

	/**
	 * Redaction replacement text
	 * @default '[REDACTED]'
	 */
	replacement?: string

	/**
	 * Prevent log injection attacks (remove/escape newlines, ANSI codes)
	 * @default true
	 */
	preventLogInjection?: boolean

	/**
	 * Fields to exclude from redaction
	 */
	excludeFields?: string[]
}

/**
 * Built-in PII detection patterns
 */
const PII_PATTERNS = {
	// Credit card (Luhn algorithm compatible)
	creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,

	// SSN (Social Security Number)
	ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

	// Email
	email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

	// Phone (US format) - matches various formats like (555) 123-4567, 555-123-4567, +1-555-123-4567
	phone: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,

	// IPv4
	ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

	// IPv6
	ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
}

/**
 * Default sensitive field names
 */
const DEFAULT_SENSITIVE_FIELDS = [
	"password",
	"passwd",
	"pwd",
	"secret",
	"token",
	"apiKey",
	"api_key",
	"apiSecret",
	"api_secret",
	"auth",
	"authorization",
	"bearer",
	"cookie",
	"session",
	"sessionId",
	"session_id",
	"privateKey",
	"private_key",
	"accessToken",
	"access_token",
	"refreshToken",
	"refresh_token",
	"csrfToken",
	"csrf_token",
]

export class RedactionPlugin implements Plugin {
	name = "redaction"

	private enabled: boolean
	private fields: string[]
	private redactPII: boolean
	private piiPatterns: Array<keyof typeof PII_PATTERNS>
	private customPatterns: Array<{ name: string; pattern: RegExp; replacement?: string }>
	private replacement: string
	private preventLogInjection: boolean
	private excludeFields: Set<string>

	constructor(options: RedactionPluginOptions = {}) {
		this.enabled = options.enabled ?? true
		this.fields = options.fields || DEFAULT_SENSITIVE_FIELDS
		this.redactPII = options.redactPII ?? true
		this.piiPatterns = options.piiPatterns || ["creditCard", "ssn", "email", "phone"]
		this.customPatterns = options.customPatterns || []
		this.replacement = options.replacement || "[REDACTED]"
		this.preventLogInjection = options.preventLogInjection ?? true
		this.excludeFields = new Set(options.excludeFields || [])
	}

	onLog(entry: LogEntry): LogEntry {
		if (!this.enabled) return entry

		const redacted: LogEntry = {
			...entry,
		}

		// Redact message
		redacted.message = this.redactString(entry.message)

		// Redact data fields
		if (entry.data) {
			redacted.data = this.redactObject(entry.data, "")
		}

		// Redact context fields
		if (entry.context) {
			redacted.context = this.redactObject(entry.context, "")
		}

		return redacted
	}

	/**
	 * Redact sensitive data from object
	 */
	private redactObject(obj: Record<string, unknown>, path: string): Record<string, unknown> {
		const result: Record<string, unknown> = {}

		for (const [key, value] of Object.entries(obj)) {
			const currentPath = path ? `${path}.${key}` : key

			// Skip excluded fields
			if (this.excludeFields.has(currentPath)) {
				result[key] = value
				continue
			}

			// Recursively redact nested objects first (before checking if field should be redacted)
			if (value !== null && typeof value === "object" && !Array.isArray(value)) {
				// Don't redact the entire object, descend into it
				result[key] = this.redactObject(value as Record<string, unknown>, currentPath)
				continue
			}

			// Redact arrays
			if (Array.isArray(value)) {
				result[key] = value.map((item) => {
					if (item !== null && typeof item === "object") {
						return this.redactObject(item as Record<string, unknown>, currentPath)
					}
					if (typeof item === "string") {
						return this.redactString(item)
					}
					return item
				})
				continue
			}

			// Check if field should be redacted (only for leaf values)
			if (this.shouldRedactField(currentPath)) {
				result[key] = this.replacement
				continue
			}

			// Redact strings
			if (typeof value === "string") {
				result[key] = this.redactString(value)
				continue
			}

			result[key] = value
		}

		return result
	}

	/**
	 * Redact sensitive data from string
	 */
	private redactString(str: string): string {
		let result = str

		// Prevent log injection
		if (this.preventLogInjection) {
			result = this.sanitizeForLogInjection(result)
		}

		// Redact PII
		if (this.redactPII) {
			for (const patternName of this.piiPatterns) {
				const pattern = PII_PATTERNS[patternName]
				if (pattern) {
					result = result.replace(pattern, this.replacement)
				}
			}
		}

		// Apply custom patterns
		for (const { pattern, replacement } of this.customPatterns) {
			result = result.replace(pattern, replacement || this.replacement)
		}

		return result
	}

	/**
	 * Check if field should be redacted based on glob patterns
	 */
	private shouldRedactField(path: string): boolean {
		// Extract just the field name (last segment)
		const fieldName = path.split(".").pop() || ""

		for (const pattern of this.fields) {
			// Check full path match
			if (this.matchGlob(path, pattern)) {
				return true
			}

			// Also check field name alone (for simple patterns like "password")
			if (this.matchGlob(fieldName, pattern)) {
				return true
			}
		}
		return false
	}

	/**
	 * Simple glob pattern matching
	 * Supports: *, **, exact match
	 */
	private matchGlob(path: string, pattern: string): boolean {
		// Exact match
		if (path === pattern) return true

		// Convert glob to regex
		const regexPattern = pattern
			.replace(/\./g, "\\.") // Escape dots
			.replace(/\*\*/g, "___DOUBLESTAR___") // Preserve **
			.replace(/\*/g, "[^.]+") // * matches segment
			.replace(/___DOUBLESTAR___/g, ".*") // ** matches multiple segments

		const regex = new RegExp(`^${regexPattern}$`)
		return regex.test(path)
	}

	/**
	 * Sanitize string to prevent log injection attacks
	 * OWASP recommendation: escape or remove newlines, CR, ANSI codes
	 */
	private sanitizeForLogInjection(str: string): string {
		return (
			str
				// Remove ANSI escape codes
				.replace(/\x1b\[[0-9;]*m/g, "")
				// Replace newlines with escaped version
				.replace(/\r\n/g, "\\r\\n")
				.replace(/\n/g, "\\n")
				.replace(/\r/g, "\\r")
				// Remove other control characters
				.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")
		)
	}
}

/**
 * Create redaction plugin
 */
export function redactionPlugin(options?: RedactionPluginOptions): Plugin {
	return new RedactionPlugin(options)
}
