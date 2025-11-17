import { describe, expect, it, beforeEach, afterEach } from "bun:test"
import { FileTransport, fileTransport } from "../file"
import type { LogEntry } from "@sylphx/cat"
import { existsSync, unlinkSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("FileTransport", () => {
	const tempDir = tmpdir()
	let testFilePath: string

	beforeEach(() => {
		// Create unique test file path
		testFilePath = join(tempDir, `test-log-${Date.now()}.log`)
	})

	afterEach(async () => {
		// Clean up test file
		if (existsSync(testFilePath)) {
			try {
				unlinkSync(testFilePath)
			} catch {
				// Ignore errors
			}
		}
	})

	describe("fileTransport factory", () => {
		it("should create a FileTransport instance", () => {
			const transport = fileTransport({ path: testFilePath })
			expect(transport).toBeInstanceOf(FileTransport)
		})
	})

	describe("log", () => {
		it("should write log entry to file", async () => {
			const transport = new FileTransport({ path: testFilePath })

			const entry: LogEntry = {
				level: "info",
				message: "test message",
				timestamp: Date.now(),
			}

			transport.log(entry, "formatted log line")
			await transport.flush()

			expect(existsSync(testFilePath)).toBe(true)
			const content = readFileSync(testFilePath, "utf-8")
			expect(content).toContain("formatted log line")
		})

		it("should append newline to each log entry", async () => {
			const transport = new FileTransport({ path: testFilePath })

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "line 1")
			transport.log(entry, "line 2")
			await transport.flush()

			const content = readFileSync(testFilePath, "utf-8")
			expect(content).toBe("line 1\nline 2\n")
		})

		it("should handle multiple log entries", async () => {
			const transport = new FileTransport({ path: testFilePath })

			const entries = ["log 1", "log 2", "log 3"]

			for (const formatted of entries) {
				transport.log(
					{
						level: "info",
						message: formatted,
						timestamp: Date.now(),
					},
					formatted,
				)
			}

			await transport.flush()

			const content = readFileSync(testFilePath, "utf-8")
			expect(content).toContain("log 1")
			expect(content).toContain("log 2")
			expect(content).toContain("log 3")
		})

		it("should batch writes efficiently", async () => {
			const transport = new FileTransport({ path: testFilePath })

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			// Queue multiple logs quickly
			transport.log(entry, "log 1")
			transport.log(entry, "log 2")
			transport.log(entry, "log 3")

			// Flush should write all
			await transport.flush()

			const content = readFileSync(testFilePath, "utf-8")
			const lines = content.trim().split("\n")
			expect(lines).toHaveLength(3)
		})
	})

	describe("flush", () => {
		it("should write all pending logs", async () => {
			const transport = new FileTransport({ path: testFilePath })

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "pending log")

			// File might not exist yet
			const beforeFlush = existsSync(testFilePath)
				? readFileSync(testFilePath, "utf-8")
				: ""

			await transport.flush()

			const afterFlush = readFileSync(testFilePath, "utf-8")
			expect(afterFlush).toContain("pending log")
			expect(afterFlush.length).toBeGreaterThan(beforeFlush.length)
		})

		it("should be safe to call multiple times", async () => {
			const transport = new FileTransport({ path: testFilePath })

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "log entry")

			await transport.flush()
			await transport.flush()
			await transport.flush()

			const content = readFileSync(testFilePath, "utf-8")
			// Should only have one entry
			const lines = content.trim().split("\n")
			expect(lines).toHaveLength(1)
		})
	})

	describe("close", () => {
		it("should flush before closing", async () => {
			const transport = new FileTransport({ path: testFilePath })

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "final log")

			await transport.close()

			const content = readFileSync(testFilePath, "utf-8")
			expect(content).toContain("final log")
		})

		it("should handle close without pending logs", async () => {
			const transport = new FileTransport({ path: testFilePath })

			await transport.close()

			// Should not throw
			expect(true).toBe(true)
		})

		it("should handle close after flush", async () => {
			const transport = new FileTransport({ path: testFilePath })

			const entry: LogEntry = {
				level: "info",
				message: "test",
				timestamp: Date.now(),
			}

			transport.log(entry, "log")
			await transport.flush()
			await transport.close()

			const content = readFileSync(testFilePath, "utf-8")
			expect(content).toContain("log")
		})
	})

	describe("file operations", () => {
		it("should create file if it does not exist", async () => {
			const transport = new FileTransport({ path: testFilePath })

			expect(existsSync(testFilePath)).toBe(false)

			transport.log(
				{
					level: "info",
					message: "test",
					timestamp: Date.now(),
				},
				"first log",
			)

			await transport.flush()

			expect(existsSync(testFilePath)).toBe(true)
		})

		it("should append to existing file", async () => {
			// Create file with initial content
			const transport1 = new FileTransport({ path: testFilePath })
			transport1.log(
				{
					level: "info",
					message: "test",
					timestamp: Date.now(),
				},
				"first log",
			)
			await transport1.flush()
			await transport1.close()

			// Append with new transport
			const transport2 = new FileTransport({ path: testFilePath })
			transport2.log(
				{
					level: "info",
					message: "test",
					timestamp: Date.now(),
				},
				"second log",
			)
			await transport2.flush()
			await transport2.close()

			const content = readFileSync(testFilePath, "utf-8")
			expect(content).toContain("first log")
			expect(content).toContain("second log")
		})
	})
})
