import { describe, expect, test } from "bun:test"
import type { LogEntry } from "../src/index"
import { jsonFormatter, prettyFormatter } from "../src/index"

describe("Formatters", () => {
	const sampleEntry: LogEntry = {
		level: "info",
		timestamp: 1234567890,
		message: "test message",
		data: { key: "value" },
		context: { service: "test" },
	}

	describe("JsonFormatter", () => {
		test("should format log entry as JSON", () => {
			const formatter = jsonFormatter()
			const result = formatter.format(sampleEntry)
			const parsed = JSON.parse(result)

			expect(parsed.level).toBe("info")
			expect(parsed.time).toBe(1234567890)
			expect(parsed.msg).toBe("test message")
			expect(parsed.data).toEqual({ key: "value" })
			expect(parsed.service).toBe("test")
		})

		test("should omit empty data and context", () => {
			const formatter = jsonFormatter()
			const entry: LogEntry = {
				level: "info",
				timestamp: 1234567890,
				message: "test",
			}
			const result = formatter.format(entry)
			const parsed = JSON.parse(result)

			expect(parsed.data).toBeUndefined()
		})
	})

	describe("PrettyFormatter", () => {
		test("should format with colors by default", () => {
			const formatter = prettyFormatter()
			const result = formatter.format(sampleEntry)

			expect(result).toContain("INF")
			expect(result).toContain("test message")
		})

		test("should format without colors when disabled", () => {
			const formatter = prettyFormatter({ colors: false })
			const result = formatter.format(sampleEntry)

			expect(result).toContain("INF")
			expect(result).toContain("test message")
			expect(result).not.toContain("\x1b[")
		})

		test("should format with different timestamp formats", () => {
			const isoFormatter = prettyFormatter({ timestampFormat: "iso" })
			const unixFormatter = prettyFormatter({ timestampFormat: "unix" })

			const isoResult = isoFormatter.format(sampleEntry)
			const unixResult = unixFormatter.format(sampleEntry)

			expect(isoResult).toContain("T")
			expect(unixResult).toContain("1234567890")
		})

		test("should include data when present", () => {
			const formatter = prettyFormatter()
			const result = formatter.format(sampleEntry)

			expect(result).toContain("key")
			expect(result).toContain("value")
		})
	})
})
