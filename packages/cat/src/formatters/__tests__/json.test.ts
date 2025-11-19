import { describe, expect, it } from "bun:test"
import { JsonFormatter, jsonFormatter } from "../json"
import type { LogEntry } from "../../core/types"

describe("JsonFormatter", () => {
	describe("jsonFormatter factory", () => {
		it("should create a JsonFormatter instance", () => {
			const formatter = jsonFormatter()
			expect(formatter).toBeInstanceOf(JsonFormatter)
		})
	})

	describe("format", () => {
		it("should format basic log entry", () => {
			const formatter = new JsonFormatter()
			const entry: LogEntry = {
				level: "info",
				message: "test message",
				timestamp: 1234567890,
			}

			const result = formatter.format(entry)
			const parsed = JSON.parse(result)

			expect(parsed.level).toBe("info")
			expect(parsed.msg).toBe("test message")
			expect(parsed.time).toBe(1234567890)
		})

		it("should include data when present", () => {
			const formatter = new JsonFormatter()
			const entry: LogEntry = {
				level: "error",
				message: "error occurred",
				timestamp: 1234567890,
				data: { userId: 123, action: "login" },
			}

			const result = formatter.format(entry)
			const parsed = JSON.parse(result)

			expect(parsed.data).toEqual({ userId: 123, action: "login" })
		})

		it("should exclude data when undefined", () => {
			const formatter = new JsonFormatter()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: 1234567890,
			}

			const result = formatter.format(entry)
			const parsed = JSON.parse(result)

			expect(parsed.data).toBeUndefined()
		})

		it("should include context when present and not empty", () => {
			const formatter = new JsonFormatter()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: 1234567890,
				context: { service: "api", version: "1.0" },
			}

			const result = formatter.format(entry)
			const parsed = JSON.parse(result)

			expect(parsed.service).toBe("api")
			expect(parsed.version).toBe("1.0")
		})

		it("should exclude context when empty", () => {
			const formatter = new JsonFormatter()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: 1234567890,
				context: {},
			}

			const result = formatter.format(entry)
			const parsed = JSON.parse(result)

			// Empty context should not be spread into the output
			expect(Object.keys(parsed)).toEqual(["level", "time", "msg"])
		})

		it("should handle all log levels", () => {
			const formatter = new JsonFormatter()
			const levels = ["trace", "debug", "info", "warn", "error", "fatal"] as const

			for (const level of levels) {
				const entry: LogEntry = {
					level,
					message: `${level} message`,
					timestamp: Date.now(),
				}

				const result = formatter.format(entry)
				const parsed = JSON.parse(result)

				expect(parsed.level).toBe(level)
			}
		})

		it("should handle complex data structures", () => {
			const formatter = new JsonFormatter()
			const entry: LogEntry = {
				level: "info",
				message: "complex data",
				timestamp: 1234567890,
				data: {
					nested: {
						array: [1, 2, 3],
						object: { key: "value" },
					},
					nullValue: null,
					boolValue: true,
				},
			}

			const result = formatter.format(entry)
			const parsed = JSON.parse(result)

			expect(parsed.data).toEqual({
				nested: {
					array: [1, 2, 3],
					object: { key: "value" },
				},
				nullValue: null,
				boolValue: true,
			})
		})

		it("should produce valid JSON output", () => {
			const formatter = new JsonFormatter()
			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
				data: { key: "value" },
				context: { service: "test" },
			}

			const result = formatter.format(entry)

			// Should not throw when parsing
			expect(() => JSON.parse(result)).not.toThrow()
		})

		it("should handle special characters in message", () => {
			const formatter = new JsonFormatter()
			const entry: LogEntry = {
				level: "info",
				message: 'Test "quotes" and \n newlines \t tabs',
				timestamp: 1234567890,
			}

			const result = formatter.format(entry)
			const parsed = JSON.parse(result)

			expect(parsed.msg).toBe('Test "quotes" and \n newlines \t tabs')
		})
	})
})
