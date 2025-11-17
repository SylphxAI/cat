import { describe, expect, it, mock, spyOn } from "bun:test"
import { ConsoleTransport, consoleTransport } from "../console"
import type { LogEntry } from "../../core/types"

describe("ConsoleTransport", () => {
	describe("consoleTransport factory", () => {
		it("should create a ConsoleTransport instance", () => {
			const transport = consoleTransport()
			expect(transport).toBeInstanceOf(ConsoleTransport)
		})
	})

	describe("log", () => {
		it("should use console.debug for trace level", () => {
			const transport = new ConsoleTransport()
			const spy = spyOn(console, "debug")

			const entry: LogEntry = {
				level: "trace",
				message: "trace message",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted trace")

			expect(spy).toHaveBeenCalledWith("formatted trace")
			spy.mockRestore()
		})

		it("should use console.debug for debug level", () => {
			const transport = new ConsoleTransport()
			const spy = spyOn(console, "debug")

			const entry: LogEntry = {
				level: "debug",
				message: "debug message",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted debug")

			expect(spy).toHaveBeenCalledWith("formatted debug")
			spy.mockRestore()
		})

		it("should use console.info for info level", () => {
			const transport = new ConsoleTransport()
			const spy = spyOn(console, "info")

			const entry: LogEntry = {
				level: "info",
				message: "info message",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted info")

			expect(spy).toHaveBeenCalledWith("formatted info")
			spy.mockRestore()
		})

		it("should use console.warn for warn level", () => {
			const transport = new ConsoleTransport()
			const spy = spyOn(console, "warn")

			const entry: LogEntry = {
				level: "warn",
				message: "warn message",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted warn")

			expect(spy).toHaveBeenCalledWith("formatted warn")
			spy.mockRestore()
		})

		it("should use console.error for error level", () => {
			const transport = new ConsoleTransport()
			const spy = spyOn(console, "error")

			const entry: LogEntry = {
				level: "error",
				message: "error message",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted error")

			expect(spy).toHaveBeenCalledWith("formatted error")
			spy.mockRestore()
		})

		it("should use console.error for fatal level", () => {
			const transport = new ConsoleTransport()
			const spy = spyOn(console, "error")

			const entry: LogEntry = {
				level: "fatal",
				message: "fatal message",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted fatal")

			expect(spy).toHaveBeenCalledWith("formatted fatal")
			spy.mockRestore()
		})

		it("should output the formatted string not the entry", () => {
			const transport = new ConsoleTransport()
			const spy = spyOn(console, "info")

			const entry: LogEntry = {
				level: "info",
				message: "original message",
				timestamp: Date.now(),
				data: { key: "value" },
			}

			const formatted = JSON.stringify({
				level: "info",
				msg: "original message",
				time: entry.timestamp,
				data: { key: "value" },
			})

			transport.log(entry, formatted)

			expect(spy).toHaveBeenCalledWith(formatted)
			expect(spy).not.toHaveBeenCalledWith(entry)
			spy.mockRestore()
		})

		it("should handle all log levels correctly", () => {
			const transport = new ConsoleTransport()
			const levels: Array<{ level: LogEntry["level"]; method: keyof Console }> = [
				{ level: "trace", method: "debug" },
				{ level: "debug", method: "debug" },
				{ level: "info", method: "info" },
				{ level: "warn", method: "warn" },
				{ level: "error", method: "error" },
				{ level: "fatal", method: "error" },
			]

			for (const { level, method } of levels) {
				const spy = spyOn(console, method as "debug" | "info" | "warn" | "error")

				const entry: LogEntry = {
					level,
					message: `${level} message`,
					timestamp: Date.now(),
				}

				transport.log(entry, `formatted ${level}`)

				expect(spy).toHaveBeenCalledWith(`formatted ${level}`)
				spy.mockRestore()
			}
		})
	})
})
