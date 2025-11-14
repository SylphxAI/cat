import { describe, expect, test } from "vitest"
import type { LogEntry } from "../src/core/types"
import { tracingPlugin, TracingPlugin } from "../src/plugins/tracing"
import {
	createTraceContext,
	formatTraceparent,
	formatTracestate,
	generateSpanId,
	generateTraceId,
	isSampled,
	isValidSpanId,
	isValidTraceId,
	parseTraceparent,
	parseTracestate,
	setSampled,
	TraceFlags,
	type TraceContext,
} from "../src/tracing/context"

describe("Trace Context", () => {
	test("generateTraceId should create valid trace ID", () => {
		const traceId = generateTraceId()

		expect(traceId).toMatch(/^[0-9a-f]{32}$/)
		expect(isValidTraceId(traceId)).toBe(true)
	})

	test("generateSpanId should create valid span ID", () => {
		const spanId = generateSpanId()

		expect(spanId).toMatch(/^[0-9a-f]{16}$/)
		expect(isValidSpanId(spanId)).toBe(true)
	})

	test("isValidTraceId should validate format", () => {
		expect(isValidTraceId("0af7651916cd43dd8448eb211c80319c")).toBe(true)
		expect(isValidTraceId("invalid")).toBe(false)
		expect(isValidTraceId("00000000000000000000000000000000")).toBe(false) // All zeros
	})

	test("isValidSpanId should validate format", () => {
		expect(isValidSpanId("b7ad6b7169203331")).toBe(true)
		expect(isValidSpanId("invalid")).toBe(false)
		expect(isValidSpanId("0000000000000000")).toBe(false) // All zeros
	})

	test("parseTraceparent should parse valid header", () => {
		const header = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
		const result = parseTraceparent(header)

		expect(result).toEqual({
			traceId: "0af7651916cd43dd8448eb211c80319c",
			spanId: "b7ad6b7169203331",
			traceFlags: 1,
		})
	})

	test("parseTraceparent should reject invalid format", () => {
		expect(parseTraceparent("")).toBe(null)
		expect(parseTraceparent("invalid")).toBe(null)
		expect(parseTraceparent("00-invalid-span-00")).toBe(null)
		expect(parseTraceparent("99-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01")).toBe(null) // Wrong version
	})

	test("parseTraceparent should reject all-zero IDs", () => {
		expect(parseTraceparent("00-00000000000000000000000000000000-b7ad6b7169203331-01")).toBe(null)
		expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01")).toBe(null)
	})

	test("formatTraceparent should create valid header", () => {
		const context: TraceContext = {
			traceId: "0af7651916cd43dd8448eb211c80319c",
			spanId: "b7ad6b7169203331",
			traceFlags: 1,
		}

		const header = formatTraceparent(context)

		expect(header).toBe("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01")
	})

	test("parseTracestate should parse valid header", () => {
		const header = "vendor1=value1,vendor2=value2"
		const result = parseTracestate(header)

		expect(result).toEqual({
			vendor1: "value1",
			vendor2: "value2",
		})
	})

	test("parseTracestate should handle whitespace", () => {
		const header = " vendor1 = value1 , vendor2 = value2 "
		const result = parseTracestate(header)

		expect(result).toEqual({
			vendor1: "value1",
			vendor2: "value2",
		})
	})

	test("formatTracestate should create valid header", () => {
		const state = {
			vendor1: "value1",
			vendor2: "value2",
		}

		const header = formatTracestate(state)

		expect(header).toBe("vendor1=value1,vendor2=value2")
	})

	test("createTraceContext should generate new context", () => {
		const context = createTraceContext()

		expect(isValidTraceId(context.traceId)).toBe(true)
		expect(isValidSpanId(context.spanId)).toBe(true)
		expect(context.traceFlags).toBe(TraceFlags.SAMPLED)
	})

	test("createTraceContext should inherit trace ID from parent", () => {
		const parent: TraceContext = {
			traceId: "0af7651916cd43dd8448eb211c80319c",
			spanId: "b7ad6b7169203331",
			traceFlags: TraceFlags.SAMPLED,
		}

		const child = createTraceContext(parent)

		expect(child.traceId).toBe(parent.traceId) // Same trace ID
		expect(child.spanId).not.toBe(parent.spanId) // Different span ID
		expect(child.traceFlags).toBe(parent.traceFlags)
	})

	test("isSampled should check sampled flag", () => {
		expect(isSampled({ traceId: "", spanId: "", traceFlags: TraceFlags.SAMPLED })).toBe(true)
		expect(isSampled({ traceId: "", spanId: "", traceFlags: TraceFlags.NONE })).toBe(false)
	})

	test("setSampled should update sampled flag", () => {
		const context: TraceContext = {
			traceId: "0af7651916cd43dd8448eb211c80319c",
			spanId: "b7ad6b7169203331",
			traceFlags: TraceFlags.NONE,
		}

		const sampled = setSampled(context, true)
		expect(sampled.traceFlags).toBe(TraceFlags.SAMPLED)

		const unsampled = setSampled(sampled, false)
		expect(unsampled.traceFlags).toBe(TraceFlags.NONE)
	})
})

