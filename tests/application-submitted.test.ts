import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/infra/prisma.js";
import { handleSubmitted } from "../src/worker/handlers/application-submitted.js";

async function seedApplication(amount = 12_000, monthlyIncome = 10_000) {
  const applicant = await prisma.user.create({
    data: {
      email: "worker-test@example.com",
      passwordHash: "unused-in-these-tests",
    },
  });
  return prisma.application.create({
    data: {
      applicantId: applicant.id,
      amount,
      monthlyIncome,
      term: 12,
      purpose: "repair my damaged home roof",
    },
  });
}

describe("handleSubmitted", () => {
  it.each([
    { amount: 12_000, monthlyIncome: 10_000, status: "APPROVED", score: 100 },
    { amount: 120_000, monthlyIncome: 10_000, status: "NEEDS_REVIEW", score: 45 },
    { amount: 300_000, monthlyIncome: 1_000, status: "REJECTED", score: 0 },
  ])("persists a $status decision, score and audit row", async ({ amount, monthlyIncome, status, score }) => {
    const application = await seedApplication(amount, monthlyIncome);
    const messageId = randomUUID();

    await handleSubmitted(messageId, {
      applicationId: application.id,
      occuredAt: application.createdAt.toISOString(),
    });

    const saved = await prisma.application.findUniqueOrThrow({
      where: { id: application.id },
      include: { auditLogs: true },
    });
    expect(saved).toMatchObject({
      status,
      score,
      decidedAt: status === "NEEDS_REVIEW" ? null : expect.any(Date),
    });
    expect(saved.auditLogs).toHaveLength(1);
    expect(saved.auditLogs[0]).toMatchObject({
      applicationId: application.id,
      actorId: "worker:application-scoring",
      fromStatus: "PENDING",
      toStatus: status,
      reason: expect.stringContaining(`Automated scoring produced score ${score}.`),
    });
    await expect(prisma.processedEvent.findUniqueOrThrow({
      where: { messageId },
    })).resolves.toMatchObject({ eventType: "application.submitted" });
  });

  it("keeps exactly one audit entry when the same message is delivered twice", async () => {
    const application = await seedApplication();
    const messageId = randomUUID();
    const payload = {
      applicationId: application.id,
      occuredAt: application.createdAt.toISOString(),
    };

    await handleSubmitted(messageId, payload);
    const firstDecision = await prisma.application.findUniqueOrThrow({
      where: { id: application.id },
      include: { auditLogs: true },
    });
    expect(firstDecision).toMatchObject({ status: "APPROVED", score: 100 });
    expect(firstDecision.auditLogs).toHaveLength(1);

    await handleSubmitted(messageId, payload);

    await expect(prisma.application.findUniqueOrThrow({
      where: { id: application.id },
      include: { auditLogs: true },
    })).resolves.toEqual(firstDecision);
    await expect(prisma.auditLogs.count({
      where: { applicationId: application.id },
    })).resolves.toBe(1);
    await expect(prisma.processedEvent.count({
      where: { messageId },
    })).resolves.toBe(1);
  });
});
