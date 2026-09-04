import { afterAll, beforeEach } from "vitest";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const databaseName = decodeURIComponent(
  new URL(databaseUrl).pathname.replace(/^\//, ""),
);

if (!databaseName.endsWith("_test")) {
  throw new Error(
    `Refusing to truncate database "${databaseName}". ` +
      'The test database name must end with "_test".',
  );
}

const { prisma } = await import("../src/infra/prisma.js");

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLogs",
      "Application",
      "RefreshToken",
      "OutboxMessage",
      "ProcessedEvent",
      "User"
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await prisma.$disconnect();
});
