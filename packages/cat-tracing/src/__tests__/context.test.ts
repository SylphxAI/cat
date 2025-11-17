import { describe, expect, it } from "bun:test"
import {
	generateTraceId,
	generateSpanId,
	isValidTraceId,
	isValidSpanId,
	parseTraceparent,
	formatTraceparent,
	parseTracestate,
	formatTracestate,
	createTraceContext,
	isSampled,
	setSampled,
	TraceFlags,
	type TraceContext,
} from "../tracing/context"

describe("W3C Trace Context", () => {
	describe("ID generation", () => {
		it("should generate valid trace ID", () => {
			const traceId = generateTraceId()

			expect(traceId).toHaveLength(32)
			expect(traceId).toMatch(/^[0-9a-f]{32}$/)
			expect(isValidTraceId(traceId)).toBe(true)
		})

		it("should generate unique trace IDs", () => {
			const id1 = generateTraceId()
			const id2 = generateTraceId()

			expect(id1).not.toBe(id2)
		})

		it("should generate valid span ID", () => {
			const spanId = generateSpanId()

			expect(spanId).toHaveLength(16)
			expect(spanId).toMatch(/^[0-9a-f]{16}$/)
			expect(isValidSpanId(spanId)).toBe(true)
		})

		it("should generate unique span IDs", () => {
			const id1 = generateSpanId()
			const id2 = generateSpanId()

			expect(id1).not.toBe(id2)
		})
	})

	describe("ID validation", () => {
		it("should validate correct trace ID", () => {
			expect(isValidTraceId("0af7651916cd43dd8448eb211c80319c")).toBe(true)
		})

		it("should reject invalid trace ID formats", () => {
			expect(isValidTraceId("")).toBe(false)
			expect(isValidTraceId("invalid")).toBe(false)
			expect(isValidTraceId("0af7651916cd43dd")).toBe(false) // Too short
			expect(isValidTraceId("0af7651916cd43dd8448eb211c80319c00")).toBe(false) // Too long
			expect(isValidTraceId("0AF7651916CD43DD8448EB211C80319C")).toBe(false) // Uppercase
		})

		it("should reject all-zeros trace ID", () => {
			expect(isValidTraceId("00000000000000000000000000000000")).toBe(false)
		})

		it("should validate correct span ID", () => {
			expect(isValidSpanId("b7ad6b7169203331")).toBe(true)
		})

		it("should reject invalid span ID formats", () => {
			expect(isValidSpanId("")).toBe(false)
			expect(isValidSpanId("invalid")).toBe(false)
			expect(isValidSpanId("b7ad6b71")).toBe(false) // Too short
			expect(isValidSpanId("b7ad6b716920333100")).toBe(false) // Too long
			expect(isValidSpanId("B7AD6B7169203331")).toBe(false) // Uppercase
		})

		it("should reject all-zeros span ID", () => {
			expect(isValidSpanId("0000000000000000")).toBe(false)
		})
	})

	describe("parseTraceparent", () => {
		it("should parse valid traceparent header", () => {
			const header = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
			const context = parseTraceparent(header)

			expect(context).not.toBeNull()
			expect(context?.traceId).toBe("0af7651916cd43dd8448eb211c80319c")
			expect(context?.spanId).toBe("b7ad6b7169203331")
			expect(context?.traceFlags).toBe(0x01)
		})

		it("should parse traceparent with flags 00", () => {
			const header = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00"
			const context = parseTraceparent(header)

			expect(context?.traceFlags).toBe(0x00)
		})

		it("should return null for invalid format", () => {
			expect(parseTraceparent("invalid")).toBeNull()
			expect(parseTraceparent("")).toBeNull()
			expect(parseTraceparent("00-abc")).toBeNull()
		})

		it("should return null for wrong number of parts", () => {
			expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331")).toBeNull()
			expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01-extra")).toBeNull()
		})

		it("should return null for unsupported version", () => {
			const header = "01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"
			expect(parseTraceparent(header)).toBeNull()
		})

		it("should return null for invalid trace ID", () => {
			expect(parseTraceparent("00-invalid-b7ad6b7169203331-01")).toBeNull()
			expect(parseTraceparent("00-00000000000000000000000000000000-b7ad6b7169203331-01")).toBeNull()
		})

		it("should return null for invalid span ID", () => {
			expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-invalid-01")).toBeNull()
			expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01")).toBeNull()
		})

		it("should return null for invalid flags", () => {
			expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-1")).toBeNull()
			expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-001")).toBeNull()
			expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-xx")).toBeNull()
		})

		it("should handle null input", () => {
			expect(parseTraceparent(null as any)).toBeNull()
			expect(parseTraceparent(undefined as any)).toBeNull()
		})
	})

	describe("formatTraceparent", () => {
		it("should format trace context as traceparent", () => {
			const context: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: 0x01,
			}

			const header = formatTraceparent(context)

			expect(header).toBe("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01")
		})

		it("should format with flags 00", () => {
			const context: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: 0x00,
			}

			const header = formatTraceparent(context)

			expect(header).toBe("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00")
		})

		it("should pad flags to 2 hex chars", () => {
			const context: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: 0x0f,
			}

			const header = formatTraceparent(context)

			expect(header).toBe("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-0f")
		})

		it("should round-trip with parseTraceparent", () => {
			const original: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: 0x01,
			}

			const header = formatTraceparent(original)
			const parsed = parseTraceparent(header)

			expect(parsed?.traceId).toBe(original.traceId)
			expect(parsed?.spanId).toBe(original.spanId)
			expect(parsed?.traceFlags).toBe(original.traceFlags)
		})
	})

	describe("parseTracestate", () => {
		it("should parse tracestate header", () => {
			const header = "vendor1=value1,vendor2=value2"
			const state = parseTracestate(header)

			expect(state).toEqual({
				vendor1: "value1",
				vendor2: "value2",
			})
		})

		it("should handle spaces", () => {
			const header = "vendor1=value1 , vendor2=value2"
			const state = parseTracestate(header)

			expect(state).toEqual({
				vendor1: "value1",
				vendor2: "value2",
			})
		})

		it("should handle empty header", () => {
			expect(parseTracestate("")).toEqual({})
			expect(parseTracestate(null as any)).toEqual({})
			expect(parseTracestate(undefined as any)).toEqual({})
		})

		it("should skip invalid pairs", () => {
			const header = "vendor1=value1,invalid,vendor2=value2"
			const state = parseTracestate(header)

			expect(state).toEqual({
				vendor1: "value1",
				vendor2: "value2",
			})
		})

		it("should handle single pair", () => {
			const header = "vendor=value"
			const state = parseTracestate(header)

			expect(state).toEqual({ vendor: "value" })
		})
	})

	describe("formatTracestate", () => {
		it("should format tracestate object", () => {
			const state = {
				vendor1: "value1",
				vendor2: "value2",
			}

			const header = formatTracestate(state)

			expect(header).toBe("vendor1=value1,vendor2=value2")
		})

		it("should handle empty object", () => {
			expect(formatTracestate({})).toBe("")
		})

		it("should handle single entry", () => {
			const header = formatTracestate({ vendor: "value" })
			expect(header).toBe("vendor=value")
		})

		it("should round-trip with parseTracestate", () => {
			const original = {
				vendor1: "value1",
				vendor2: "value2",
			}

			const header = formatTracestate(original)
			const parsed = parseTracestate(header)

			expect(parsed).toEqual(original)
		})
	})

	describe("createTraceContext", () => {
		it("should create new trace context", () => {
			const context = createTraceContext()

			expect(isValidTraceId(context.traceId)).toBe(true)
			expect(isValidSpanId(context.spanId)).toBe(true)
			expect(context.traceFlags).toBe(TraceFlags.SAMPLED)
		})

		it("should create child context from parent", () => {
			const parent: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.SAMPLED,
			}

			const child = createTraceContext(parent)

			expect(child.traceId).toBe(parent.traceId) // Same trace ID
			expect(child.spanId).not.toBe(parent.spanId) // New span ID
			expect(isValidSpanId(child.spanId)).toBe(true)
			expect(child.traceFlags).toBe(parent.traceFlags)
		})

		it("should preserve traceState from parent", () => {
			const parent: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.SAMPLED,
				traceState: "vendor=value",
			}

			const child = createTraceContext(parent)

			expect(child.traceState).toBe("vendor=value")
		})

		it("should create unique contexts", () => {
			const ctx1 = createTraceContext()
			const ctx2 = createTraceContext()

			expect(ctx1.traceId).not.toBe(ctx2.traceId)
			expect(ctx1.spanId).not.toBe(ctx2.spanId)
		})
	})

	describe("sampling", () => {
		it("should check if trace is sampled", () => {
			const sampledContext: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.SAMPLED,
			}

			expect(isSampled(sampledContext)).toBe(true)
		})

		it("should check if trace is not sampled", () => {
			const unsampledContext: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.NONE,
			}

			expect(isSampled(unsampledContext)).toBe(false)
		})

		it("should set sampled flag", () => {
			const context: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.NONE,
			}

			const sampled = setSampled(context, true)

			expect(isSampled(sampled)).toBe(true)
			expect(sampled.traceFlags).toBe(TraceFlags.SAMPLED)
		})

		it("should unset sampled flag", () => {
			const context: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.SAMPLED,
			}

			const unsampled = setSampled(context, false)

			expect(isSampled(unsampled)).toBe(false)
			expect(unsampled.traceFlags).toBe(TraceFlags.NONE)
		})

		it("should not mutate original context", () => {
			const original: TraceContext = {
				traceId: "0af7651916cd43dd8448eb211c80319c",
				spanId: "b7ad6b7169203331",
				traceFlags: TraceFlags.NONE,
			}

			const sampled = setSampled(original, true)

			expect(original.traceFlags).toBe(TraceFlags.NONE)
			expect(sampled.traceFlags).toBe(TraceFlags.SAMPLED)
		})
	})

	describe("TraceFlags constants", () => {
		it("should have correct flag values", () => {
			expect(TraceFlags.NONE).toBe(0x00)
			expect(TraceFlags.SAMPLED).toBe(0x01)
		})
	})
})
