import { describe, expect, it } from "bun:test"
import { httpSerializers, requestSerializer, responseSerializer } from "../index"

describe("HTTP Serializers Index", () => {
	describe("exports", () => {
		it("should export requestSerializer", () => {
			expect(requestSerializer).toBeDefined()
			expect(typeof requestSerializer).toBe("function")
		})

		it("should export responseSerializer", () => {
			expect(responseSerializer).toBeDefined()
			expect(typeof responseSerializer).toBe("function")
		})

		it("should export httpSerializers object", () => {
			expect(httpSerializers).toBeDefined()
			expect(typeof httpSerializers).toBe("object")
		})
	})

	describe("httpSerializers", () => {
		it("should have req property", () => {
			expect(httpSerializers.req).toBe(requestSerializer)
		})

		it("should have request property (alias)", () => {
			expect(httpSerializers.request).toBe(requestSerializer)
		})

		it("should have res property", () => {
			expect(httpSerializers.res).toBe(responseSerializer)
		})

		it("should have response property (alias)", () => {
			expect(httpSerializers.response).toBe(responseSerializer)
		})

		it("req and request should be the same", () => {
			expect(httpSerializers.req).toBe(httpSerializers.request)
		})

		it("res and response should be the same", () => {
			expect(httpSerializers.res).toBe(httpSerializers.response)
		})
	})

	describe("integration", () => {
		it("should work with both req and request keys", () => {
			const mockReq = {
				method: "GET",
				url: "/test",
			}

			const result1 = httpSerializers.req(mockReq)
			const result2 = httpSerializers.request(mockReq)

			expect(result1).toEqual(result2)
			expect(result1.method).toBe("GET")
			expect(result1.url).toBe("/test")
		})

		it("should work with both res and response keys", () => {
			const mockRes = {
				statusCode: 200,
				statusMessage: "OK",
			}

			const result1 = httpSerializers.res(mockRes)
			const result2 = httpSerializers.response(mockRes)

			expect(result1).toEqual(result2)
			expect(result1.statusCode).toBe(200)
			expect(result1.statusMessage).toBe("OK")
		})

		it("should be usable in logger configuration", () => {
			// Simulate logger usage
			const logData = {
				req: {
					method: "POST",
					url: "/api/users",
					headers: {
						authorization: "Bearer token",
					},
				},
				res: {
					statusCode: 201,
				},
			}

			const serializedReq = httpSerializers.req(logData.req)
			const serializedRes = httpSerializers.res(logData.res)

			expect(serializedReq.method).toBe("POST")
			expect(serializedReq.headers?.authorization).toBe("[REDACTED]")
			expect(serializedRes.statusCode).toBe(201)
		})
	})
})
