import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    css: true,
    // Above the 5s default. Nothing here is slow by design, but these mount React through
    // Testing Library in jsdom and drive them with userEvent, which on a loaded machine drifts
    // past five seconds and fails the whole suite on timeouts rather than on assertions -- a
    // failure that says nothing about the code and sends you looking in the wrong place.
    testTimeout: 20000,
  },
});
