import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {vi.unstubAllEnvs(); vi.resetModules();});
it("uses DigitalOcean in production without an override", async () => {
  vi.stubEnv("PROD", true); vi.stubEnv("VITE_API_BASE_URL", "");
  expect((await import("../src/apiConfig")).API_BASE_URL).toBe("https://advogado20-app-wlrbq.ondigitalocean.app");
});
it("preserves the development endpoint", async () => {
  vi.stubEnv("PROD", false); vi.stubEnv("VITE_API_BASE_URL", "");
  expect((await import("../src/apiConfig")).API_BASE_URL).toBe("http://localhost:3333");
});
it("rejects a stale Railway production configuration", async () => {
  vi.stubEnv("PROD", true); vi.stubEnv("VITE_API_BASE_URL", "https://advogado-back-production-0be1.up.railway.app");
  await expect(import("../src/apiConfig")).rejects.toThrow("Railway");
});
it("accepts a configured canonical API without a trailing slash", async () => {
  vi.stubEnv("PROD", true); vi.stubEnv("VITE_API_BASE_URL", " https://api.advogado20.com.br/ ");
  expect((await import("../src/apiConfig")).API_BASE_URL).toBe("https://api.advogado20.com.br");
});
