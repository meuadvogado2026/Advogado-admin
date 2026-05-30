import { describe, expect, it } from "vitest";
import { buildLawyerPayload, emptyLawyerForm } from "../src/adminApi";
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
      status: "approved"
    });
  });
});
