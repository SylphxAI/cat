import { describe, expect, it } from "bun:test"
import {
	applySerializers,
	serializeError,
	stdSerializers,
	type SerializedError,
	type SerializerRegistry,
} from "../index"

describe("Custom Serializers", () => {
	describe("applySerializers", () => {
		it("should apply custom serializer to matching key", () => {
			const data = {
				date: new Date("2024-01-01T00:00:00Z"),
				message: "test",
			}

			const serializers: SerializerRegistry = {
				date: (value: Date) => value.toISOString(),
			}

			const result = applySerializers(data, serializers)

			expect(result.date).toBe("2024-01-01T00:00:00.000Z")
			expect(result.message).toBe("test")
		})

		it("should auto-detect and serialize errors", () => {
			const data = {
				error: new Error("test error"),
				other: "value",
			}

			const result = applySerializers(data, {})

			expect((result.error as SerializedError).type).toBe("Error")
			expect((result.error as SerializedError).message).toBe("test error")
			expect(result.other).toBe("value")
		})

		it("should handle arrays with serializers", () => {
			const data = {
				dates: [
					new Date("2024-01-01T00:00:00Z"),
					new Date("2024-01-02T00:00:00Z"),
				],
			}

			const serializers: SerializerRegistry = {
				dates: (dates: Date[]) => dates.map((d) => d.toISOString()),
			}

			const result = applySerializers(data, serializers)

			expect(result.dates).toEqual([
				"2024-01-01T00:00:00.000Z",
				"2024-01-02T00:00:00.000Z",
			])
		})

		it("should serialize errors in arrays", () => {
			const data = {
				errors: [new Error("error 1"), new Error("error 2")],
			}

			const result = applySerializers(data, {})

			const errors = result.errors as Array<SerializedError>
			expect(errors[0].message).toBe("error 1")
			expect(errors[1].message).toBe("error 2")
		})

		it("should recursively apply serializers to nested objects", () => {
			const data = {
				outer: {
					inner: {
						date: new Date("2024-01-01T00:00:00Z"),
					},
				},
			}

			const serializers: SerializerRegistry = {
				date: (value: Date) => value.toISOString(),
			}

			const result = applySerializers(data, serializers)

			const outer = result.outer as Record<string, unknown>
			const inner = outer.inner as Record<string, unknown>
			expect(inner.date).toBe("2024-01-01T00:00:00.000Z")
		})

		it("should handle nested objects in arrays", () => {
			const data = {
				items: [
					{ error: new Error("error 1") },
					{ error: new Error("error 2") },
				],
			}

			const result = applySerializers(data, {})

			const items = result.items as Array<Record<string, unknown>>
			expect((items[0].error as SerializedError).message).toBe("error 1")
			expect((items[1].error as SerializedError).message).toBe("error 2")
		})

		it("should preserve primitive values", () => {
			const data = {
				string: "test",
				number: 123,
				boolean: true,
				null: null,
			}

			const result = applySerializers(data, {})

			expect(result.string).toBe("test")
			expect(result.number).toBe(123)
			expect(result.boolean).toBe(true)
			expect(result.null).toBe(null)
		})

		it("should prioritize custom serializer over auto-detection", () => {
			const data = {
				error: new Error("test"),
			}

			const serializers: SerializerRegistry = {
				error: (err: Error) => ({
					custom: true,
					message: err.message,
				}),
			}

			const result = applySerializers(data, serializers)

			expect((result.error as any).custom).toBe(true)
			expect((result.error as any).type).toBeUndefined()
		})

		it("should handle multiple custom serializers", () => {
			const data = {
				date: new Date("2024-01-01T00:00:00Z"),
				buffer: Buffer.from("test"),
				other: "value",
			}

			const serializers: SerializerRegistry = {
				date: (value: Date) => value.toISOString(),
				buffer: (value: Buffer) => value.toString("base64"),
			}

			const result = applySerializers(data, serializers)

			expect(result.date).toBe("2024-01-01T00:00:00.000Z")
			expect(result.buffer).toBe("dGVzdA==")
			expect(result.other).toBe("value")
		})
	})

	describe("stdSerializers", () => {
		it("should have err serializer", () => {
			const error = new Error("test error")
			const serialized = stdSerializers.err(error)

			expect(serialized.type).toBe("Error")
			expect(serialized.message).toBe("test error")
			expect(serialized.stack).toBeDefined()
		})

		it("should have error serializer (alias)", () => {
			const error = new Error("test error")
			const serialized = stdSerializers.error(error)

			expect(serialized.type).toBe("Error")
			expect(serialized.message).toBe("test error")
			expect(serialized.stack).toBeDefined()
		})

		it("err and error should produce same output", () => {
			const error = new Error("test")
			const errResult = stdSerializers.err(error)
			const errorResult = stdSerializers.error(error)

			expect(errResult).toEqual(errorResult)
		})

		it("should work with applySerializers", () => {
			const data = {
				err: new Error("test error"),
			}

			const result = applySerializers(data, stdSerializers)

			expect((result.err as SerializedError).type).toBe("Error")
			expect((result.err as SerializedError).message).toBe("test error")
		})
	})

	describe("re-exports", () => {
		it("should export serializeError", () => {
			const error = new Error("test")
			const serialized = serializeError(error)

			expect(serialized.type).toBe("Error")
			expect(serialized.message).toBe("test")
		})
	})
})
