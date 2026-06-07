import { describe, expect, it } from "vitest";
import {
  AdminApiError,
  buildPartnerLogoPayload,
  buildLawyerPayload,
  buildLawyerUpdatePayload,
  buildPrayerRequestStatusPatch,
  buildLawyerStatusPatch,
  buildUserBlockedPatch,
  createPartnerLogo,
  emptyLawyerForm,
  emptyPartnerLogoForm,
  fetchAdminUsers,
  fetchLawyers,
  fetchPartnerLogos,
  fetchPrayerRequests,
  updatePrayerRequestStatus,
  updateAdminUserBlocked,
  updateLawyer,
  uploadLawyerImage,
  uploadPartnerLogo,
  updateLawyerStatus
} from "../src/adminApi";
import { changePasswordWithInviteToken, fetchCurrentUser } from "../src/authApi";
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
    expect(apiContracts.changePassword).toBe("/v1/auth/change-password");
    expect(Object.values(apiContracts).some((path) => path.includes("supabase"))).toBe(false);
  });

  it("points lawyer updates to the protected backend resource", () => {
    expect(apiContracts.adminLawyerById).toBe("/v1/admin/lawyers/:id");
    expect(buildLawyerStatusPatch("approved")).toEqual({ status: "approved" });
  });

  it("points operational admin views to backend resources", () => {
    expect(apiContracts.adminPrayerRequests).toBe("/v1/admin/prayer-requests");
    expect(apiContracts.adminPrayerRequestById).toBe("/v1/admin/prayer-requests/:id");
    expect(apiContracts.adminUsers).toBe("/v1/admin/users");
    expect(apiContracts.adminUserById).toBe("/v1/admin/users/:id");
    expect(apiContracts.adminLawyerMedia).toBe("/v1/admin/lawyer-media");
    expect(apiContracts.adminPartnerLogos).toBe("/v1/admin/partner-logos");
    expect(apiContracts.adminPartnerLogoMedia).toBe("/v1/admin/partner-logo-media");
    expect(buildUserBlockedPatch(true)).toEqual({ blocked: true });
    expect(buildPrayerRequestStatusPatch("read")).toEqual({ status: "read" });
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
      secondaryAreaIds: ["area-consumidor", "area-trabalhista"],
      officeCep: "01001-000",
      officeNumber: "100",
      avatarUrl: " https://cdn.example.test/avatar.jpg ",
      coverUrl: "",
      miniBio: " Atendimento civil ",
      fullBio: "",
      instagramUrl: " https://instagram.com/dramarina ",
      linkedinUrl: "",
      facebookUrl: "",
      websiteUrl: " https://marina.example.test ",
      status: "approved"
    });

    expect(payload).toEqual({
      name: "Dra. Marina Costa",
      email: "marina@example.com",
      whatsapp: "11999999999",
      oabNumber: "123456",
      oabState: "SP",
      mainAreaId: "area-civil",
      secondaryAreaIds: ["area-consumidor", "area-trabalhista"],
      officeCep: "01001-000",
      officeNumber: "100",
      avatarUrl: "https://cdn.example.test/avatar.jpg",
      coverUrl: null,
      miniBio: "Atendimento civil",
      fullBio: null,
      instagramUrl: "https://instagram.com/dramarina",
      linkedinUrl: null,
      facebookUrl: null,
      websiteUrl: "https://marina.example.test",
      status: "approved"
    });
  });

  it("builds partial lawyer update payloads so status and social links do not require a full legacy record", () => {
    const payload = buildLawyerUpdatePayload({
      ...emptyLawyerForm,
      instagramUrl: " https://instagram.com/dramarina ",
      linkedinUrl: " https://www.linkedin.com/in/dramarina ",
      status: "suspended"
    });

    expect(payload).toEqual({
      avatarUrl: null,
      coverUrl: null,
      miniBio: null,
      fullBio: null,
      instagramUrl: "https://instagram.com/dramarina",
      linkedinUrl: "https://www.linkedin.com/in/dramarina",
      facebookUrl: null,
      websiteUrl: null,
      status: "suspended"
    });
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("officeCep");
    expect(payload).not.toHaveProperty("mainAreaId");
  });

  it("omits unchanged operational fields when editing an existing lawyer", () => {
    const original = {
      id: "lawyer-1",
      profileId: "profile-1",
      name: "Dra. Marina Costa",
      email: "marina@example.com",
      whatsapp: "11999999999",
      oabNumber: "123456",
      oabState: "SP",
      mainAreaId: "area-civil",
      secondaryAreaIds: [],
      officeCep: "01001000",
      officeNumber: "100",
      status: "pending_review" as const,
      createdAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z"
    };
    const payload = buildLawyerUpdatePayload(
      {
        ...emptyLawyerForm,
        name: original.name,
        email: original.email,
        whatsapp: original.whatsapp,
        oabNumber: original.oabNumber,
        oabState: original.oabState,
        mainAreaId: original.mainAreaId,
        officeCep: "01001-000",
        officeNumber: original.officeNumber,
        instagramUrl: "https://instagram.com/dramarina",
        status: "approved"
      },
      original
    );

    expect(payload).toEqual({
      instagramUrl: "https://instagram.com/dramarina",
      status: "approved"
    });
  });

  it("sends secondary specialties when they change on an existing lawyer", () => {
    const original = {
      id: "lawyer-1",
      profileId: "profile-1",
      name: "Dra. Marina Costa",
      email: "marina@example.com",
      whatsapp: "11999999999",
      oabNumber: "123456",
      oabState: "SP",
      mainAreaId: "civil",
      secondaryAreaIds: ["consumidor"],
      officeCep: "01001000",
      officeNumber: "100",
      status: "pending_review" as const,
      createdAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z"
    };

    const payload = buildLawyerUpdatePayload(
      {
        ...emptyLawyerForm,
        name: original.name,
        email: original.email,
        whatsapp: original.whatsapp,
        oabNumber: original.oabNumber,
        oabState: original.oabState,
        mainAreaId: original.mainAreaId,
        secondaryAreaIds: ["consumidor", "trabalhista"],
        officeCep: "01001-000",
        officeNumber: original.officeNumber,
        status: original.status
      },
      original
    );

    expect(payload).toEqual({ secondaryAreaIds: ["consumidor", "trabalhista"] });
  });

  it("sends confirmed office coordinates only through the protected lawyer PATCH", () => {
    const original = {
      id: "lawyer-1",
      profileId: "profile-1",
      name: "Dra. Marina Costa",
      email: "marina@example.com",
      whatsapp: "11999999999",
      oabNumber: "123456",
      oabState: "SP",
      mainAreaId: "civil",
      secondaryAreaIds: [],
      officeCep: "01001000",
      officeNumber: "100",
      status: "pending_review" as const,
      createdAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z"
    };

    const payload = buildLawyerUpdatePayload(
      {
        ...emptyLawyerForm,
        name: original.name,
        email: original.email,
        whatsapp: original.whatsapp,
        oabNumber: original.oabNumber,
        oabState: original.oabState,
        mainAreaId: original.mainAreaId,
        officeCep: "01001-000",
        officeNumber: original.officeNumber,
        officeManualLat: "-23.550520",
        officeManualLng: "-46.633308",
        status: "approved"
      },
      original
    );

    expect(payload).toEqual({
      officeManualLocation: { lat: -23.55052, lng: -46.633308 },
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

  it("sets first access password through the backend without storing admin session", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/v1/auth/change-password");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        Authorization: "Bearer invite-token",
        "Content-Type": "application/json"
      });
      expect(init?.body).toBe(JSON.stringify({ newPassword: "senha-segura-123" }));
      return new Response(
        JSON.stringify({ user: { id: "lawyer-1", email: "lawyer@example.test", role: "lawyer", mustChangePassword: false } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      await expect(changePasswordWithInviteToken("invite-token", "senha-segura-123")).resolves.toMatchObject({
        id: "lawyer-1",
        role: "lawyer"
      });
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

  it("updates lawyer profile through PATCH with a partial payload", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/v1/admin/lawyers/lawyer-1");
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(
        JSON.stringify({
          avatarUrl: null,
          coverUrl: null,
          miniBio: null,
          fullBio: null,
          instagramUrl: "https://instagram.com/drateste",
          linkedinUrl: null,
          facebookUrl: null,
          websiteUrl: null,
          status: "pending_review"
        })
      );
      return new Response(
        JSON.stringify({
          lawyer: {
            id: "lawyer-1",
            instagramUrl: "https://instagram.com/drateste",
            status: "pending_review"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      await expect(
        updateLawyer("redacted-admin-token", "lawyer-1", {
          ...emptyLawyerForm,
          instagramUrl: "https://instagram.com/drateste",
          status: "pending_review"
        })
      ).resolves.toMatchObject({
        lawyer: { id: "lawyer-1", instagramUrl: "https://instagram.com/drateste", status: "pending_review" }
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

  it("updates prayer request status through backend boundary", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("/v1/admin/prayer-requests/prayer-1");
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(JSON.stringify({ status: "read" }));
      return new Response(
        JSON.stringify({
          request: {
            id: "prayer-1",
            message: "Pedido com tamanho suficiente para teste.",
            anonymous: true,
            status: "read",
            createdAt: "2026-06-03T00:00:00.000Z",
            readAt: "2026-06-04T00:00:00.000Z"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      await expect(updatePrayerRequestStatus("redacted-admin-token", "prayer-1", "read")).resolves.toMatchObject({
        request: { id: "prayer-1", status: "read" }
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("builds and persists partner logo payloads through backend boundaries", async () => {
    expect(
      buildPartnerLogoPayload({
        ...emptyPartnerLogoForm,
        name: " Parceiro ",
        logoUrl: " https://cdn.example.test/logo.png ",
        websiteUrl: "",
        active: true
      })
    ).toEqual({
      name: "Parceiro",
      logoUrl: "https://cdn.example.test/logo.png",
      websiteUrl: null,
      active: true
    });

    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${String(input)}`);
      if (String(input).includes("/v1/admin/partner-logo-media")) {
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe(
          JSON.stringify({ kind: "partnerLogo", fileName: "logo.png", mimeType: "image/png", base64Data: "ZmFrZQ==" })
        );
        return new Response(
          JSON.stringify({
            image: { url: "https://storage.example.test/partners/logos/1.png", path: "partners/logos/1.png", contentType: "image/png" },
            persistence: "memory"
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      if (init?.method === "POST") {
        expect(init.body).toBe(
          JSON.stringify({
            name: "Parceiro",
            logoUrl: "https://storage.example.test/partners/logos/1.png",
            websiteUrl: null,
            active: true
          })
        );
        return new Response(
          JSON.stringify({
            partner: {
              id: "partner-1",
              name: "Parceiro",
              logoUrl: "https://storage.example.test/partners/logos/1.png",
              active: true,
              createdAt: "2026-06-03T00:00:00.000Z",
              updatedAt: "2026-06-03T00:00:00.000Z"
            },
            persistence: "memory"
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ partners: [], persistence: "memory" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as typeof fetch;

    try {
      await expect(fetchPartnerLogos("redacted-admin-token")).resolves.toEqual({ partners: [], persistence: "memory" });
      await expect(
        uploadPartnerLogo("redacted-admin-token", {
          fileName: "logo.png",
          mimeType: "image/png",
          base64Data: "ZmFrZQ=="
        })
      ).resolves.toMatchObject({ image: { url: "https://storage.example.test/partners/logos/1.png" } });
      await expect(
        createPartnerLogo("redacted-admin-token", {
          name: "Parceiro",
          logoUrl: "https://storage.example.test/partners/logos/1.png",
          websiteUrl: "",
          active: true
        })
      ).resolves.toMatchObject({ partner: { id: "partner-1", active: true } });
      expect(calls[0]).toContain("/v1/admin/partner-logos");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
