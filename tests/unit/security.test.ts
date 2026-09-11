import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/api/app.js";
import { config } from "../../src/infra/config.js";
import {
  signAccessToken,
  verifyAccessToken,
} from "../../src/infra/tokens.js";

describe("security controls", () => {
  it("allows the configured CORS origin and withholds access from others", async () => {
    const allowed = config.CORS_ORIGINS[0];
    expect(allowed).toBeDefined();

    const accepted = await request(app).get("/health").set("Origin", allowed!);
    const rejected = await request(app)
      .get("/health")
      .set("Origin", "https://attacker.example");

    expect(accepted.headers["access-control-allow-origin"]).toBe(allowed);
    expect(rejected.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("marks authentication responses as non-cacheable", async () => {
    const response = await request(app).post("/auth/logout").send({});
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("accepts issued access tokens and rejects unrecognized role claims", () => {
    const token = signAccessToken({ id: "user-1", role: "APPLICANT" });
    expect(verifyAccessToken(token)).toEqual({
      sub: "user-1",
      role: "APPLICANT",
    });

    const forgedRole = jwt.sign(
      { role: "SUPERUSER" },
      config.JWT_ACCESS_SECRET,
      {
        subject: "user-1",
        issuer: "loan-intake-service",
        audience: "loan-intake-api",
        algorithm: "HS256",
      },
    );

    expect(() => verifyAccessToken(forgedRole)).toThrow();
  });
});
