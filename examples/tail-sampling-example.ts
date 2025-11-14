/**
 * Tail-Based Sampling Example
 *
 * Demonstrates smart log sampling that decides AFTER trace completion
 * based on errors, latency, status codes, and other context.
 *
 * Benefits:
 * - 100% error coverage (never miss important issues)
 * - Cost optimization (40-90% reduction)
 * - Intelligent sampling (keep valuable logs)
 * - Budget-aware (adaptive sampling)
 */

import { createLogger } from "../src/core/logger"
import { jsonFormatter } from "../src/formatters/json"
import { consoleTransport } from "../src/transports/console"
import { tracingPlugin } from "../src/plugins/tracing"
import { tailSamplingPlugin, type SamplingRule } from "../src/plugins/tail-sampling"

// ============================================================================
// Example 1: Basic Tail-Based Sampling
// ============================================================================

console.log("=== Example 1: Basic Tail-Based Sampling ===\n")

const basicLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [consoleTransport()],
	plugins: [
		// Add trace IDs to all logs
		tracingPlugin(),

		// Tail-based sampling with default rules:
		// - Keep all errors (100%)
		// - Keep slow requests >1s (100%)
		// - Keep 5xx status codes (100%)
		// - Sample 4xx at 50%
		// - Sample warnings at 20%
		// - Sample success at 1%
		tailSamplingPlugin(),
	],
})

// This error will be kept (100% error coverage)
basicLogger.error("Payment failed", {
	orderId: "ORD-123",
	error: new Error("Insufficient funds"),
})

// This success log will likely be discarded (1% sample rate)
basicLogger.info("Order processed successfully", {
	orderId: "ORD-124",
	statusCode: 200,
})

console.log("\n")

// ============================================================================
// Example 2: Custom Sampling Rules
// ============================================================================

console.log("=== Example 2: Custom Sampling Rules ===\n")

const customRules: SamplingRule[] = [
	// Rule 1: Keep all payment-related errors (highest priority)
	{
		name: "payment-errors",
		priority: 100,
		condition: (trace) => {
			return trace.metadata.hasError && trace.metadata.customFields.category === "payment"
		},
		sampleRate: 1.0,
	},

	// Rule 2: Keep VIP user actions (50%)
	{
		name: "vip-users",
		priority: 90,
		condition: (trace) => trace.metadata.customFields.userTier === "vip",
		sampleRate: 0.5,
	},

	// Rule 3: Keep slow checkouts (>3s)
	{
		name: "slow-checkout",
		priority: 80,
		condition: (trace) => {
			return (
				trace.metadata.customFields.action === "checkout" &&
				(trace.metadata.maxDuration || 0) > 3000
			)
		},
		sampleRate: 1.0,
	},

	// Rule 4: Sample regular users at low rate
	{
		name: "default",
		priority: 0,
		condition: () => true,
		sampleRate: 0.01, // 1%
	},
]

const ecommerceLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [consoleTransport()],
	plugins: [
		tracingPlugin(),
		tailSamplingPlugin({
			rules: customRules,
			maxBufferSize: 100,
			maxTraceDuration: 30000, // 30 seconds
		}),
	],
})

// Simulate requests
ecommerceLogger.error("Payment gateway timeout", {
	category: "payment",
	orderId: "ORD-001",
})

ecommerceLogger.info("VIP checkout", {
	userTier: "vip",
	action: "checkout",
	duration: 500,
})

console.log("\n")

// ============================================================================
// Example 3: Adaptive Sampling (Budget-Aware)
// ============================================================================

console.log("=== Example 3: Adaptive Sampling ===\n")

const adaptiveLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [consoleTransport()],
	plugins: [
		tracingPlugin(),
		tailSamplingPlugin({
			adaptive: true,
			monthlyBudget: 10 * 1024 * 1024 * 1024, // 10 GB/month

			onFlush: (trace, kept) => {
				console.log(`Trace ${trace.traceId}: ${kept ? "KEPT" : "DISCARDED"}`)
			},
		}),
	],
})

// As budget is consumed, sampling rates auto-adjust
for (let i = 0; i < 10; i++) {
	adaptiveLogger.info(`Request ${i}`, {
		requestId: `req-${i}`,
		statusCode: 200,
	})
}

console.log("\n")

// ============================================================================
// Example 4: Distributed Tracing Integration
// ============================================================================

console.log("=== Example 4: Distributed Tracing ===\n")

