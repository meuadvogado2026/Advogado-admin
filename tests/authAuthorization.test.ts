import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

describe("admin login authorization", () => {
  it.each(["client", "lawyer", "admin"])("authorizes only admin after a valid %s identity login", async role => {
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-test-key");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "verified-user", role } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { loginAdmin } = await import("../src/authApi");
    const result = loginAdmin("controlled@example.test", "test-only-password");
    if (role === "admin") await expect(result).resolves.toMatchObject({ user: { role: "admin" } });
    else await expect(result).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
