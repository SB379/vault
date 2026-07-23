import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
      "@": path.resolve(__dirname),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
