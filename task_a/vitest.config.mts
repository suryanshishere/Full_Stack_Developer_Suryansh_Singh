import path from "node:path";
import { defineConfig } from "vitest/config";

const testDbPath = path.resolve(process.cwd(), "tests/.tmp/test.db").replace(/\\/g, "/");

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: "./tests/global-setup.ts",
    env: {
      DATABASE_URL: `file:${testDbPath}`,
      AUTH_SECRET: "leadline-test-secret",
    },
  },
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
});
