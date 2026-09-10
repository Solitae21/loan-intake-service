import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/api/app.js";

describe("authentication rate limiting", () => {
  it.each(["login", "register"])(
    "returns 429 after five %s attempts from one IP",
    async (endpoint) => {
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const response = await request(app).post(`/auth/${endpoint}`).send({});
        expect(response.status).toBe(422);
      }

      const requestId = `rate-limit-${endpoint}`;
      const response = await request(app)
        .post(`/auth/${endpoint}`)
        .set("x-request-id", requestId)
        .send({});

      expect(response.status).toBe(429);
      expect(response.headers["ratelimit"]).toBeDefined();
      expect(response.headers["x-request-id"]).toBe(requestId);
      expect(response.body).toEqual({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many authentication attempts; try again later",
          requestId,
        },
      });
    },
  );
});
