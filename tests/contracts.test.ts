import { describe, expect, it } from "vitest";
import {
  AdminApiError,
  buildLawyerPayload,
  buildLawyerStatusPatch,
  buildUserBlockedPatch,
  emptyLawyerForm,
  fetchAdminUsers,
  fetchLawyers,
  fetchPrayerRequests,
  updateAdminUserBlocked,
  uploadLawyerImage,
  updateLawyerStatus
} from "../src/adminApi";
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

  it("points lawyer updates to the protected backend resource", () => {
    expect(apiContracts.adminLawyerById).toBe("/v1/admin/lawyers/:id");
    expect(buildLawyerStatusPatch("approved")).toEqual({ status: "approved" });
  });

  it("points operational admin views to backend resources", () => {
    expect(apiContracts.adminPrayerRequests).toBe("/v1/admin/prayer-requests");
    expect(apiContracts.adminUsers).toBe("/v1/admin/users");
    expect(apiContracts.adminUserById).toBe("/v1/admin/users/:id");
    expect(apiContracts.adminLawyerMedia).toBe("/v1/admin/lawyer-media");
    expect(buildUserBlockedPatch(true)).toEqual({ blocked: true });
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

  it("lists lawyers through the backend with the stored admin token", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/v1/admin/lawyers");
      expect(init?.headers).toEqual({ Authorization: "Bearer redacted-admin-token", "Content-Type": "application/json" });
      return new Response(JSON.stringify({ lawyers: [], persistence: "memory" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch;

    try {
      await expect(fetchLawyers("redacted-admin-token")).resolves.toEqual({ lawyers: [], persistence: "memory" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("updates lawyer status through PATCH without exposing coordinates", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/v1/admin/lawyers/lawyer-1");
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(JSON.stringify({ status: "suspended" }));
      return new Response(
        JSON.stringify({
          lawyer: {
            id: "lawyer-1",
            profileId: "profile-1",
            name: "Dra. Teste",
            email: "lawyer@example.test",
            whatsapp: "11999999999",
            oabNumber: "123456",
            oabState: "SP",
            mainAreaId: "civil",
            secondaryAreaIds: [],
            officeCep: "01001-000",
            officeNumber: "100",
            status: "suspended",
            createdAt: "2026-06-03T00:00:00.000Z",
            updatedAt: "2026-06-03T00:00:00.000Z"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      await expect(updateLawyerStatus("redacted-admin-token", "lawyer-1", "suspended")).resolves.toMatchObject({
        lawyer: { id: "lawyer-1", status: "suspended" }
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fetches prayer requests through the backend with admin token", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/v1/admin/prayer-requests");
      expect(init?.headers).toEqual({ Authorization: "Bearer redacted-admin-token", "Content-Type": "application/json" });
      return new Response(JSON.stringify({ requests: [], persistence: "memory" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch;

    try {
      await expect(fetchPrayerRequests("redacted-admin-token")).resolves.toEqual({ requests: [], persistence: "memory" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fetches and blocks admin users through backend boundaries", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${String(input)}`);
      if (String(input).includes("/v1/admin/users/user-1")) {
        expect(init?.method).toBe("PATCH");
        expect(init?.body).toBe(JSON.stringify({ blocked: true }));
        return new Response(
          JSON.stringify({
            user: {
              id: "user-1",
              role: "client",
              name: "Cliente",
              email: "cliente@example.test",
              blockedAt: "2026-06-04T00:00:00.000Z",
              createdAt: "2026-06-03T00:00:00.000Z",
              updatedAt: "2026-06-04T00:00:00.000Z"
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ users: [], persistence: "memory" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch;

    try {
      await expect(fetchAdminUsers("redacted-admin-token")).resolves.toEqual({ users: [], persistence: "memory" });
      await expect(updateAdminUserBlocked("redacted-admin-token", "user-1", true)).resolves.toMatchObject({
        user: { id: "user-1", blockedAt: "2026-06-04T00:00:00.000Z" }
      });
      expect(calls[0]).toContain("/v1/admin/users");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("uploads lawyer image through backend storage boundary", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/v1/admin/lawyer-media");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({ kind: "avatar", fileName: "perfil.png", mimeType: "image/png", base64Data: "ZmFrZQ==" })
      );
      return new Response(
        JSON.stringify({
          image: { url: "https://storage.example.test/lawyers/avatar/1.png", path: "lawyers/avatar/1.png", contentType: "image/png" },
          persistence: "memory"
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      await expect(
        uploadLawyerImage("redacted-admin-token", {
          kind: "avatar",
          fileName: "perfil.png",
          mimeType: "image/png",
          base64Data: "ZmFrZQ=="
        })
      ).resolves.toMatchObject({ image: { url: "https://storage.example.test/lawyers/avatar/1.png" } });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
