import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/api/app.js";
import { prisma } from "../src/infra/prisma.js";
import { signAccessToken } from "../src/infra/tokens.js";

const validApplication = {
  amount: 250_000,
  term: 24,
  monthlyIncome: 45_000,
  purpose: "Home improvements",
};

async function createApplicant(email = "applicant@example.com") {
  const user = await prisma.user.create({
    data: { email, passwordHash: "unused-in-these-tests", role: "APPLICANT" },
  });
  return { ...user, token: signAccessToken(user) };
}

async function expectNoSubmission() {
  await expect(prisma.application.count()).resolves.toBe(0);
  await expect(prisma.outboxMessage.count()).resolves.toBe(0);
}

describe("POST /applications", () => {
  it("accepts a submission and persists its application and outbox event", async () => {
    const applicant = await createApplicant();
    const response = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${applicant.token}`)
      .send(validApplication);

    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({
      id: expect.any(String),
      applicantId: applicant.id,
      amount: "250000.00",
      term: 24,
      monthlyIncome: "45000.00",
      purpose: validApplication.purpose,
      status: "PENDING",
    });
    expect(response.headers.location).toBe(`/applications/${response.body.id}`);
    const saved = await prisma.application.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(saved).toMatchObject({ applicantId: applicant.id, status: "PENDING", term: 24 });
    expect(saved.amount.toFixed(2)).toBe("250000.00");
    expect(saved.monthlyIncome.toFixed(2)).toBe("45000.00");
    const events = await prisma.outboxMessage.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      routingKey: "application.submitted",
      payload: { applicationId: saved.id },
      publishedAt: null,
    });
  });

  it.each([
    { amount: -1 },
    { term: 5 },
    { term: 24.5 },
    { monthlyIncome: 0 },
    { purpose: "  " },
  ])("rejects invalid input %j without creating a submission", async (invalid) => {
    const applicant = await createApplicant();
    const response = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${applicant.token}`)
      .send({ ...validApplication, ...invalid });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    await expectNoSubmission();
  });

  it.each([undefined, "Bearer invalid-token"])(
    "returns 401 for authorization %s",
    async (authorization) => {
      const pending = request(app).post("/applications");
      if (authorization) pending.set("Authorization", authorization);
      const response = await pending.send(validApplication);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("UNAUTHORIZED");
      await expectNoSubmission();
    },
  );
});

describe("application access control", () => {
  it("lets an owner read their application but returns 403 for another applicant", async () => {
    const owner = await createApplicant("owner@example.com");
    const other = await createApplicant("other@example.com");
    const application = await prisma.application.create({
      data: { ...validApplication, applicantId: owner.id },
    });

    const allowed = await request(app)
      .get(`/applications/${application.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toMatchObject({ id: application.id, applicantId: owner.id });

    const denied = await request(app)
      .get(`/applications/${application.id}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");
    expect(denied.body).not.toHaveProperty("applicantId");
    expect(denied.body).not.toHaveProperty("amount");
  });

  it.each(["decision", "status"])(
    "returns 403 when an applicant changes an application's %s",
    async (endpoint) => {
      const applicant = await createApplicant();
      const application = await prisma.application.create({
        data: { ...validApplication, applicantId: applicant.id },
      });
      const response = await request(app)
        .patch(`/applications/${application.id}/${endpoint}`)
        .set("Authorization", `Bearer ${applicant.token}`)
        .send({ status: "IN_REVIEW", reason: "Ready for review" });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
      await expect(prisma.application.findUniqueOrThrow({
        where: { id: application.id },
      })).resolves.toMatchObject({ status: "PENDING", decidedAt: null });
      await expect(prisma.auditLogs.count()).resolves.toBe(0);
    },
  );
});