describe("Tracing Plugin", () => {
	test("should add trace context to log entry", () => {
		const plugin = tracingPlugin()

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "test",
		}

		const result = plugin.onLog!(entry)

		expect(result.traceId).toBeDefined()
		expect(result.spanId).toBeDefined()
		expect(isValidTraceId(result.traceId!)).toBe(true)
		expect(isValidSpanId(result.spanId!)).toBe(true)
	})

	test("should use existing trace context", () => {
		const context: TraceContext = {
			traceId: "0af7651916cd43dd8448eb211c80319c",
			spanId: "b7ad6b7169203331",
			traceFlags: TraceFlags.SAMPLED,
		}

		const plugin = new TracingPlugin()
		plugin.setTraceContext(context)

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "test",
		}

		const result = plugin.onLog!(entry)

		expect(result.traceId).toBe(context.traceId)
		expect(result.spanId).toBe(context.spanId)
	})

	test("should not generate trace ID if disabled", () => {
		const plugin = tracingPlugin({
			generateTraceId: false,
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "test",
		}

		const result = plugin.onLog!(entry)

		expect(result.traceId).toBeUndefined()
		expect(result.spanId).toBeUndefined()
	})

	test("should use custom getTraceContext", () => {
		const customContext: TraceContext = {
			traceId: "custom1234567890123456789012345678",
			spanId: "custom1234567890",
			traceFlags: TraceFlags.SAMPLED,
		}

		const plugin = tracingPlugin({
			getTraceContext: () => customContext,
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "test",
		}

		const result = plugin.onLog!(entry)

		expect(result.traceId).toBe(customContext.traceId)
		expect(result.spanId).toBe(customContext.spanId)
	})

	test("should extract trace context from HTTP headers", () => {
		const headers = {
			traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
		}

		const context = TracingPlugin.fromHeaders(headers)

		expect(context).toEqual({
			traceId: "0af7651916cd43dd8448eb211c80319c",
			spanId: "b7ad6b7169203331",
			traceFlags: 1,
		})
	})

	test("should handle array header values", () => {
		const headers = {
			traceparent: ["00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"],
		}

		const context = TracingPlugin.fromHeaders(headers)

		expect(context?.traceId).toBe("0af7651916cd43dd8448eb211c80319c")
	})

	test("should inject trace context into HTTP headers", () => {
		const context: TraceContext = {
			traceId: "0af7651916cd43dd8448eb211c80319c",
			spanId: "b7ad6b7169203331",
			traceFlags: 1,
		}

		const headers = TracingPlugin.toHeaders(context)

		expect(headers.traceparent).toBe("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01")
	})

	test("should be disabled when enabled is false", () => {
		const plugin = tracingPlugin({ enabled: false })

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "test",
		}

		const result = plugin.onLog!(entry)

		expect(result.traceId).toBeUndefined()
		expect(result.spanId).toBeUndefined()
	})

	test("should not include trace context if includeTraceContext is false", () => {
		const plugin = tracingPlugin({
			includeTraceContext: false,
		})

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "test",
		}

		const result = plugin.onLog!(entry)

		expect(result.traceId).toBeUndefined()
		expect(result.spanId).toBeUndefined()
	})

	test("should include trace flags", () => {
		const context: TraceContext = {
			traceId: "0af7651916cd43dd8448eb211c80319c",
			spanId: "b7ad6b7169203331",
			traceFlags: TraceFlags.SAMPLED,
		}

		const plugin = new TracingPlugin()
		plugin.setTraceContext(context)

		const entry: LogEntry = {
			level: "info",
			timestamp: Date.now(),
			message: "test",
		}

		const result = plugin.onLog!(entry)

		expect(result.traceFlags).toBe(TraceFlags.SAMPLED)
	})
})