// Simulate microservices architecture
function simulateDistributedTrace() {
	const traceId = "trace-" + Math.random().toString(36).slice(2)

	const gatewayLogger = createLogger({
		formatter: jsonFormatter(),
		transports: [consoleTransport()],
		plugins: [
			tracingPlugin({
				getTraceContext: () => ({
					traceId,
					spanId: "gateway-span",
					traceFlags: 1,
				}),
			}),
			tailSamplingPlugin(),
		],
	})

	const authLogger = createLogger({
		formatter: jsonFormatter(),
		transports: [consoleTransport()],
		plugins: [
			tracingPlugin({
				getTraceContext: () => ({
					traceId, // Same trace ID!
					spanId: "auth-span",
					traceFlags: 1,
				}),
			}),
			tailSamplingPlugin(),
		],
	})

	// Gateway logs
	gatewayLogger.info("Request received", { service: "gateway" })

	// Auth service logs
	authLogger.error("Authentication failed", { service: "auth" })

	// Because auth service had an error, the entire trace is kept
	// (tail-sampling decision affects all services in the trace)
}

simulateDistributedTrace()

console.log("\n")

// ============================================================================
// Example 5: Real-World Production Setup
// ============================================================================

console.log("=== Example 5: Production Setup ===\n")

const productionRules: SamplingRule[] = [
	// Critical: All errors
	{
		name: "errors",
		priority: 100,
		condition: (trace) => trace.metadata.hasError,
		sampleRate: 1.0,
	},

	// Critical: All 5xx errors
	{
		name: "server-errors",
		priority: 95,
		condition: (trace) => {
			const code = trace.metadata.statusCode
			return code !== undefined && code >= 500
		},
		sampleRate: 1.0,
	},

	// Important: Slow requests (>2s)
	{
		name: "slow-requests",
		priority: 90,
		condition: (trace) => (trace.metadata.maxDuration || 0) > 2000,
		sampleRate: 1.0,
	},

	// Important: Authentication issues
	{
		name: "auth-issues",
		priority: 85,
		condition: (trace) => {
			const code = trace.metadata.statusCode
			return code === 401 || code === 403
		},
		sampleRate: 0.5,
	},

	// Medium: 4xx errors (except auth)
	{
		name: "client-errors",
		priority: 70,
		condition: (trace) => {
			const code = trace.metadata.statusCode
			return code !== undefined && code >= 400 && code < 500 && code !== 401 && code !== 403
		},
		sampleRate: 0.1,
	},

	// Low: Successful requests
	{
		name: "success",
		priority: 0,
		condition: () => true,
		sampleRate: 0.01, // Only 1% of successful requests
	},
]

const productionLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [consoleTransport()],
	plugins: [
		tracingPlugin(),
		tailSamplingPlugin({
			rules: productionRules,
			adaptive: true,
			monthlyBudget: 50 * 1024 * 1024 * 1024, // 50 GB/month
			maxBufferSize: 1000,
			maxTraceDuration: 60000, // 1 minute

			onFlush: (trace, kept) => {
				if (kept) {
					console.log(
						`✅ Kept trace ${trace.traceId}: ` +
							`errors=${trace.metadata.hasError}, ` +
							`duration=${trace.metadata.maxDuration || 0}ms, ` +
							`status=${trace.metadata.statusCode || "N/A"}`,
					)
				}
			},
		}),
	],
})

// Simulate various request types
productionLogger.error("Database connection failed", {
	statusCode: 500,
	duration: 5000,
})

productionLogger.warn("High memory usage", {
	statusCode: 200,
	memoryUsage: "85%",
})

productionLogger.info("Health check", {
	statusCode: 200,
	duration: 10,
})

console.log("\n")

// ============================================================================
// Example 6: Gaming Backend
// ============================================================================

console.log("=== Example 6: Gaming Backend ===\n")

const gamingRules: SamplingRule[] = [
	// Critical: Game crashes
	{
		name: "crashes",
		priority: 100,
		condition: (trace) => trace.metadata.customFields.event === "crash",
		sampleRate: 1.0,
	},

	// Critical: Cheat detection
	{
		name: "cheating",
		priority: 95,
		condition: (trace) => trace.metadata.customFields.cheatDetected === true,
		sampleRate: 1.0,
	},

	// Important: High latency matchmaking (>500ms)
	{
		name: "slow-matchmaking",
		priority: 90,
		condition: (trace) => {
			return (
				trace.metadata.customFields.event === "matchmaking" &&
				(trace.metadata.maxDuration || 0) > 500
			)
		},
		sampleRate: 1.0,
	},

	// Low: Regular gameplay
	{
		name: "gameplay",
		priority: 0,
		condition: () => true,
		sampleRate: 0.001, // 0.1% (very high volume)
	},
]

const gamingLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [consoleTransport()],
	plugins: [
		tracingPlugin(),
		tailSamplingPlugin({
			rules: gamingRules,
		}),
	],
})

gamingLogger.error("Game crashed", {
	event: "crash",
	userId: "player-123",
	reason: "Out of memory",
})

gamingLogger.warn("Potential cheating detected", {
	event: "gameplay",
	cheatDetected: true,
	userId: "player-456",
})

console.log("\n")

// ============================================================================
// Example 7: Financial API
// ============================================================================

console.log("=== Example 7: Financial API ===\n")

const financialRules: SamplingRule[] = [
	// Critical: All transaction errors
	{
		name: "transaction-errors",
		priority: 100,
		condition: (trace) => {
			return trace.metadata.hasError && trace.metadata.customFields.category === "transaction"
		},
		sampleRate: 1.0,
	},

	// Critical: Fraud detection triggers
	{
		name: "fraud-alerts",
		priority: 95,
		condition: (trace) => trace.metadata.customFields.fraudScore !== undefined,
		sampleRate: 1.0,
	},

	// Critical: High-value transactions
	{
		name: "high-value",
		priority: 90,
		condition: (trace) => {
			const amount = trace.metadata.customFields.amount as number
			return amount !== undefined && amount > 10000
		},
		sampleRate: 1.0,
	},

	// Important: Audit events (regulatory compliance)
	{
		name: "audit",
		priority: 85,
		condition: (trace) => trace.metadata.customFields.auditRequired === true,
		sampleRate: 1.0,
	},

	// Low: Regular API calls
	{
		name: "default",
		priority: 0,
		condition: () => true,
		sampleRate: 0.05, // 5%
	},
]

const financialLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [consoleTransport()],
	plugins: [
		tracingPlugin(),
		tailSamplingPlugin({
			rules: financialRules,
		}),
	],
})

financialLogger.warn("Suspicious transaction", {
	category: "transaction",
	amount: 50000,
	fraudScore: 0.85,
	auditRequired: true,
})

financialLogger.info("Account balance check", {
	category: "query",
	amount: 100,
})

console.log("\n")

// ============================================================================
// Example 8: Cost Comparison
// ============================================================================

console.log("=== Example 8: Cost Comparison ===\n")

function simulateTraffic(logger: any, count: number) {
	let kept = 0
	let discarded = 0

	const plugin = tailSamplingPlugin({
		onFlush: (trace, isKept) => {
			if (isKept) kept++
			else discarded++
		},
	})

	for (let i = 0; i < count; i++) {
		const hasError = Math.random() < 0.01 // 1% error rate

		const entry = {
			level: hasError ? ("error" as const) : ("info" as const),
			timestamp: Date.now(),
			message: `Request ${i}`,
			traceId: `trace-${i}`,
			data: {
				statusCode: hasError ? 500 : 200,
				duration: Math.random() * 2000,
			},
		}

		plugin.onLog!(entry)
		plugin.flush(`trace-${i}`)
	}

	return { kept, discarded }
}

const results = simulateTraffic(null, 10000)

console.log("Simulated 10,000 requests (1% error rate):")
console.log(`- Kept: ${results.kept} (${((results.kept / 10000) * 100).toFixed(2)}%)`)
console.log(`- Discarded: ${results.discarded} (${((results.discarded / 10000) * 100).toFixed(2)}%)`)
console.log(`- Cost savings: ~${(100 - (results.kept / 10000) * 100).toFixed(0)}%`)
console.log("\n")

// ============================================================================
// Summary
// ============================================================================

console.log("=== Summary ===\n")
console.log("Tail-Based Sampling Benefits:")
console.log("✅ 100% error coverage - Never miss important issues")
console.log("💰 40-90% cost reduction - Only keep valuable logs")
console.log("🎯 Smart decisions - Based on full trace context")
console.log("📊 Budget-aware - Adaptive sampling to hit targets")
console.log("🔍 Better signal-to-noise ratio - Focus on what matters")
console.log("\nUse cases:")
console.log("- High-traffic production environments")
console.log("- Cost-sensitive deployments")
console.log("- Distributed tracing systems")
console.log("- Compliance requirements (keep all errors)")
console.log("- Microservices architectures")
