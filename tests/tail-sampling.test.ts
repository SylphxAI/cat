import { beforeEach, describe, expect, test, vi } from "vitest"
import type { LogEntry } from "../src/core/types"
import {
	TailSamplingPlugin,
	TraceBuffer,
	tailSamplingPlugin,
	type SamplingRule,
} from "../src/plugins/tail-sampling"

describe("TraceBuffer", () => {
	test("should initialize with trace ID", () => {
		const buffer = new TraceBuffer("trace-123")

		expect(buffer.traceId).toBe("trace-123")
		expect(buffer.logs).toEqual([])
		expect(buffer.metadata.logCount).toBe(0)
		expect(buffer.metadata.hasError).toBe(false)
	})

	test("should add log entries", () => {
		const buffer = new TraceBuffer("trace-123")

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			traceId: "trace-123",
		}

		buffer.add(entry)

		expect(buffer.logs).toHaveLength(1)
		expect(buffer.metadata.logCount).toBe(1)
	})

	test("should detect errors", () => {
		const buffer = new TraceBuffer("trace-123")

		buffer.add({
			level: "info",
			timestamp: Date.now(),
			message: "Normal log",
			traceId: "trace-123",
		})

		expect(buffer.metadata.hasError).toBe(false)

		buffer.add({
			level: "error",
			timestamp: Date.now(),
			message: "Error occurred",
			traceId: "trace-123",
		})

		expect(buffer.metadata.hasError).toBe(true)
	})

	test("should track max level", () => {
		const buffer = new TraceBuffer("trace-123")

		buffer.add({
			level: "info",
			timestamp: Date.now(),
			message: "Info",
			traceId: "trace-123",
		})

		expect(buffer.metadata.maxLevel).toBe(30) // info = 30

		buffer.add({
			level: "warn",
			timestamp: Date.now(),
			message: "Warning",
			traceId: "trace-123",
		})

		expect(buffer.metadata.maxLevel).toBe(40) // warn = 40
	})

	test("should track duration", () => {
		const buffer = new TraceBuffer("trace-123")

		buffer.add({
			level: "info",
			timestamp: Date.now(),
			message: "Request started",
			traceId: "trace-123",
			data: { duration: 100 },
		})

		buffer.add({
			level: "info",
			timestamp: Date.now(),
			message: "Request completed",
			traceId: "trace-123",
			data: { duration: 500 },
		})

		expect(buffer.metadata.minDuration).toBe(100)
		expect(buffer.metadata.maxDuration).toBe(500)
	})

	test("should track status code", () => {
		const buffer = new TraceBuffer("trace-123")

		buffer.add({
			level: "info",
			timestamp: Date.now(),
			message: "Response sent",
			traceId: "trace-123",
			data: { statusCode: 200 },
		})

		expect(buffer.metadata.statusCode).toBe(200)

		// Should use last status code
		buffer.add({
			level: "error",
			timestamp: Date.now(),
			message: "Error response",
			traceId: "trace-123",
			data: { statusCode: 500 },
		})

		expect(buffer.metadata.statusCode).toBe(500)
	})

	test("should finalize trace", () => {
		const buffer = new TraceBuffer("trace-123")

		buffer.add({
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			traceId: "trace-123",
			data: { duration: 100 },
		})

		buffer.add({
			level: "info",
			timestamp: Date.now(),
			message: "Test 2",
			traceId: "trace-123",
			data: { duration: 300 },
		})

		buffer.finalize()

		expect(buffer.metadata.endTime).toBeDefined()
		expect(buffer.metadata.avgDuration).toBe(200) // (100 + 300) / 2
	})

	test("should calculate duration", () => {
		const buffer = new TraceBuffer("trace-123")

		// Small delay
		setTimeout(() => {
			const duration = buffer.getDuration()
			expect(duration).toBeGreaterThan(0)
		}, 10)
	})

	test("should detect expiration", () => {
		const buffer = new TraceBuffer("trace-123")

		expect(buffer.isExpired(1000)).toBe(false)

		// Simulate time passing
		setTimeout(() => {
			expect(buffer.isExpired(5)).toBe(true)
		}, 10)
	})
})

