import { describe, expect, it } from "bun:test"
import {
	autoSerializeErrors,
	formatError,
	isError,
	serializeError,
	type SerializedError,
} from "../error"

describe("Error Serializers", () => {
	describe("serializeError", () => {
		it("should serialize basic error", () => {
			const error = new Error("test error")
			const serialized = serializeError(error)

			expect(serialized.type).toBe("Error")
			expect(serialized.message).toBe("test error")
			expect(serialized.stack).toBeDefined()
			expect(typeof serialized.stack).toBe("string")
		})

		it("should serialize custom error types", () => {
			class CustomError extends Error {
				constructor(message: string) {
					super(message)
					this.name = "CustomError"
				}
			}

			const error = new CustomError("custom error")
			const serialized = serializeError(error)

			expect(serialized.type).toBe("CustomError")
			expect(serialized.message).toBe("custom error")
		})

		it("should serialize error code", () => {
			const error = new Error("test") as Error & { code: string }
			error.code = "ENOENT"

			const serialized = serializeError(error)

			expect(serialized.code).toBe("ENOENT")
		})

		it("should serialize error cause", () => {
			const cause = new Error("cause error")
			const error = new Error("main error", { cause })

			const serialized = serializeError(error)

			expect(serialized.cause).toBeDefined()
			expect(serialized.cause?.type).toBe("Error")
			expect(serialized.cause?.message).toBe("cause error")
		})

		it("should handle nested error causes", () => {
			const rootCause = new Error("root cause")
			const middleCause = new Error("middle cause", { cause: rootCause })
			const error = new Error("main error", { cause: middleCause })

			const serialized = serializeError(error)

			expect(serialized.message).toBe("main error")
			expect(serialized.cause?.message).toBe("middle cause")
			expect(serialized.cause?.cause?.message).toBe("root cause")
		})

		it("should respect maxDepth for cause chain", () => {
			const rootCause = new Error("root")
			const middle = new Error("middle", { cause: rootCause })
			const error = new Error("main", { cause: middle })

			const serialized = serializeError(error, 1)

			expect(serialized.message).toBe("main")
			expect(serialized.cause?.message).toBe("middle")
			// Should not include root cause (depth exceeded)
			expect(serialized.cause?.cause).toBeUndefined()
		})

		it("should serialize custom properties", () => {
			const error = new Error("test") as Error & {
				userId: number
				action: string
			}
			error.userId = 123
			error.action = "login"

			const serialized = serializeError(error)

			expect(serialized.userId).toBe(123)
			expect(serialized.action).toBe("login")
		})

		it("should handle circular references in properties", () => {
			const error = new Error("test") as Error & { self?: Error }
			error.self = error

			const serialized = serializeError(error)

			expect(serialized.self).toBe("[Circular]")
		})

		it("should handle complex objects in properties", () => {
			const error = new Error("test") as Error & {
				context: { key: string }
			}
			error.context = { key: "value" }

			const serialized = serializeError(error)

			expect(serialized.context).toBe("[Object]")
		})

		it("should serialize nested error properties", () => {
			const nestedError = new Error("nested")
			const error = new Error("main") as Error & { nested: Error }
			error.nested = nestedError

			const serialized = serializeError(error)

			expect(serialized.nested).toBeDefined()
			expect((serialized.nested as SerializedError).type).toBe("Error")
			expect((serialized.nested as SerializedError).message).toBe("nested")
		})

		it("should not include standard properties as custom", () => {
			const error = new Error("test")
			const serialized = serializeError(error)

			// These should only appear once, not duplicated
			const keys = Object.keys(serialized)
			expect(keys.filter((k) => k === "message").length).toBe(1)
			expect(keys.filter((k) => k === "type").length).toBe(1)
		})
	})

	describe("isError", () => {
		it("should return true for Error instances", () => {
			expect(isError(new Error("test"))).toBe(true)
		})

		it("should return true for custom error types", () => {
			class CustomError extends Error {}
			expect(isError(new CustomError())).toBe(true)
		})

		it("should return false for non-errors", () => {
			expect(isError(null)).toBe(false)
			expect(isError(undefined)).toBe(false)
			expect(isError("string")).toBe(false)
			expect(isError(123)).toBe(false)
			expect(isError({})).toBe(false)
			expect(isError([])).toBe(false)
		})

		it("should return false for error-like objects", () => {
			const errorLike = {
				name: "Error",
				message: "test",
				stack: "stack trace",
			}
			expect(isError(errorLike)).toBe(false)
		})
	})

	describe("autoSerializeErrors", () => {
		it("should serialize top-level errors", () => {
			const data = {
				error: new Error("test error"),
				message: "something went wrong",
			}

			const result = autoSerializeErrors(data)

			expect(isError(result.error)).toBe(false)
			expect((result.error as SerializedError).type).toBe("Error")
			expect((result.error as SerializedError).message).toBe("test error")
			expect(result.message).toBe("something went wrong")
		})

		it("should serialize nested errors", () => {
			const data = {
				context: {
					error: new Error("nested error"),
					level: "deep",
				},
			}

			const result = autoSerializeErrors(data)

			const context = result.context as Record<string, unknown>
			expect(isError(context.error)).toBe(false)
			expect((context.error as SerializedError).type).toBe("Error")
			expect((context.error as SerializedError).message).toBe("nested error")
			expect(context.level).toBe("deep")
		})

		it("should serialize errors in arrays", () => {
			const data = {
				errors: [new Error("error 1"), new Error("error 2"), "not an error"],
			}

			const result = autoSerializeErrors(data)

			const errors = result.errors as Array<unknown>
			expect(errors).toHaveLength(3)
			expect((errors[0] as SerializedError).message).toBe("error 1")
			expect((errors[1] as SerializedError).message).toBe("error 2")
			expect(errors[2]).toBe("not an error")
		})

		it("should handle deeply nested structures", () => {
			const data = {
				level1: {
					level2: {
						level3: {
							error: new Error("deep error"),
						},
					},
				},
			}

			const result = autoSerializeErrors(data)

			const level1 = result.level1 as Record<string, unknown>
			const level2 = level1.level2 as Record<string, unknown>
			const level3 = level2.level3 as Record<string, unknown>
			expect((level3.error as SerializedError).message).toBe("deep error")
		})

		it("should respect maxDepth", () => {
			const data = {
				level1: {
					level2: {
						level3: {
							error: new Error("too deep"),
						},
					},
				},
			}

			const result = autoSerializeErrors(data, 2)

			const level1 = result.level1 as Record<string, unknown>
			const level2 = level1.level2 as Record<string, unknown>
			// Should preserve the object but not recurse further
			expect(level2.level3).toBeDefined()
		})

		it("should not modify primitive values", () => {
			const data = {
				string: "test",
				number: 123,
				boolean: true,
				null: null,
				undefined: undefined,
			}

			const result = autoSerializeErrors(data)

			expect(result.string).toBe("test")
			expect(result.number).toBe(123)
			expect(result.boolean).toBe(true)
			expect(result.null).toBe(null)
			expect(result.undefined).toBe(undefined)
		})
	})

	describe("formatError", () => {
		it("should format basic error", () => {
			const error = new Error("test error")
			const formatted = formatError(error)

			expect(formatted).toContain("Error: test error")
			expect(formatted).toContain("at ")
		})

		it("should include custom error name", () => {
			class CustomError extends Error {
				constructor(message: string) {
					super(message)
					this.name = "CustomError"
				}
			}

			const error = new CustomError("test")
			const formatted = formatError(error)

			expect(formatted).toContain("CustomError: test")
		})

		it("should format error with cause", () => {
			const cause = new Error("cause error")
			const error = new Error("main error", { cause })

			const formatted = formatError(error)

			expect(formatted).toContain("Error: main error")
			expect(formatted).toContain("Caused by:")
			expect(formatted).toContain("Error: cause error")
		})

		it("should format nested causes", () => {
			const rootCause = new Error("root cause")
			const middleCause = new Error("middle cause", { cause: rootCause })
			const error = new Error("main error", { cause: middleCause })

			const formatted = formatError(error)

			expect(formatted).toContain("main error")
			expect(formatted).toContain("middle cause")
			expect(formatted).toContain("root cause")
		})

		it("should include stack trace", () => {
			const error = new Error("test")
			const formatted = formatError(error)

			expect(formatted).toContain(error.stack || "")
		})
	})
})
