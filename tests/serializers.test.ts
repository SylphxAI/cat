import { beforeEach, describe, expect, test } from "vitest"
import {
	applySerializers,
	autoSerializeErrors,
	formatError,
	isError,
	requestSerializer,
	responseSerializer,
	serializeError,
	stdSerializers,
} from "../src/serializers/index"
import type { SerializedError } from "../src/serializers/error"

describe("Error Serialization", () => {
	test("should serialize basic error", () => {
		const error = new Error("Test error")
		const result = serializeError(error)

		expect(result.type).toBe("Error")
		expect(result.message).toBe("Test error")
		expect(result.stack).toBeDefined()
	})

	test("should serialize error with custom type", () => {
		class CustomError extends Error {
			name = "CustomError"
		}

		const error = new CustomError("Custom message")
		const result = serializeError(error)

		expect(result.type).toBe("CustomError")
		expect(result.message).toBe("Custom message")
	})

	test("should serialize error with code", () => {
		const error = new Error("Network error") as any
		error.code = "ECONNREFUSED"

		const result = serializeError(error)

		expect(result.code).toBe("ECONNREFUSED")
	})

	test("should serialize error with cause", () => {
		const cause = new Error("Root cause")
		const error = new Error("Wrapper error", { cause })

		const result = serializeError(error)

		expect(result.cause).toBeDefined()
		expect(result.cause?.type).toBe("Error")
		expect(result.cause?.message).toBe("Root cause")
	})

	test("should serialize error with nested causes", () => {
		const rootCause = new Error("Root")
		const middleCause = new Error("Middle", { cause: rootCause })
		const topError = new Error("Top", { cause: middleCause })

		const result = serializeError(topError)

		expect(result.message).toBe("Top")
		expect(result.cause?.message).toBe("Middle")
		expect(result.cause?.cause?.message).toBe("Root")
	})

	test("should limit cause chain depth", () => {
		let error: Error = new Error("Deep 0")
		for (let i = 1; i <= 20; i++) {
			error = new Error(`Deep ${i}`, { cause: error })
		}

		const result = serializeError(error, 5)

		// Count depth
		let depth = 0
		let current: SerializedError | undefined = result
		while (current) {
			depth++
			current = current.cause
		}

		expect(depth).toBeLessThanOrEqual(6) // 5 levels + 1 root
	})

	test("should serialize custom properties", () => {
		const error = new Error("Test") as any
		error.userId = "123"
		error.requestId = "req-456"

		const result = serializeError(error)

		expect(result.userId).toBe("123")
		expect(result.requestId).toBe("req-456")
	})

	test("should handle circular references in custom properties", () => {
		const error = new Error("Test") as any
		error.self = error // Circular reference

		// Should not throw
		expect(() => serializeError(error)).not.toThrow()
	})

	test("isError should detect Error instances", () => {
		expect(isError(new Error("test"))).toBe(true)
		expect(isError("string")).toBe(false)
		expect(isError(123)).toBe(false)
		expect(isError(null)).toBe(false)
		expect(isError(undefined)).toBe(false)
		expect(isError({})).toBe(false)
	})

	test("autoSerializeErrors should find and serialize errors in object", () => {
		const data = {
			name: "test",
			error: new Error("Failed"),
			nested: {
				anotherError: new Error("Nested failure"),
			},
		}

		const result = autoSerializeErrors(data)

		expect(result.name).toBe("test")
		expect(result.error).toHaveProperty("type", "Error")
		expect(result.error).toHaveProperty("message", "Failed")
		expect((result.nested as any).anotherError).toHaveProperty("type", "Error")
	})

	test("autoSerializeErrors should handle arrays with errors", () => {
		const data = {
			errors: [new Error("Error 1"), new Error("Error 2")],
		}

		const result = autoSerializeErrors(data)

		expect(Array.isArray(result.errors)).toBe(true)
		expect((result.errors as any)[0]).toHaveProperty("message", "Error 1")
		expect((result.errors as any)[1]).toHaveProperty("message", "Error 2")
	})

	test("formatError should create human-readable output", () => {
		const error = new Error("Test error")
		const formatted = formatError(error)

		expect(formatted).toContain("Error: Test error")
		expect(formatted).toContain("at ")
	})

	test("formatError should include cause", () => {
		const cause = new Error("Root cause")
		const error = new Error("Wrapper", { cause })

		const formatted = formatError(error)

		expect(formatted).toContain("Wrapper")
		expect(formatted).toContain("Caused by")
		expect(formatted).toContain("Root cause")
	})
})

