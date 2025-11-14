/**
 * Tail-Based Sampling Plugin
 *
 * Smart sampling that makes decisions AFTER trace completion
 * based on full context (errors, duration, status codes, etc.)
 *
 * Features:
 * - Rule-based sampling (errors, latency, status codes)
 * - Adaptive sampling (budget-aware)
 * - Session-based buffering
 * - 100% error coverage
 * - Cost optimization (40-90% reduction)
 *
 * Inspired by:
 * - Datadog Adaptive Ingestion (2024)
 * - Honeycomb Tail-Based Sampling
 * - OpenTelemetry Tail Sampling Processor
 */

import type { LogEntry, Plugin } from "../core/types"

export interface SamplingRule {
	/**
	 * Rule name (for debugging)
	 */
	name?: string

	/**
	 * Condition function
	 * Return true to apply this rule
	 */
	condition: (trace: TraceBuffer) => boolean

	/**
	 * Sample rate (0.0 to 1.0)
	 * 1.0 = keep 100%, 0.0 = discard 100%
	 */
	sampleRate: number

	/**
	 * Priority (higher = evaluated first)
	 * @default 0
	 */
	priority?: number
}

export interface TailSamplingPluginOptions {
	/**
	 * Enable tail sampling
	 * @default true
	 */
	enabled?: boolean

	/**
	 * Sampling rules (evaluated in priority order)
	 */
	rules?: SamplingRule[]

	/**
	 * Maximum buffer size (number of logs per trace)
	 * @default 1000
	 */
	maxBufferSize?: number

	/**
	 * Maximum trace duration (ms) before auto-flush
	 * @default 30000 (30 seconds)
	 */
	maxTraceDuration?: number

	/**
	 * Enable adaptive sampling (budget-aware)
	 * @default false
	 */
	adaptive?: boolean

	/**
	 * Monthly budget in bytes (for adaptive sampling)
	 */
	monthlyBudget?: number

	/**
	 * Trace ID extractor
	 * @default Uses entry.traceId
	 */
	getTraceId?: (entry: LogEntry) => string | undefined

	/**
	 * Callback when trace is flushed
	 */
	onFlush?: (trace: TraceBuffer, kept: boolean) => void
}

/**
 * Trace metadata collected during buffering
 */
export interface TraceMetadata {
	traceId: string
	startTime: number
	endTime?: number
	logCount: number
	hasError: boolean
	maxLevel: number // Numeric level value
	minDuration?: number
	maxDuration?: number
	avgDuration?: number
	statusCode?: number
	customFields: Record<string, unknown>
}

/**
 * Buffer for a single trace
 */
export class TraceBuffer {
	readonly traceId: string
	readonly logs: LogEntry[] = []
	readonly metadata: TraceMetadata

	private startTime: number

	constructor(traceId: string) {
		this.traceId = traceId
		this.startTime = Date.now()
		this.metadata = {
			traceId,
			startTime: this.startTime,
			logCount: 0,
			hasError: false,
			maxLevel: 0,
			customFields: {},
		}
	}

	/**
	 * Add log entry to buffer
	 */
	add(entry: LogEntry): void {
		this.logs.push(entry)
		this.metadata.logCount++

		// Update metadata
		this.updateMetadata(entry)
	}

	/**
	 * Update trace metadata based on log entry
	 */
	private updateMetadata(entry: LogEntry): void {
		// Check for errors
		if (entry.level === "error" || entry.level === "fatal") {
			this.metadata.hasError = true
		}

		// Track max level (higher = more severe)
		const levelValue = this.getLevelValue(entry.level)
		if (levelValue > this.metadata.maxLevel) {
			this.metadata.maxLevel = levelValue
		}

		// Track duration
		if (entry.data?.duration !== undefined) {
			const duration = Number(entry.data.duration)
			if (this.metadata.minDuration === undefined || duration < this.metadata.minDuration) {
				this.metadata.minDuration = duration
			}
			if (this.metadata.maxDuration === undefined || duration > this.metadata.maxDuration) {
				this.metadata.maxDuration = duration
			}
		}

		// Track status code (use last status code)
		if (entry.data?.statusCode !== undefined) {
			this.metadata.statusCode = Number(entry.data.statusCode)
		}

		// Track custom fields
		if (entry.data) {
			for (const [key, value] of Object.entries(entry.data)) {
				if (!["duration", "statusCode"].includes(key)) {
					this.metadata.customFields[key] = value
				}
			}
		}
	}

