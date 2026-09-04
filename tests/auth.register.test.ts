import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/api/app.js";
import { prisma } from "../src/infra/prisma.js";

describe("POST /auth/register", () => {
  it("creates an applicant", async () => {
    const response = await request(app).post("/auth/register").send({
      email: "applicant@example.com",
      password: "correct-horse-battery-staple",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      email: "applicant@example.com",
      role: "APPLICANT",
    });
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty("passwordHash");

    const user = await prisma.user.findUnique({
      where: { email: "applicant@example.com" },
    });

    expect(user).toMatchObject({
      email: "applicant@example.com",
      role: "APPLICANT",
    });
  });

  it("starts with an empty database", async () => {
    await expect(prisma.user.count()).resolves.toBe(0);
  });
});
