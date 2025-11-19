import { describe, expect, it } from "bun:test"
import { serializeRequest, requestSerializer } from "../request"

describe("HTTP Request Serializer", () => {
	describe("serializeRequest", () => {
		it("should serialize basic request", () => {
			const req = {
				method: "GET",
				url: "/api/users",
			}

			const result = serializeRequest(req)

			expect(result.method).toBe("GET")
			expect(result.url).toBe("/api/users")
		})

		it("should prefer originalUrl over url (Express)", () => {
			const req = {
				method: "GET",
				url: "/users",
				originalUrl: "/api/users",
			}

			const result = serializeRequest(req)

			expect(result.url).toBe("/api/users")
		})

		it("should handle missing method", () => {
			const req = {
				url: "/test",
			}

			const result = serializeRequest(req)

			expect(result.method).toBe("UNKNOWN")
		})

		it("should handle missing url", () => {
			const req = {
				method: "POST",
			}

			const result = serializeRequest(req)

			expect(result.url).toBe("/")
		})

		it("should serialize headers", () => {
			const req = {
				method: "GET",
				url: "/test",
				headers: {
					"content-type": "application/json",
					"user-agent": "test-client",
				},
			}

			const result = serializeRequest(req)

			expect(result.headers).toEqual({
				"content-type": "application/json",
				"user-agent": "test-client",
			})
		})

		it("should redact authorization header", () => {
			const req = {
				method: "GET",
				url: "/test",
				headers: {
					authorization: "Bearer secret-token",
					"content-type": "application/json",
				},
			}

			const result = serializeRequest(req)

			expect(result.headers?.authorization).toBe("[REDACTED]")
			expect(result.headers?.["content-type"]).toBe("application/json")
		})

		it("should redact cookie header", () => {
			const req = {
				method: "GET",
				url: "/test",
				headers: {
					cookie: "session=abc123",
				},
			}

			const result = serializeRequest(req)

			expect(result.headers?.cookie).toBe("[REDACTED]")
		})

		it("should redact sensitive headers (case insensitive)", () => {
			const req = {
				method: "GET",
				url: "/test",
				headers: {
					Authorization: "Bearer token",
					"X-API-Key": "secret",
					"X-Auth-Token": "token123",
					"X-CSRF-Token": "csrf",
					"X-Session-ID": "session",
				},
			}

			const result = serializeRequest(req)

			expect(result.headers?.Authorization).toBe("[REDACTED]")
			expect(result.headers?.["X-API-Key"]).toBe("[REDACTED]")
			expect(result.headers?.["X-Auth-Token"]).toBe("[REDACTED]")
			expect(result.headers?.["X-CSRF-Token"]).toBe("[REDACTED]")
			expect(result.headers?.["X-Session-ID"]).toBe("[REDACTED]")
		})

		it("should serialize query parameters", () => {
			const req = {
				method: "GET",
				url: "/test",
				query: {
					page: "1",
					limit: "10",
				},
			}

			const result = serializeRequest(req)

			expect(result.query).toEqual({ page: "1", limit: "10" })
		})

		it("should serialize route parameters (Express)", () => {
			const req = {
				method: "GET",
				url: "/users/123",
				params: {
					userId: "123",
				},
			}

			const result = serializeRequest(req)

			expect(result.params).toEqual({ userId: "123" })
		})

		it("should serialize remote address from socket", () => {
			const req = {
				method: "GET",
				url: "/test",
				socket: {
					remoteAddress: "192.168.1.1",
					remotePort: 54321,
				},
			}

			const result = serializeRequest(req)

			expect(result.remoteAddress).toBe("192.168.1.1")
			expect(result.remotePort).toBe(54321)
		})

		it("should serialize remote address from connection (fallback)", () => {
			const req = {
				method: "GET",
				url: "/test",
				connection: {
					remoteAddress: "10.0.0.1",
					remotePort: 12345,
				},
			}

			const result = serializeRequest(req)

			expect(result.remoteAddress).toBe("10.0.0.1")
			expect(result.remotePort).toBe(12345)
		})

		it("should serialize remote address from ip (Express)", () => {
			const req = {
				method: "GET",
				url: "/test",
				ip: "172.16.0.1",
			}

			const result = serializeRequest(req)

			expect(result.remoteAddress).toBe("172.16.0.1")
		})

		it("should serialize protocol from request object", () => {
			const req = {
				method: "GET",
				url: "/test",
				protocol: "https",
			}

			const result = serializeRequest(req)

			expect(result.protocol).toBe("https")
		})

		it("should detect https from encrypted socket", () => {
			const req = {
				method: "GET",
				url: "/test",
				socket: {
					encrypted: true,
				},
			}

			const result = serializeRequest(req)

			expect(result.protocol).toBe("https")
		})

		it("should serialize HTTP version", () => {
			const req = {
				method: "GET",
				url: "/test",
				httpVersion: "1.1",
			}

			const result = serializeRequest(req)

			expect(result.httpVersion).toBe("1.1")
		})

		it("should serialize complete Express-like request", () => {
			const req = {
				method: "POST",
				url: "/users/123",
				originalUrl: "/api/v1/users/123",
				headers: {
					"content-type": "application/json",
					authorization: "Bearer token",
					"user-agent": "Mozilla/5.0",
				},
				query: { include: "profile" },
				params: { userId: "123" },
				protocol: "https",
				httpVersion: "1.1",
				ip: "192.168.1.1",
			}

			const result = serializeRequest(req)

			expect(result.method).toBe("POST")
			expect(result.url).toBe("/api/v1/users/123")
			expect(result.headers?.authorization).toBe("[REDACTED]")
			expect(result.headers?.["content-type"]).toBe("application/json")
			expect(result.query).toEqual({ include: "profile" })
			expect(result.params).toEqual({ userId: "123" })
			expect(result.protocol).toBe("https")
			expect(result.httpVersion).toBe("1.1")
			expect(result.remoteAddress).toBe("192.168.1.1")
		})

		it("should handle empty request object", () => {
			const req = {}

			const result = serializeRequest(req)

			expect(result.method).toBe("UNKNOWN")
			expect(result.url).toBe("/")
		})

		it("should handle array header values", () => {
			const req = {
				method: "GET",
				url: "/test",
				headers: {
					accept: ["application/json", "text/html"],
				},
			}

			const result = serializeRequest(req)

			expect(result.headers?.accept).toEqual(["application/json", "text/html"])
		})
	})

	describe("requestSerializer", () => {
		it("should be an alias for serializeRequest", () => {
			expect(requestSerializer).toBe(serializeRequest)
		})

		it("should work the same as serializeRequest", () => {
			const req = {
				method: "GET",
				url: "/test",
			}

			const result1 = serializeRequest(req)
			const result2 = requestSerializer(req)

			expect(result1).toEqual(result2)
		})
	})
})
