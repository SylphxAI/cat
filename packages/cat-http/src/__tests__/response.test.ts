import { describe, expect, it, mock } from "bun:test"
import { serializeResponse, responseSerializer } from "../response"

describe("HTTP Response Serializer", () => {
	describe("serializeResponse", () => {
		it("should serialize basic response", () => {
			const res = {
				statusCode: 200,
			}

			const result = serializeResponse(res)

			expect(result.statusCode).toBe(200)
		})

		it("should default to 200 status code", () => {
			const res = {}

			const result = serializeResponse(res)

			expect(result.statusCode).toBe(200)
		})

		it("should serialize status message", () => {
			const res = {
				statusCode: 404,
				statusMessage: "Not Found",
			}

			const result = serializeResponse(res)

			expect(result.statusCode).toBe(404)
			expect(result.statusMessage).toBe("Not Found")
		})

		it("should serialize headers using getHeaders method", () => {
			const res = {
				statusCode: 200,
				getHeaders: () => ({
					"content-type": "application/json",
					"x-custom-header": "value",
				}),
			}

			const result = serializeResponse(res)

			expect(result.headers).toEqual({
				"content-type": "application/json",
				"x-custom-header": "value",
			})
		})

		it("should serialize headers from headers property", () => {
			const res = {
				statusCode: 200,
				headers: {
					"content-type": "text/html",
					"cache-control": "no-cache",
				},
			}

			const result = serializeResponse(res)

			expect(result.headers).toEqual({
				"content-type": "text/html",
				"cache-control": "no-cache",
			})
		})

		it("should redact set-cookie header", () => {
			const res = {
				statusCode: 200,
				getHeaders: () => ({
					"set-cookie": ["session=abc123", "token=xyz789"],
					"content-type": "text/html",
				}),
			}

			const result = serializeResponse(res)

			expect(result.headers?.["set-cookie"]).toBe("[REDACTED]")
			expect(result.headers?.["content-type"]).toBe("text/html")
		})

		it("should redact authorization header", () => {
			const res = {
				statusCode: 200,
				headers: {
					authorization: "Bearer token",
					"content-type": "application/json",
				},
			}

			const result = serializeResponse(res)

			expect(result.headers?.authorization).toBe("[REDACTED]")
			expect(result.headers?.["content-type"]).toBe("application/json")
		})

		it("should redact x-api-key header", () => {
			const res = {
				statusCode: 200,
				headers: {
					"x-api-key": "secret-key",
					"content-length": "1234",
				},
			}

			const result = serializeResponse(res)

			expect(result.headers?.["x-api-key"]).toBe("[REDACTED]")
			expect(result.headers?.["content-length"]).toBe("1234")
		})

		it("should redact sensitive headers (case insensitive)", () => {
			const res = {
				statusCode: 200,
				headers: {
					"Set-Cookie": "session=abc",
					Authorization: "Bearer token",
					"X-API-Key": "key123",
				},
			}

			const result = serializeResponse(res)

			expect(result.headers?.["Set-Cookie"]).toBe("[REDACTED]")
			expect(result.headers?.Authorization).toBe("[REDACTED]")
			expect(result.headers?.["X-API-Key"]).toBe("[REDACTED]")
		})

		it("should serialize error response", () => {
			const res = {
				statusCode: 500,
				statusMessage: "Internal Server Error",
				headers: {
					"content-type": "application/json",
				},
			}

			const result = serializeResponse(res)

			expect(result.statusCode).toBe(500)
			expect(result.statusMessage).toBe("Internal Server Error")
			expect(result.headers?.["content-type"]).toBe("application/json")
		})

		it("should serialize redirect response", () => {
			const res = {
				statusCode: 302,
				statusMessage: "Found",
				headers: {
					location: "/new-path",
				},
			}

			const result = serializeResponse(res)

			expect(result.statusCode).toBe(302)
			expect(result.statusMessage).toBe("Found")
			expect(result.headers?.location).toBe("/new-path")
		})

		it("should handle response with no headers", () => {
			const res = {
				statusCode: 204,
			}

			const result = serializeResponse(res)

			expect(result.statusCode).toBe(204)
			expect(result.headers).toBeUndefined()
		})

		it("should prefer getHeaders over headers property", () => {
			const res = {
				statusCode: 200,
				headers: {
					"content-type": "text/plain",
				},
				getHeaders: () => ({
					"content-type": "application/json",
				}),
			}

			const result = serializeResponse(res)

			expect(result.headers?.["content-type"]).toBe("application/json")
		})

		it("should handle getHeaders not being a function", () => {
			const res = {
				statusCode: 200,
				getHeaders: "not a function",
				headers: {
					"content-type": "text/html",
				},
			}

			const result = serializeResponse(res)

			expect(result.headers?.["content-type"]).toBe("text/html")
		})

		it("should serialize complete response with all fields", () => {
			const res = {
				statusCode: 201,
				statusMessage: "Created",
				getHeaders: () => ({
					"content-type": "application/json",
					"content-length": "123",
					location: "/resources/123",
					"set-cookie": "session=xyz",
				}),
			}

			const result = serializeResponse(res)

			expect(result.statusCode).toBe(201)
			expect(result.statusMessage).toBe("Created")
			expect(result.headers?.["content-type"]).toBe("application/json")
			expect(result.headers?.["content-length"]).toBe("123")
			expect(result.headers?.location).toBe("/resources/123")
			expect(result.headers?.["set-cookie"]).toBe("[REDACTED]")
		})

		it("should handle array header values", () => {
			const res = {
				statusCode: 200,
				headers: {
					"cache-control": ["no-cache", "no-store"],
				},
			}

			const result = serializeResponse(res)

			expect(result.headers?.["cache-control"]).toEqual(["no-cache", "no-store"])
		})

		it("should serialize various status codes", () => {
			const statusCodes = [
				{ code: 200, message: "OK" },
				{ code: 201, message: "Created" },
				{ code: 204, message: "No Content" },
				{ code: 301, message: "Moved Permanently" },
				{ code: 400, message: "Bad Request" },
				{ code: 401, message: "Unauthorized" },
				{ code: 404, message: "Not Found" },
				{ code: 500, message: "Internal Server Error" },
			]

			for (const { code, message } of statusCodes) {
				const res = {
					statusCode: code,
					statusMessage: message,
				}

				const result = serializeResponse(res)

				expect(result.statusCode).toBe(code)
				expect(result.statusMessage).toBe(message)
			}
		})
	})

	describe("responseSerializer", () => {
		it("should be an alias for serializeResponse", () => {
			expect(responseSerializer).toBe(serializeResponse)
		})

		it("should work the same as serializeResponse", () => {
			const res = {
				statusCode: 200,
				statusMessage: "OK",
			}

			const result1 = serializeResponse(res)
			const result2 = responseSerializer(res)

			expect(result1).toEqual(result2)
		})
	})
})
