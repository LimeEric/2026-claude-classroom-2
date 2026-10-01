import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Native replacement for vite-tsconfig-paths; resolves the `@/*` alias.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    // CopilotKit's v2 entry imports its own stylesheet, which Node cannot
    // load; inlining hands the import to Vite, which handles CSS.
    server: { deps: { inline: [/@copilotkit\//] } },
  },
});
