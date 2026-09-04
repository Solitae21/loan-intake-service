import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

function assertTestDatabase(
  databaseUrl: string | undefined,
): asserts databaseUrl is string {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const databaseName = decodeURIComponent(
    new URL(databaseUrl).pathname.replace(/^\//, ""),
  );

  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against database "${databaseName}". ` +
        'The test database name must end with "_test".',
    );
  }
}

export default function globalSetup(): void {
  assertTestDatabase(process.env["DATABASE_URL"]);

  const prismaPackage = require.resolve("prisma/package.json");
  const prismaCli = path.join(path.dirname(prismaPackage), "build", "index.js");

  execFileSync(
    process.execPath,
    [
      prismaCli,
      "migrate",
      "deploy",
      "--config",
      "src/prisma.config.ts",
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );
}
