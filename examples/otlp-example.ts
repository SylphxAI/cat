/**
 * OTLP Transport Example
 *
 * Demonstrates how to send logs to OpenTelemetry-compatible endpoints
 * using the OTLP (OpenTelemetry Protocol) transport.
 *
 * Compatible with:
 * - Grafana Loki
 * - Datadog
 * - New Relic
 * - AWS CloudWatch
 * - Honeycomb
 * - Jaeger
 * - Zipkin
 * - Any OTLP-compatible backend
 */

import { createLogger } from "../src/core/logger"
import { jsonFormatter } from "../src/formatters/json"
import { otlpTransport } from "../src/transports/otlp"
import { tracingPlugin } from "../src/plugins/tracing"

// Example 1: Basic OTLP setup (local collector)
const basicLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [
		otlpTransport({
			// Default endpoint: http://localhost:4318/v1/logs
			// This is the default OpenTelemetry Collector HTTP endpoint
		}),
	],
	plugins: [
		// Add W3C Trace Context for distributed tracing
		tracingPlugin(),
	],
})

basicLogger.info("Hello from OTLP transport!")

// Example 2: Production setup with Grafana Cloud
const grafanaLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [
		otlpTransport({
			endpoint: "https://otlp-gateway-prod-us-central-0.grafana.net/otlp/v1/logs",
			headers: {
				Authorization: "Basic <your-base64-encoded-credentials>",
			},
			batch: true,
			batchSize: 100,
			batchInterval: 1000,
			retries: 3,
			timeout: 10000,
			resourceAttributes: {
				"service.name": "my-api",
				"service.version": "1.0.0",
				"deployment.environment": "production",
				"host.name": "api-server-01",
			},
		}),
	],
	plugins: [tracingPlugin()],
})

grafanaLogger.info("Sending logs to Grafana Cloud", {
	userId: "123",
	action: "login",
})

// Example 3: Multi-transport setup (local + remote)
const multiLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [
		// Local console for development
		otlpTransport({
			endpoint: "http://localhost:4318/v1/logs",
			batch: false, // Immediate sending for debugging
		}),
		// Remote service for production
		otlpTransport({
			endpoint: "https://logs.example.com/v1/logs",
			headers: {
				"X-API-Key": process.env.LOGS_API_KEY!,
			},
			batch: true,
			batchSize: 50,
			resourceAttributes: {
				"service.name": "payment-service",
				"deployment.environment": process.env.NODE_ENV || "development",
			},
		}),
	],
	plugins: [tracingPlugin()],
})

multiLogger.error("Payment failed", {
	orderId: "ord_123",
	error: new Error("Insufficient funds"),
})

// Example 4: With custom scope metadata
const scopedLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [
		otlpTransport({
			endpoint: "http://localhost:4318/v1/logs",
			scopeName: "@mycompany/payment-api",
			scopeVersion: "2.1.0",
			resourceAttributes: {
				"service.name": "payment-api",
				"service.namespace": "production",
				"service.instance.id": "instance-001",
			},
		}),
	],
	plugins: [tracingPlugin()],
})

scopedLogger.info("Service started")

// Example 5: Handling traces from HTTP requests
import type { IncomingMessage } from "node:http"

function handleRequest(req: IncomingMessage) {
	// Extract trace context from incoming request
	const traceContext = tracingPlugin.fromHeaders(req.headers as any)

	// Create child logger with trace context
	const requestLogger = createLogger({
		formatter: jsonFormatter(),
		transports: [otlpTransport()],
		plugins: [
			tracingPlugin({
				getTraceContext: () => traceContext,
			}),
		],
	})

	requestLogger.info("Request received", {
		method: req.method,
		url: req.url,
	})

	// All logs will include the same traceId for correlation
	requestLogger.debug("Processing request")
	requestLogger.info("Request completed")
}

// Example 6: Batching configuration for high throughput
const highThroughputLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [
		otlpTransport({
			endpoint: "http://localhost:4318/v1/logs",
			batch: true,
			batchSize: 500, // Send every 500 logs
			batchInterval: 5000, // Or every 5 seconds
			compression: "gzip", // Enable compression
			retries: 5, // Retry up to 5 times
		}),
	],
})

// Generate high volume of logs
for (let i = 0; i < 1000; i++) {
	highThroughputLogger.info(`Processing item ${i}`, {
		itemId: i,
		timestamp: Date.now(),
	})
}

// Flush remaining logs before exit
await highThroughputLogger.flush()

// Example 7: Error handling and monitoring
const monitoredLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [
		otlpTransport({
			endpoint: "http://localhost:4318/v1/logs",
			retries: 3,
			timeout: 5000,
			// Note: OTLP transport handles errors internally with retries
			// Failed logs are logged to console.error
		}),
	],
})

monitoredLogger.error("Critical error", {
	error: new Error("Database connection failed"),
	severity: "critical",
})

// Example 8: Complete observability stack
const observabilityLogger = createLogger({
	formatter: jsonFormatter(),
	transports: [
		otlpTransport({
			endpoint: process.env.OTLP_ENDPOINT || "http://localhost:4318/v1/logs",
			headers: {
				"X-API-Key": process.env.OTLP_API_KEY,
			},
			batch: true,
			batchSize: 100,
			resourceAttributes: {
				// Service identification
				"service.name": process.env.SERVICE_NAME || "unknown",
				"service.version": process.env.SERVICE_VERSION || "0.0.0",
				"service.namespace": process.env.NAMESPACE || "default",
				"service.instance.id": process.env.HOSTNAME || "localhost",

				// Deployment information
				"deployment.environment": process.env.NODE_ENV || "development",

				// Cloud provider (if applicable)
				"cloud.provider": "aws",
				"cloud.region": process.env.AWS_REGION,
				"cloud.availability_zone": process.env.AWS_AVAILABILITY_ZONE,

				// Container information (if applicable)
				"container.name": process.env.CONTAINER_NAME,
				"container.id": process.env.CONTAINER_ID,

				// Kubernetes (if applicable)
				"k8s.namespace.name": process.env.K8S_NAMESPACE,
				"k8s.pod.name": process.env.K8S_POD_NAME,
				"k8s.deployment.name": process.env.K8S_DEPLOYMENT,
			},
		}),
	],
	plugins: [
		tracingPlugin({
			// Auto-generate trace IDs for all logs
			generateTraceId: true,
		}),
	],
})

observabilityLogger.info("Application started", {
	port: 3000,
	env: process.env.NODE_ENV,
})

console.log("✅ OTLP examples completed!")
console.log("\nTo use with local OpenTelemetry Collector:")
console.log("1. Install: https://opentelemetry.io/docs/collector/")
console.log("2. Start collector: otelcol-contrib --config=config.yaml")
console.log("3. Run this example: tsx examples/otlp-example.ts")