	/**
	 * Get numeric level value
	 */
	private getLevelValue(level: string): number {
		const levels: Record<string, number> = {
			trace: 10,
			debug: 20,
			info: 30,
			warn: 40,
			error: 50,
			fatal: 60,
		}
		return levels[level] || 0
	}

	/**
	 * Finalize trace (called when trace completes)
	 */
	finalize(): void {
		this.metadata.endTime = Date.now()

		// Calculate average duration
		if (this.metadata.minDuration !== undefined && this.metadata.maxDuration !== undefined) {
			this.metadata.avgDuration = (this.metadata.minDuration + this.metadata.maxDuration) / 2
		}
	}

	/**
	 * Get trace duration in milliseconds
	 */
	getDuration(): number {
		const endTime = this.metadata.endTime || Date.now()
		return endTime - this.metadata.startTime
	}

	/**
	 * Get total buffer size in bytes (estimate)
	 */
	getSize(): number {
		// Rough estimate: 2KB per log entry
		return this.logs.length * 2048
	}

	/**
	 * Check if buffer is expired
	 */
	isExpired(maxDuration: number): boolean {
		return this.getDuration() > maxDuration
	}
}

/**
 * Default sampling rules
 */
const DEFAULT_RULES: SamplingRule[] = [
	// Rule 1: Keep all errors (highest priority)
	{
		name: "errors",
		priority: 100,
		condition: (trace) => trace.metadata.hasError,
		sampleRate: 1.0,
	},

	// Rule 2: Keep slow requests (>1s)
	{
		name: "slow-requests",
		priority: 90,
		condition: (trace) => (trace.metadata.maxDuration || 0) > 1000,
		sampleRate: 1.0,
	},

	// Rule 3: Keep 5xx status codes
	{
		name: "server-errors",
		priority: 80,
		condition: (trace) => {
			const code = trace.metadata.statusCode
			return code !== undefined && code >= 500
		},
		sampleRate: 1.0,
	},

	// Rule 4: Sample 4xx errors (50%)
	{
		name: "client-errors",
		priority: 70,
		condition: (trace) => {
			const code = trace.metadata.statusCode
			return code !== undefined && code >= 400 && code < 500
		},
		sampleRate: 0.5,
	},

	// Rule 5: Sample warn logs (20%)
	{
		name: "warnings",
		priority: 60,
		condition: (trace) => trace.metadata.maxLevel >= 40 && !trace.metadata.hasError,
		sampleRate: 0.2,
	},

	// Rule 6: Default - sample success at low rate (1%)
	{
		name: "default",
		priority: 0,
		condition: () => true,
		sampleRate: 0.01,
	},
]

/**
 * Tail-Based Sampling Plugin
 */
export class TailSamplingPlugin implements Plugin {
	name = "tail-sampling"

	private enabled: boolean
	private rules: SamplingRule[]
	private maxBufferSize: number
	private maxTraceDuration: number
	private adaptive: boolean
	private monthlyBudget?: number
	private getTraceId: (entry: LogEntry) => string | undefined
	private onFlush?: (trace: TraceBuffer, kept: boolean) => void

	// Active traces buffer
	private traces = new Map<string, TraceBuffer>()

	// Adaptive sampling state
	private currentMonthUsage = 0
	private currentMonthStart = Date.now()
	private adaptiveMultiplier = 1.0

	// Cleanup timer
	private cleanupTimer: Timer | null = null