describe("Custom Serializers", () => {
	test("applySerializers should use registered serializers", () => {
		const data = {
			user: { id: "123", password: "secret" },
			timestamp: Date.now(),
		}

		const serializers = {
			user: (user: any) => ({ id: user.id }), // Remove password
		}

		const result = applySerializers(data, serializers)

		expect(result.user).toEqual({ id: "123" })
		expect(result.user).not.toHaveProperty("password")
		expect(result.timestamp).toBe(data.timestamp)
	})

	test("applySerializers should auto-serialize errors", () => {
		const data = {
			error: new Error("Failed"),
			value: 123,
		}

		const result = applySerializers(data, {})

		expect(result.error).toHaveProperty("type", "Error")
		expect(result.error).toHaveProperty("message", "Failed")
		expect(result.value).toBe(123)
	})

	test("applySerializers should handle nested objects", () => {
		const data = {
			outer: {
				inner: {
					error: new Error("Deep error"),
				},
			},
		}

		const result = applySerializers(data, {})

		expect((result.outer as any).inner.error).toHaveProperty("type", "Error")
	})

	test("stdSerializers should include error serializers", () => {
		expect(stdSerializers.err).toBeDefined()
		expect(stdSerializers.error).toBeDefined()

		const error = new Error("Test")
		const result = stdSerializers.err(error)

		expect(result.type).toBe("Error")
		expect(result.message).toBe("Test")
	})
})

describe("Request Serialization", () => {
	test("should serialize basic request", () => {
		const req = {
			method: "GET",
			url: "/api/users",
			headers: {
				"content-type": "application/json",
				"user-agent": "test",
			},
		}

		const result = requestSerializer(req)

		expect(result.method).toBe("GET")
		expect(result.url).toBe("/api/users")
		expect(result.headers).toBeDefined()
	})

	test("should redact sensitive headers", () => {
		const req = {
			method: "POST",
			url: "/api/login",
			headers: {
				authorization: "Bearer secret-token",
				cookie: "session=abc123",
				"content-type": "application/json",
			},
		}

		const result = requestSerializer(req)

		expect(result.headers?.authorization).toBe("[REDACTED]")
		expect(result.headers?.cookie).toBe("[REDACTED]")
		expect(result.headers?.["content-type"]).toBe("application/json")
	})

	test("should include query parameters", () => {
		const req = {
			method: "GET",
			url: "/api/search",
			query: {
				q: "test",
				limit: "10",
			},
		}

		const result = requestSerializer(req)

		expect(result.query).toEqual({ q: "test", limit: "10" })
	})

	test("should include route parameters", () => {
		const req = {
			method: "GET",
			url: "/api/users/123",
			params: {
				id: "123",
			},
		}

		const result = requestSerializer(req)

		expect(result.params).toEqual({ id: "123" })
	})

	test("should extract remote address from socket", () => {
		const req = {
			method: "GET",
			url: "/",
			socket: {
				remoteAddress: "192.168.1.1",
				remotePort: 54321,
			},
		}

		const result = requestSerializer(req)

		expect(result.remoteAddress).toBe("192.168.1.1")
		expect(result.remotePort).toBe(54321)
	})

	test("should detect HTTPS protocol", () => {
		const req = {
			method: "GET",
			url: "/",
			socket: {
				encrypted: true,
			},
		}

		const result = requestSerializer(req)

		expect(result.protocol).toBe("https")
	})

	test("should handle Express-style request", () => {
		const req = {
			method: "POST",
			url: "/api/users",
			originalUrl: "/api/users?sort=name",
			headers: {
				host: "example.com",
			},
			query: { sort: "name" },
			params: { id: "123" },
			protocol: "https",
			ip: "192.168.1.1",
		}

		const result = requestSerializer(req)

		expect(result.method).toBe("POST")
		expect(result.url).toBe("/api/users?sort=name") // Uses originalUrl
		expect(result.query).toEqual({ sort: "name" })
		expect(result.params).toEqual({ id: "123" })
		expect(result.protocol).toBe("https")
		expect(result.remoteAddress).toBe("192.168.1.1")
	})
})

describe("Response Serialization", () => {
	test("should serialize basic response", () => {
		const res = {
			statusCode: 200,
			statusMessage: "OK",
		}

		const result = responseSerializer(res)

		expect(result.statusCode).toBe(200)
		expect(result.statusMessage).toBe("OK")
	})

	test("should serialize response with headers", () => {
		const res = {
			statusCode: 201,
			getHeaders: () => ({
				"content-type": "application/json",
				"x-request-id": "req-123",
			}),
		}

		const result = responseSerializer(res)

		expect(result.headers?.["content-type"]).toBe("application/json")
		expect(result.headers?.["x-request-id"]).toBe("req-123")
	})

	test("should redact sensitive headers", () => {
		const res = {
			statusCode: 200,
			getHeaders: () => ({
				"set-cookie": ["session=abc123", "token=secret"],
				"content-type": "text/html",
			}),
		}

		const result = responseSerializer(res)

		expect(result.headers?.["set-cookie"]).toBe("[REDACTED]")
		expect(result.headers?.["content-type"]).toBe("text/html")
	})

	test("should handle response without getHeaders", () => {
		const res = {
			statusCode: 404,
			headers: {
				"content-type": "text/plain",
			},
		}

		const result = responseSerializer(res)

		expect(result.statusCode).toBe(404)
		expect(result.headers?.["content-type"]).toBe("text/plain")
	})

	test("should default statusCode to 200", () => {
		const res = {}

		const result = responseSerializer(res)

		expect(result.statusCode).toBe(200)
	})
})
