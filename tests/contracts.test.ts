import { describe, expect, it } from "vitest";
import { AdminApiError, buildLawyerPayload, emptyLawyerForm } from "../src/adminApi";
import { fetchCurrentUser } from "../src/authApi";
import { apiContracts } from "../src/contracts";

describe("admin contracts", () => {
  it("points admin lawyers to backend API only", () => {
    expect(apiContracts.adminLawyers).toBe("/v1/admin/lawyers");
    expect(Object.values(apiContracts).some((path) => path.includes("supabase"))).toBe(false);
  });

  it("points CEP geocoding to the backend boundary only", () => {
    expect(apiContracts.adminGeocodeCep).toBe("/v1/admin/geocode/cep");
    expect(Object.values(apiContracts).some((path) => path.includes("brasilapi"))).toBe(false);
    expect(Object.values(apiContracts).some((path) => path.includes("nominatim"))).toBe(false);
  });

  it("points session validation to the backend boundary only", () => {
    expect(apiContracts.me).toBe("/v1/me");
    expect(Object.values(apiContracts).some((path) => path.includes("supabase"))).toBe(false);
  });

  it("builds the backend lawyer payload with normalized OAB state", () => {
    const payload = buildLawyerPayload({
      ...emptyLawyerForm,
      name: " Dra. Marina Costa ",
      email: " marina@example.com ",
      whatsapp: "11999999999",
      oabNumber: "123456",
      oabState: "sp",
      mainAreaId: "area-civil",
      officeCep: "01001-000",
      officeNumber: "100",
      avatarUrl: " https://cdn.example.test/avatar.jpg ",
      coverUrl: "",
      miniBio: " Atendimento civil ",
      fullBio: "",
      status: "approved"
    });

    expect(payload).toEqual({
      name: "Dra. Marina Costa",
      email: "marina@example.com",
      whatsapp: "11999999999",
      oabNumber: "123456",
      oabState: "SP",
      mainAreaId: "area-civil",
      secondaryAreaIds: [],
      officeCep: "01001-000",
      officeNumber: "100",
      avatarUrl: "https://cdn.example.test/avatar.jpg",
      coverUrl: null,
      miniBio: "Atendimento civil",
      fullBio: null,
      status: "approved"
    });
  });

  it("fetches the current admin user without exposing token in the response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.headers).toEqual({ Authorization: "Bearer redacted-test-token" });
      return new Response(JSON.stringify({ user: { id: "admin-1", email: "admin@example.test", role: "admin" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch;

    try {
      await expect(fetchCurrentUser("redacted-test-token")).resolves.toEqual({
        id: "admin-1",
        email: "admin@example.test",
        role: "admin"
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps session validation failures to AdminApiError", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "Token invalido." } }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })) as typeof fetch;

    try {
      await expect(fetchCurrentUser("redacted-test-token")).rejects.toMatchObject(
        new AdminApiError("Token invalido.", 401)
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