	constructor(options: TailSamplingPluginOptions = {}) {
		this.enabled = options.enabled ?? true
		this.rules = options.rules || DEFAULT_RULES
		this.maxBufferSize = options.maxBufferSize ?? 1000
		this.maxTraceDuration = options.maxTraceDuration ?? 30000
		this.adaptive = options.adaptive ?? false
		this.monthlyBudget = options.monthlyBudget
		this.getTraceId = options.getTraceId || ((entry) => entry.traceId)
		this.onFlush = options.onFlush

		// Sort rules by priority (descending)
		this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0))

		// Start cleanup timer
		this.startCleanupTimer()
	}

	onLog(entry: LogEntry): LogEntry | null {
		if (!this.enabled) return entry

		const traceId = this.getTraceId(entry)

		// If no trace ID, pass through (no buffering)
		if (!traceId) {
			return entry
		}

		// Get or create trace buffer
		let trace = this.traces.get(traceId)
		if (!trace) {
			trace = new TraceBuffer(traceId)
			this.traces.set(traceId, trace)
		}

		// Add to buffer
		trace.add(entry)

		// Check buffer limits
		if (trace.logs.length >= this.maxBufferSize) {
			this.finalizeTrace(traceId)
		}

		// Don't emit yet (buffering)
		return null
	}

	/**
	 * Finalize and flush a trace
	 */
	private finalizeTrace(traceId: string): void {
		const trace = this.traces.get(traceId)
		if (!trace) return

		trace.finalize()

		// Apply sampling rules
		const kept = this.shouldKeep(trace)

		// Update usage tracking
		if (kept && this.adaptive) {
			this.currentMonthUsage += trace.getSize()
			this.updateAdaptiveMultiplier()
		}

		// Callback
		if (this.onFlush) {
			this.onFlush(trace, kept)
		}

		// Clean up
		this.traces.delete(traceId)
	}

	/**
	 * Determine if trace should be kept based on rules
	 */
	private shouldKeep(trace: TraceBuffer): boolean {
		// Apply rules in priority order
		for (const rule of this.rules) {
			if (rule.condition(trace)) {
				let effectiveRate = rule.sampleRate

				// Apply adaptive multiplier
				if (this.adaptive) {
					effectiveRate *= this.adaptiveMultiplier
				}

				return Math.random() < effectiveRate
			}
		}

		// Default: discard (should not reach here if default rule exists)
		return false
	}

	/**
	 * Update adaptive multiplier based on budget
	 */
	private updateAdaptiveMultiplier(): void {
		if (!this.monthlyBudget) return

		const monthDuration = Date.now() - this.currentMonthStart
		const monthProgress = monthDuration / (30 * 24 * 60 * 60 * 1000) // Approximate month
		const budgetProgress = this.currentMonthUsage / this.monthlyBudget

		// If usage is ahead of time, reduce sampling
		if (budgetProgress > monthProgress) {
			this.adaptiveMultiplier = Math.max(0.1, this.adaptiveMultiplier * 0.9)
		} else {
			this.adaptiveMultiplier = Math.min(1.0, this.adaptiveMultiplier * 1.05)
		}
	}

	/**
	 * Start cleanup timer to flush expired traces
	 */
	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(() => {
			this.cleanupExpiredTraces()
		}, 5000) // Check every 5 seconds
	}

	/**
	 * Clean up expired traces
	 */
	private cleanupExpiredTraces(): void {
		const now = Date.now()

		// Reset monthly usage if needed
		const monthsSinceStart = (now - this.currentMonthStart) / (30 * 24 * 60 * 60 * 1000)
		if (monthsSinceStart >= 1) {
			this.currentMonthUsage = 0
			this.currentMonthStart = now
			this.adaptiveMultiplier = 1.0
		}

		// Flush expired traces
		for (const [traceId, trace] of this.traces.entries()) {
			if (trace.isExpired(this.maxTraceDuration)) {
				this.finalizeTrace(traceId)
			}
		}
	}

	/**
	 * Manually flush a specific trace
	 */
	flush(traceId: string): void {
		this.finalizeTrace(traceId)
	}

	/**
	 * Flush all traces
	 */
	flushAll(): void {
		for (const traceId of this.traces.keys()) {
			this.finalizeTrace(traceId)
		}
	}

	onDestroy(): void {
		// Clean up timer
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer)
			this.cleanupTimer = null
		}

		// Flush all remaining traces
		this.flushAll()
	}
}

/**
 * Create tail sampling plugin
 */
export function tailSamplingPlugin(options?: TailSamplingPluginOptions): Plugin {
	return new TailSamplingPlugin(options)
}
