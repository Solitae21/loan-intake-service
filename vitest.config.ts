import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

const result = loadEnv({
  path: path.resolve(process.cwd(), ".env.test"),
  override: true,
});

if (result.error) {
  throw new Error(`Unable to load .env.test: ${result.error.message}`);
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    clearMocks: true,
    restoreMocks: true,
    hookTimeout: 30_000,
    testTimeout: 10_000,
  },
});
