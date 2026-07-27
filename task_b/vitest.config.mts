import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["refactor/tests/**/*.test.ts"],
  },
});
