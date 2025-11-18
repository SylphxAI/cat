import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test"
import {
	TailSamplingPlugin,
	tailSamplingPlugin,
	TraceBuffer,
	type SamplingRule,
} from "../tail-sampling"
import type { LogEntry } from "@sylphx/cat"

describe("Tail Sampling Plugin", () => {
	describe("tailSamplingPlugin factory", () => {
		it("should create TailSamplingPlugin instance", () => {
			const plugin = tailSamplingPlugin()
			expect(plugin).toBeInstanceOf(TailSamplingPlugin)
		})

		it("should accept options", () => {
			const plugin = tailSamplingPlugin({ enabled: false })
			expect(plugin).toBeInstanceOf(TailSamplingPlugin)
		})
	})

	describe("TraceBuffer", () => {
		it("should create trace buffer with traceId", () => {
			const buffer = new TraceBuffer("trace-123")

			expect(buffer.traceId).toBe("trace-123")
			expect(buffer.logs).toHaveLength(0)
			expect(buffer.metadata.traceId).toBe("trace-123")
		})

		it("should add logs to buffer", () => {
			const buffer = new TraceBuffer("trace-123")
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			buffer.add(entry)

			expect(buffer.logs).toHaveLength(1)
			expect(buffer.metadata.logCount).toBe(1)
		})

		it("should track errors", () => {
			const buffer = new TraceBuffer("trace-123")

			buffer.add({
				level: "info",
				message: "info",
				timestamp: Date.now(),
			})

			expect(buffer.metadata.hasError).toBe(false)

			buffer.add({
				level: "error",
				message: "error",
				timestamp: Date.now(),
			})

			expect(buffer.metadata.hasError).toBe(true)
		})

		it("should track max level", () => {
			const buffer = new TraceBuffer("trace-123")

			buffer.add({
				level: "debug",
				message: "debug",
				timestamp: Date.now(),
			})
			expect(buffer.metadata.maxLevel).toBe(20)

			buffer.add({
				level: "warn",
				message: "warn",
				timestamp: Date.now(),
			})
			expect(buffer.metadata.maxLevel).toBe(40)
		})

		it("should track duration from data", () => {
			const buffer = new TraceBuffer("trace-123")

			buffer.add({
				level: "info",
				message: "fast",
				timestamp: Date.now(),
				data: { duration: 100 },
			})

			expect(buffer.metadata.minDuration).toBe(100)
			expect(buffer.metadata.maxDuration).toBe(100)

			buffer.add({
				level: "info",
				message: "slow",
				timestamp: Date.now(),
				data: { duration: 500 },
			})

			expect(buffer.metadata.minDuration).toBe(100)
			expect(buffer.metadata.maxDuration).toBe(500)
		})

		it("should track status code", () => {
			const buffer = new TraceBuffer("trace-123")

			buffer.add({
				level: "info",
				message: "request",
				timestamp: Date.now(),
				data: { statusCode: 200 },
			})

			expect(buffer.metadata.statusCode).toBe(200)
		})

		it("should calculate trace duration", () => {
			const buffer = new TraceBuffer("trace-123")
			const startTime = Date.now()

			buffer.add({
				level: "info",
				message: "start",
				timestamp: startTime,
			})

			const duration = buffer.getDuration()

			expect(duration).toBeGreaterThanOrEqual(0)
			expect(duration).toBeLessThan(1000)
		})

		it("should estimate buffer size", () => {
			const buffer = new TraceBuffer("trace-123")

			buffer.add({
				level: "info",
				message: "log 1",
				timestamp: Date.now(),
			})
			buffer.add({
				level: "info",
				message: "log 2",
				timestamp: Date.now(),
			})

			const size = buffer.getSize()

			expect(size).toBe(2 * 2048) // 2 logs * 2KB each
		})

		it("should finalize trace", () => {
			const buffer = new TraceBuffer("trace-123")

			buffer.add({
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: { duration: 100 },
			})
			buffer.add({
				level: "info",
				message: "test2",
				timestamp: Date.now(),
				data: { duration: 200 },
			})

			buffer.finalize()

			expect(buffer.metadata.endTime).toBeDefined()
			expect(buffer.metadata.avgDuration).toBe(150) // (100 + 200) / 2
		})
	})

	describe("buffering and sampling", () => {
		it("should buffer logs with traceId", () => {
			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 3,
				onFlush,
			})

			const entry1: LogEntry = {
				level: "info",
				message: "log 1",
				timestamp: Date.now(),
				traceId: "trace-123",
			}

			const result = plugin.onLog(entry1)

			// Should return null (buffering)
			expect(result).toBeNull()

			// Cleanup
			plugin.onDestroy()
		})

		it("should pass through logs without traceId", () => {
			const plugin = new TailSamplingPlugin()

			const entry: LogEntry = {
				level: "info",
				message: "no trace",
				timestamp: Date.now(),
			}

			const result = plugin.onLog(entry)

			expect(result).toEqual(entry)

			plugin.onDestroy()
		})

		it("should flush trace when buffer size exceeded", () => {
			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 2,
				onFlush,
			})

			plugin.onLog({
				level: "info",
				message: "log 1",
				timestamp: Date.now(),
				traceId: "trace-123",
			})

			expect(onFlush).not.toHaveBeenCalled()

			plugin.onLog({
				level: "info",
				message: "log 2",
				timestamp: Date.now(),
				traceId: "trace-123",
			})

			// Should flush after reaching maxBufferSize
			expect(onFlush).toHaveBeenCalledTimes(1)

			plugin.onDestroy()
		})

		it("should pass through when disabled", () => {
			const plugin = new TailSamplingPlugin({ enabled: false })

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				traceId: "trace-123",
			}

			const result = plugin.onLog(entry)

			expect(result).toEqual(entry)

			plugin.onDestroy()
		})
	})

	describe("sampling rules", () => {
		it("should keep all errors (default rule)", () => {
			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 1,
				onFlush,
			})

			plugin.onLog({
				level: "error",
				message: "error occurred",
				timestamp: Date.now(),
				traceId: "trace-123",
			})

			expect(onFlush).toHaveBeenCalledTimes(1)
			const [trace, kept] = onFlush.mock.calls[0] as unknown as [any, boolean]

			expect(trace.metadata.hasError).toBe(true)
			expect(kept).toBe(true) // Errors should always be kept

			plugin.onDestroy()
		})

		it("should sample based on custom rules", () => {
			const customRules: SamplingRule[] = [
				{
					name: "keep-all",
					condition: () => true,
					sampleRate: 1.0,
					priority: 100,
				},
			]

			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 1,
				rules: customRules,
				onFlush,
			})

			plugin.onLog({
				level: "info",
				message: "test",
				timestamp: Date.now(),
				traceId: "trace-123",
			})

			expect(onFlush).toHaveBeenCalledTimes(1)
			const [, kept] = onFlush.mock.calls[0] as unknown as [any, boolean]
			expect(kept).toBe(true)

			plugin.onDestroy()
		})

		it("should discard based on rules", () => {
			const customRules: SamplingRule[] = [
				{
					name: "discard-all",
					condition: () => true,
					sampleRate: 0.0,
					priority: 100,
				},
			]

			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 1,
				rules: customRules,
				onFlush,
			})

			plugin.onLog({
				level: "info",
				message: "test",
				timestamp: Date.now(),
				traceId: "trace-123",
			})

			expect(onFlush).toHaveBeenCalledTimes(1)
			const [, kept] = onFlush.mock.calls[0] as unknown as [any, boolean]
			expect(kept).toBe(false)

			plugin.onDestroy()
		})

		it("should evaluate rules by priority", () => {
			const customRules: SamplingRule[] = [
				{
					name: "low-priority",
					condition: () => true,
					sampleRate: 0.0,
					priority: 1,
				},
				{
					name: "high-priority",
					condition: () => true,
					sampleRate: 1.0,
					priority: 100,
				},
			]

			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 1,
				rules: customRules,
				onFlush,
			})

			plugin.onLog({
				level: "info",
				message: "test",
				timestamp: Date.now(),
				traceId: "trace-123",
			})

			const [, kept] = onFlush.mock.calls[0] as unknown as [any, boolean]
			expect(kept).toBe(true) // High priority rule should win

			plugin.onDestroy()
		})

		it("should apply rules based on status code", () => {
			const customRules: SamplingRule[] = [
				{
					name: "5xx-errors",
					condition: (trace) => (trace.metadata.statusCode || 0) >= 500,
					sampleRate: 1.0,
					priority: 100,
				},
			]

			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 1,
				rules: customRules,
				onFlush,
			})

			plugin.onLog({
				level: "error",
				message: "server error",
				timestamp: Date.now(),
				traceId: "trace-123",
				data: { statusCode: 500 },
			})

			const [trace, kept] = onFlush.mock.calls[0] as unknown as [any, boolean]
			expect(trace.metadata.statusCode).toBe(500)
			expect(kept).toBe(true)

			plugin.onDestroy()
		})
	})

	describe("manual flushing", () => {
		it("should flush specific trace", () => {
			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 100, // Large enough to not auto-flush
				onFlush,
			})

			plugin.onLog({
				level: "info",
				message: "test",
				timestamp: Date.now(),
				traceId: "trace-123",
			})

			expect(onFlush).not.toHaveBeenCalled()

			plugin.flush("trace-123")

			expect(onFlush).toHaveBeenCalledTimes(1)

			plugin.onDestroy()
		})

		it("should flush all traces", () => {
			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 100,
				onFlush,
			})

			plugin.onLog({
				level: "info",
				message: "trace 1",
				timestamp: Date.now(),
				traceId: "trace-1",
			})

			plugin.onLog({
				level: "info",
				message: "trace 2",
				timestamp: Date.now(),
				traceId: "trace-2",
			})

			plugin.flushAll()

			expect(onFlush).toHaveBeenCalledTimes(2)

			plugin.onDestroy()
		})
	})

	describe("custom traceId extractor", () => {
		it("should use custom getTraceId function", () => {
			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 1,
				getTraceId: (entry) => entry.data?.customTraceId as string,
				onFlush,
			})

			plugin.onLog({
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: { customTraceId: "custom-123" },
			})

			expect(onFlush).toHaveBeenCalledTimes(1)
			const [trace] = onFlush.mock.calls[0] as unknown as [any]
			expect(trace.traceId).toBe("custom-123")

			plugin.onDestroy()
		})
	})

	describe("cleanup", () => {
		it("should clean up on destroy", () => {
			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 100,
				onFlush,
			})

			plugin.onLog({
				level: "info",
				message: "test",
				timestamp: Date.now(),
				traceId: "trace-123",
			})

			plugin.onDestroy()

			// Should flush remaining traces
			expect(onFlush).toHaveBeenCalledTimes(1)
		})
	})

	describe("default rules behavior", () => {
		it("should keep slow requests by default", () => {
			const onFlush = mock(() => {})
			const plugin = new TailSamplingPlugin({
				maxBufferSize: 1,
				onFlush,
			})

			plugin.onLog({
				level: "info",
				message: "slow request",
				timestamp: Date.now(),
				traceId: "trace-123",
				data: { duration: 2000 }, // > 1000ms
			})

			const [trace, kept] = onFlush.mock.calls[0] as unknown as [any, boolean]
			expect(trace.metadata.maxDuration).toBe(2000)
			expect(kept).toBe(true)

			plugin.onDestroy()
		})

		it("should sample warnings at lower rate", () => {
			const results: boolean[] = []
			const onFlush = mock((trace, kept) => {
				results.push(kept)
			})

			const plugin = new TailSamplingPlugin({
				maxBufferSize: 1,
				onFlush,
			})

			// Run multiple times to test probabilistic sampling
			for (let i = 0; i < 10; i++) {
				plugin.onLog({
					level: "warn",
					message: "warning",
					timestamp: Date.now(),
					traceId: `trace-${i}`,
				})
			}

			// Not all should be kept (sample rate is 20% for warnings)
			const keptCount = results.filter((k) => k).length
			expect(keptCount).toBeLessThan(10)

			plugin.onDestroy()
		})
	})
})
