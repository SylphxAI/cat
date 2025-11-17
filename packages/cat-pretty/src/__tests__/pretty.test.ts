import { describe, expect, it } from "bun:test"
import { PrettyFormatter, prettyFormatter } from "../pretty"
import type { LogEntry } from "@sylphx/cat"

describe("PrettyFormatter", () => {
	describe("prettyFormatter factory", () => {
		it("should create a PrettyFormatter instance", () => {
			const formatter = prettyFormatter()
			expect(formatter).toBeInstanceOf(PrettyFormatter)
		})

		it("should accept options", () => {
			const formatter = prettyFormatter({ colors: false })
			expect(formatter).toBeInstanceOf(PrettyFormatter)
		})
	})

	describe("format", () => {
		it("should format basic log entry", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const entry: LogEntry = {
				level: "info",
				message: "test message",
				timestamp: Date.now(),
			}

			const result = formatter.format(entry)

			expect(result).toContain("INF")
			expect(result).toContain("test message")
		})

		it("should include timestamp by default", () => {
			const formatter = new PrettyFormatter({ colors: false })
			const timestamp = new Date("2024-01-01T12:00:00Z").getTime()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp,
			}

			const result = formatter.format(entry)

			expect(result).toContain("2024-01-01T12:00:00.000Z")
		})

		it("should omit timestamp when disabled", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const result = formatter.format(entry)

			expect(result).not.toContain("T")
			expect(result).toBe("INF test")
		})

		it("should format all log levels", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const levels: Array<[LogEntry["level"], string]> = [
				["trace", "TRC"],
				["debug", "DBG"],
				["info", "INF"],
				["warn", "WRN"],
				["error", "ERR"],
				["fatal", "FTL"],
			]

			for (const [level, label] of levels) {
				const entry: LogEntry = {
					level,
					message: "test",
					timestamp: Date.now(),
				}

				const result = formatter.format(entry)
				expect(result).toContain(label)
			}
		})

		it("should include data when present", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: { userId: 123, action: "login" },
			}

			const result = formatter.format(entry)

			expect(result).toContain("userId")
			expect(result).toContain("123")
			expect(result).toContain("login")
		})

		it("should include context when present", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				context: { service: "api", version: "1.0" },
			}

			const result = formatter.format(entry)

			expect(result).toContain("service=api")
			expect(result).toContain("version=1.0")
		})

		it("should format context as key=value pairs", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				context: { key1: "value1", key2: "value2" },
			}

			const result = formatter.format(entry)

			expect(result).toMatch(/\[.*key1=value1.*key2=value2.*\]/)
		})

		it("should use ISO timestamp format by default", () => {
			const formatter = new PrettyFormatter({ colors: false })
			const timestamp = new Date("2024-01-01T12:00:00Z").getTime()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp,
			}

			const result = formatter.format(entry)

			expect(result).toContain("2024-01-01T12:00:00.000Z")
		})

		it("should use unix timestamp format", () => {
			const formatter = new PrettyFormatter({
				colors: false,
				timestampFormat: "unix",
			})
			const timestamp = 1234567890000
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp,
			}

			const result = formatter.format(entry)

			expect(result).toContain("1234567890000")
		})

		it("should use relative timestamp format", () => {
			const formatter = new PrettyFormatter({
				colors: false,
				timestampFormat: "relative",
			})
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now() + 100,
			}

			const result = formatter.format(entry)

			expect(result).toMatch(/\+\d+ms/)
		})

		it("should handle circular references in data", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const circular: any = { a: 1 }
			circular.self = circular

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: circular,
			}

			const result = formatter.format(entry)

			expect(result).toContain("[Circular]")
		})

		it("should disable colors when colors=false", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const entry: LogEntry = {
				level: "error",
				message: "test",
				timestamp: Date.now(),
			}

			const result = formatter.format(entry)

			// Should not contain ANSI escape codes
			expect(result).not.toContain("\x1b[")
		})

		it("should include colors when colors=true", () => {
			const formatter = new PrettyFormatter({ colors: true, timestamp: false })
			const entry: LogEntry = {
				level: "error",
				message: "test",
				timestamp: Date.now(),
			}

			const result = formatter.format(entry)

			// Should contain ANSI escape codes
			expect(result).toContain("\x1b[")
		})

		it("should enable colors by default", () => {
			const formatter = new PrettyFormatter({ timestamp: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			const result = formatter.format(entry)

			expect(result).toContain("\x1b[")
		})

		it("should handle empty data object", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: {},
			}

			const result = formatter.format(entry)

			// Empty data should not add extra content
			expect(result).toBe("INF test")
		})

		it("should handle empty context object", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				context: {},
			}

			const result = formatter.format(entry)

			// Empty context should not add extra content
			expect(result).toBe("INF test")
		})

		it("should format complex entry with all fields", () => {
			const formatter = new PrettyFormatter({ colors: false, timestamp: false })
			const entry: LogEntry = {
				level: "warn",
				message: "Complex log",
				timestamp: Date.now(),
				data: { count: 10, status: "active" },
				context: { service: "api", version: "2.0" },
			}

			const result = formatter.format(entry)

			expect(result).toContain("WRN")
			expect(result).toContain("Complex log")
			expect(result).toContain("count")
			expect(result).toContain("10")
			expect(result).toContain("service=api")
			expect(result).toContain("version=2.0")
		})
	})
})
