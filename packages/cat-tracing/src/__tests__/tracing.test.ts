import { describe, expect, it, beforeEach } from "bun:test"
import { TracingPlugin, tracingPlugin } from "../tracing"
import type { LogEntry } from "@sylphx/cat"
import type { TraceContext } from "../tracing/context"
import { TraceFlags } from "../tracing/context"

describe("Tracing Plugin", () => {
	describe("tracingPlugin factory", () => {
		it("should create TracingPlugin instance", () => {
			const plugin = tracingPlugin()
			expect(plugin).toBeInstanceOf(TracingPlugin)
		})

		it("should accept options", () => {
			const plugin = tracingPlugin({ enabled: false })
			expect(plugin).toBeInstanceOf(TracingPlugin)
		})
	})

	describe("onLog", () => {
		it("should add trace context to log entry", () => {
			const plugin = new TracingPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			expect(enhanced.traceId).toBeDefined()
			expect(enhanced.spanId).toBeDefined()
			expect(enhanced.traceFlags).toBe(TraceFlags.SAMPLED)
			expect(enhanced.traceId).toHaveLength(32)
			expect(enhanced.spanId).toHaveLength(16)
		})

		it("should not modify original entry", () => {
			const plugin = new TracingPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			expect(entry.traceId).toBeUndefined()
			expect(enhanced.traceId).toBeDefined()
		})

		it("should use same trace context for multiple logs", () => {
			const plugin = new TracingPlugin()
			const entry1: LogEntry = {
				level: "info",
				message: "log 1",
				timestamp: Date.now(),
			}
			const entry2: LogEntry = {
				level: "info",
				message: "log 2",
				timestamp: Date.now(),
			}

			const enhanced1 = plugin.onLog(entry1)
			const enhanced2 = plugin.onLog(entry2)

			expect(enhanced1.traceId).toBe(enhanced2.traceId)
			expect(enhanced1.spanId).toBe(enhanced2.spanId)
		})

		it("should not add trace context when disabled", () => {
			const plugin = new TracingPlugin({ enabled: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			expect(enhanced.traceId).toBeUndefined()
			expect(enhanced.spanId).toBeUndefined()
		})

		it("should not generate trace ID when generateTraceId is false", () => {
			const plugin = new TracingPlugin({ generateTraceId: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			expect(enhanced.traceId).toBeUndefined()
		})

		it("should not include trace context when includeTraceContext is false", () => {
			const plugin = new TracingPlugin({ includeTraceContext: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			expect(enhanced.traceId).toBeUndefined()
			expect(enhanced.spanId).toBeUndefined()
		})

		it("should use custom getTraceContext function", () => {
			const customContext: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.SAMPLED,
			}

			const plugin = new TracingPlugin({
				getTraceContext: () => customContext,
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			expect(enhanced.traceId).toBe(customContext.traceId)
			expect(enhanced.spanId).toBe(customContext.spanId)
			expect(enhanced.traceFlags).toBe(customContext.traceFlags)
		})

		it("should fallback to generated context when getTraceContext returns null", () => {
			const plugin = new TracingPlugin({
				getTraceContext: () => null,
			})

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			expect(enhanced.traceId).toBeDefined()
			expect(enhanced.spanId).toBeDefined()
		})

		it("should preserve other entry properties", () => {
			const plugin = new TracingPlugin()
			const entry: LogEntry = {
				level: "error",
				message: "error message",
				timestamp: 1234567890,
				data: { userId: 123 },
				context: { service: "api" },
			}

			const enhanced = plugin.onLog(entry)

			expect(enhanced.level).toBe("error")
			expect(enhanced.message).toBe("error message")
			expect(enhanced.timestamp).toBe(1234567890)
			expect(enhanced.data).toEqual({ userId: 123 })
			expect(enhanced.context).toEqual({ service: "api" })
		})
	})

	describe("setTraceContext", () => {
		it("should set custom trace context", () => {
			const plugin = new TracingPlugin()
			const customContext: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.SAMPLED,
			}

			plugin.setTraceContext(customContext)

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			expect(enhanced.traceId).toBe(customContext.traceId)
			expect(enhanced.spanId).toBe(customContext.spanId)
		})

		it("should allow clearing trace context", () => {
			const plugin = new TracingPlugin({ generateTraceId: false })
			const context: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.SAMPLED,
			}

			plugin.setTraceContext(context)
			plugin.setTraceContext(null)

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			expect(enhanced.traceId).toBeUndefined()
		})
	})

	describe("getContext", () => {
		it("should return current context", () => {
			const plugin = new TracingPlugin()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			plugin.onLog(entry)

			const context = plugin.getContext()

			expect(context).not.toBeNull()
			expect(context?.traceId).toBeDefined()
			expect(context?.spanId).toBeDefined()
		})

		it("should return null when no context set", () => {
			const plugin = new TracingPlugin({ generateTraceId: false })

			const context = plugin.getContext()

			expect(context).toBeNull()
		})
	})

	describe("fromHeaders", () => {
		it("should extract trace context from headers", () => {
			const headers = {
				traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
			}

			const context = TracingPlugin.fromHeaders(headers)

			expect(context).not.toBeNull()
			expect(context?.traceId).toBe("0af7651916cd43dd8448eb211c80319c")
			expect(context?.spanId).toBe("b7ad6b7169203331")
			expect(context?.traceFlags).toBe(0x01)
		})

		it("should handle Traceparent with capital T", () => {
			const headers = {
				Traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
			}

			const context = TracingPlugin.fromHeaders(headers)

			expect(context).not.toBeNull()
			expect(context?.traceId).toBe("0af7651916cd43dd8448eb211c80319c")
		})

		it("should handle array header values", () => {
			const headers = {
				traceparent: [
					"00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
					"other-value",
				],
			}

			const context = TracingPlugin.fromHeaders(headers)

			expect(context).not.toBeNull()
			expect(context?.traceId).toBe("0af7651916cd43dd8448eb211c80319c")
		})

		it("should return null when traceparent not present", () => {
			const headers = {
				"content-type": "application/json",
			}

			const context = TracingPlugin.fromHeaders(headers)

			expect(context).toBeNull()
		})

		it("should return null for invalid traceparent", () => {
			const headers = {
				traceparent: "invalid-header",
			}

			const context = TracingPlugin.fromHeaders(headers)

			expect(context).toBeNull()
		})
	})

	describe("toHeaders", () => {
		it("should convert trace context to headers", () => {
			const context: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: 0x01,
			}

			const headers = TracingPlugin.toHeaders(context)

			expect(headers.traceparent).toBe(
				"00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
			)
		})

		it("should round-trip with fromHeaders", () => {
			const original: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.SAMPLED,
			}

			const headers = TracingPlugin.toHeaders(original)
			const parsed = TracingPlugin.fromHeaders(headers)

			expect(parsed?.traceId).toBe(original.traceId)
			expect(parsed?.spanId).toBe(original.spanId)
			expect(parsed?.traceFlags).toBe(original.traceFlags)
		})
	})

	describe("integration scenarios", () => {
		it("should work with HTTP request flow", () => {
			// Incoming request with traceparent header
			const incomingHeaders = {
				traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
			}

			// Extract context from headers
			const context = TracingPlugin.fromHeaders(incomingHeaders)
			expect(context).not.toBeNull()

			// Set context in plugin
			const plugin = new TracingPlugin()
			plugin.setTraceContext(context!)

			// Log entry should have trace context
			const entry: LogEntry = {
				level: "info",
				message: "handling request",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			expect(enhanced.traceId).toBe("0af7651916cd43dd8448eb211c80319c")
			expect(enhanced.spanId).toBe("b7ad6b7169203331")
		})

		it("should work with outgoing request flow", () => {
			const plugin = new TracingPlugin()

			// Generate context for outgoing request
			const entry: LogEntry = {
				level: "info",
				message: "making external call",
				timestamp: Date.now(),
			}

			const enhanced = plugin.onLog(entry)

			// Get current context
			const context = plugin.getContext()
			expect(context).not.toBeNull()

			// Convert to headers for outgoing request
			const outgoingHeaders = TracingPlugin.toHeaders(context!)

			expect(outgoingHeaders.traceparent).toBeDefined()
			expect(outgoingHeaders.traceparent).toMatch(
				/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/,
			)
		})
	})
})