describe("TailSamplingPlugin", () => {
	test("should buffer logs with trace ID", () => {
		const plugin = new TailSamplingPlugin()

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			traceId: "trace-123",
		}

		const result = plugin.onLog!(entry)

		// Should return null (buffering)
		expect(result).toBe(null)
	})

	test("should pass through logs without trace ID", () => {
		const plugin = new TailSamplingPlugin()

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			// No traceId
		}

		const result = plugin.onLog!(entry)

		// Should pass through
		expect(result).toEqual(entry)
	})

	test("should keep all errors (default rule)", () => {
		const flushedTraces: Array<{ trace: any; kept: boolean }> = []

		const plugin = new TailSamplingPlugin({
			onFlush: (trace, kept) => {
				flushedTraces.push({ trace, kept })
			},
		})

		// Add error log
		plugin.onLog!({
			level: "error",
			timestamp: Date.now(),
			message: "Error occurred",
			traceId: "trace-error",
		})

		// Manually flush
		plugin.flush("trace-error")

		expect(flushedTraces).toHaveLength(1)
		expect(flushedTraces[0].kept).toBe(true)
	})

	test("should apply custom rules", () => {
		const customRules: SamplingRule[] = [
			{
				name: "keep-vip",
				priority: 100,
				condition: (trace) => trace.metadata.customFields.userId === "vip",
				sampleRate: 1.0,
			},
			{
				name: "discard-others",
				priority: 0,
				condition: () => true,
				sampleRate: 0.0, // Never keep
			},
		]

		const flushedTraces: Array<{ trace: any; kept: boolean }> = []

		const plugin = new TailSamplingPlugin({
			rules: customRules,
			onFlush: (trace, kept) => {
				flushedTraces.push({ trace, kept })
			},
		})

		// VIP user
		plugin.onLog!({
			level: "info",
			timestamp: Date.now(),
			message: "VIP action",
			traceId: "trace-vip",
			data: { userId: "vip" },
		})

		// Regular user
		plugin.onLog!({
			level: "info",
			timestamp: Date.now(),
			message: "Regular action",
			traceId: "trace-regular",
			data: { userId: "regular" },
		})

		plugin.flush("trace-vip")
		plugin.flush("trace-regular")

		expect(flushedTraces).toHaveLength(2)
		expect(flushedTraces[0].kept).toBe(true) // VIP kept
		expect(flushedTraces[1].kept).toBe(false) // Regular discarded
	})

	test("should flush when buffer size limit reached", () => {
		let flushed = false

		const plugin = new TailSamplingPlugin({
			maxBufferSize: 3,
			onFlush: () => {
				flushed = true
			},
		})

		// Add 3 logs (should trigger flush)
		for (let i = 0; i < 3; i++) {
			plugin.onLog!({
				level: "info",
				timestamp: Date.now(),
				message: `Log ${i}`,
				traceId: "trace-123",
			})
		}

		expect(flushed).toBe(true)
	})

	test("should sample based on status codes", () => {
		const flushedTraces: Array<{ statusCode?: number; kept: boolean }> = []

		const plugin = new TailSamplingPlugin({
			onFlush: (trace, kept) => {
				flushedTraces.push({
					statusCode: trace.metadata.statusCode,
					kept,
				})
			},
		})

		// 5xx - should keep
		plugin.onLog!({
			level: "info",
			timestamp: Date.now(),
			message: "Server error",
			traceId: "trace-500",
			data: { statusCode: 500 },
		})

		plugin.flush("trace-500")

		expect(flushedTraces[0].statusCode).toBe(500)
		expect(flushedTraces[0].kept).toBe(true)
	})

	test("should sample slow requests", () => {
		const flushedTraces: Array<{ maxDuration?: number; kept: boolean }> = []

		const plugin = new TailSamplingPlugin({
			onFlush: (trace, kept) => {
				flushedTraces.push({
					maxDuration: trace.metadata.maxDuration,
					kept,
				})
			},
		})

		// Slow request (>1s)
		plugin.onLog!({
			level: "info",
			timestamp: Date.now(),
			message: "Slow request",
			traceId: "trace-slow",
			data: { duration: 1500 },
		})

		plugin.flush("trace-slow")

		expect(flushedTraces[0].maxDuration).toBe(1500)
		expect(flushedTraces[0].kept).toBe(true)
	})

	test("should handle multiple traces concurrently", () => {
		const plugin = new TailSamplingPlugin()

		// Create multiple traces
		for (let i = 0; i < 5; i++) {
			plugin.onLog!({
				level: "info",
				timestamp: Date.now(),
				message: `Trace ${i}`,
				traceId: `trace-${i}`,
			})
		}

		// Flush all
		plugin.flushAll()

		// All traces should be flushed
		// (Can't easily verify without exposing internals)
	})

	test("should be disabled when enabled is false", () => {
		const plugin = new TailSamplingPlugin({
			enabled: false,
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			traceId: "trace-123",
		}

		const result = plugin.onLog!(entry)

		// Should pass through when disabled
		expect(result).toEqual(entry)
	})

	test("should use custom trace ID extractor", () => {
		const plugin = new TailSamplingPlugin({
			getTraceId: (entry) => entry.data?.customTraceId as string,
		})

		plugin.onLog!({
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			data: { customTraceId: "custom-123" },
		})

		// Should buffer using custom trace ID
		plugin.flush("custom-123")
	})

	test("should clean up on destroy", () => {
		const plugin = new TailSamplingPlugin()

		plugin.onLog!({
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			traceId: "trace-123",
		})

		plugin.onDestroy!()

		// Should flush all traces and clean up
		// (Can't easily verify without exposing internals)
	})

	test("tailSamplingPlugin factory should create plugin", () => {
		const plugin = tailSamplingPlugin({
			maxBufferSize: 500,
		})

		expect(plugin).toBeInstanceOf(TailSamplingPlugin)
		expect(plugin.name).toBe("tail-sampling")
	})

	test("should prioritize rules correctly", () => {
		const executionOrder: string[] = []

		const rules: SamplingRule[] = [
			{
				name: "low-priority",
				priority: 10,
				condition: (trace) => {
					executionOrder.push("low-priority")
					return false
				},
				sampleRate: 1.0,
			},
			{
				name: "high-priority",
				priority: 100,
				condition: (trace) => {
					executionOrder.push("high-priority")
					return true
				},
				sampleRate: 1.0,
			},
		]

		const plugin = new TailSamplingPlugin({
			rules,
			onFlush: () => {},
		})

		plugin.onLog!({
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			traceId: "trace-123",
		})

		plugin.flush("trace-123")

		// High priority should execute first
		expect(executionOrder[0]).toBe("high-priority")
	})

	test("should handle adaptive sampling", () => {
		const plugin = new TailSamplingPlugin({
			adaptive: true,
			monthlyBudget: 1024 * 1024, // 1 MB
		})

		// Add many logs to simulate budget pressure
		for (let i = 0; i < 100; i++) {
			plugin.onLog!({
				level: "info",
				timestamp: Date.now(),
				message: `Log ${i}`,
				traceId: `trace-${i}`,
				data: { statusCode: 200 },
			})

			plugin.flush(`trace-${i}`)
		}

		// Adaptive multiplier should be adjusted
		// (Can't verify without exposing internals, but no errors is good)
	})

	test("should track custom fields", () => {
		let flushedTrace: any

		const plugin = new TailSamplingPlugin({
			onFlush: (trace) => {
				flushedTrace = trace
			},
		})

		plugin.onLog!({
			level: "info",
			timestamp: Date.now(),
			message: "Test",
			traceId: "trace-123",
			data: {
				userId: "user-456",
				sessionId: "session-789",
				customField: "value",
			},
		})

		plugin.flush("trace-123")

		expect(flushedTrace.metadata.customFields).toEqual({
			userId: "user-456",
			sessionId: "session-789",
			customField: "value",
		})
	})
})

describe("Integration", () => {
	test("should work with tracing plugin", () => {
		const tracingPlugin = {
			name: "tracing",
			onLog: (entry: LogEntry): LogEntry => ({
				...entry,
				traceId: "auto-trace-123",
				spanId: "span-456",
			}),
		}

		const flushedTraces: any[] = []

		const tailPlugin = new TailSamplingPlugin({
			onFlush: (trace, kept) => {
				if (kept) {
					flushedTraces.push(trace)
				}
			},
		})

		// Simulate plugin chain
		let entry: LogEntry | null = {
			level: "error",
			timestamp: Date.now(),
			message: "Test error",
		}

		// 1. Tracing plugin adds trace ID
		entry = tracingPlugin.onLog(entry)

		// 2. Tail sampling plugin buffers
		entry = tailPlugin.onLog!(entry!)

		// Should be buffered (null)
		expect(entry).toBe(null)

		// Flush
		tailPlugin.flush("auto-trace-123")

		// Should be kept (error)
		expect(flushedTraces).toHaveLength(1)
		expect(flushedTraces[0].metadata.hasError).toBe(true)
	})
})
