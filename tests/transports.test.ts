import * as fs from "node:fs/promises"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { LogEntry } from "../src/index"
import { consoleTransport, fileTransport, streamTransport } from "../src/index"

describe("Transports", () => {
	const sampleEntry: LogEntry = {
		level: "info",
		timestamp: Date.now(),
		message: "test message",
		data: { key: "value" },
	}

	describe("ConsoleTransport", () => {
		beforeEach(() => {
			vi.spyOn(console, "debug").mockImplementation(() => {})
			vi.spyOn(console, "info").mockImplementation(() => {})
			vi.spyOn(console, "warn").mockImplementation(() => {})
			vi.spyOn(console, "error").mockImplementation(() => {})
			vi.spyOn(console, "log").mockImplementation(() => {})
		})

		afterEach(() => {
			vi.restoreAllMocks()
		})

		test("should log trace to console.debug", () => {
			const transport = consoleTransport()
			transport.log({ ...sampleEntry, level: "trace" }, "formatted")

			expect(console.debug).toHaveBeenCalledWith("formatted")
		})

		test("should log debug to console.debug", () => {
			const transport = consoleTransport()
			transport.log({ ...sampleEntry, level: "debug" }, "formatted")

			expect(console.debug).toHaveBeenCalledWith("formatted")
		})

		test("should log info to console.info", () => {
			const transport = consoleTransport()
			transport.log({ ...sampleEntry, level: "info" }, "formatted")

			expect(console.info).toHaveBeenCalledWith("formatted")
		})

		test("should log warn to console.warn", () => {
			const transport = consoleTransport()
			transport.log({ ...sampleEntry, level: "warn" }, "formatted")

			expect(console.warn).toHaveBeenCalledWith("formatted")
		})

		test("should log error to console.error", () => {
			const transport = consoleTransport()
			transport.log({ ...sampleEntry, level: "error" }, "formatted")

			expect(console.error).toHaveBeenCalledWith("formatted")
		})

		test("should log fatal to console.error", () => {
			const transport = consoleTransport()
			transport.log({ ...sampleEntry, level: "fatal" }, "formatted")

			expect(console.error).toHaveBeenCalledWith("formatted")
		})
	})

	describe("FileTransport", () => {
		const testLogPath = "/tmp/test-logger.log"

		beforeEach(async () => {
			// Ensure file doesn't exist
			try {
				await fs.unlink(testLogPath)
			} catch {
				// Ignore
			}
		})

		afterEach(async () => {
			try {
				await fs.unlink(testLogPath)
			} catch {
				// Ignore
			}
		})

		test("should create transport and not throw", () => {
			expect(() => fileTransport({ path: testLogPath })).not.toThrow()
		})

		test("should handle log calls", () => {
			const transport = fileTransport({ path: testLogPath })
			expect(() => transport.log(sampleEntry, "test")).not.toThrow()
		})

		test("should handle flush", async () => {
			const transport = fileTransport({ path: testLogPath })
			transport.log(sampleEntry, "test")
			await expect(transport.flush?.()).resolves.toBeUndefined()
		})

		test("should handle close", async () => {
			const transport = fileTransport({ path: testLogPath })
			transport.log(sampleEntry, "test")
			await expect(transport.close?.()).resolves.toBeUndefined()
		})
	})

	describe("StreamTransport", () => {
		test("should write to WritableStream", async () => {
			const chunks: string[] = []
			const writable = new WritableStream({
				write(chunk) {
					chunks.push(chunk)
				},
			})

			const transport = streamTransport({ stream: writable })
			transport.log(sampleEntry, "test message")

			await transport.flush?.()

			expect(chunks).toContain("test message\n")
		})

		test("should write to object with write method", () => {
			const chunks: string[] = []
			const stream = {
				write(chunk: string) {
					chunks.push(chunk)
				},
			}

			const transport = streamTransport({ stream })
			transport.log(sampleEntry, "test message")

			expect(chunks).toContain("test message\n")
		})

		test("should handle flush", async () => {
			const writable = new WritableStream({
				write() {},
			})

			const transport = streamTransport({ stream: writable })
			await expect(transport.flush?.()).resolves.toBeUndefined()
		})

		test("should handle close", async () => {
			const writable = new WritableStream({
				write() {},
			})

			const transport = streamTransport({ stream: writable })
			await expect(transport.close?.()).resolves.toBeUndefined()
		})
	})
})
