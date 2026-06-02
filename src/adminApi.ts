import { apiContracts } from "./contracts";

export type LegalArea = {
  id: string;
  name: string;
  slug: string;
};

export type CepAddress = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type Coordinates = {
  lat: number;
  lng: number;
  provider: "stub" | "nominatim";
  precision: "cep_centroid" | "street" | "manual";
  confidence: "high" | "medium" | "low";
};

export type GeocodeCepResult = {
  address: CepAddress;
  coordinates: Coordinates | null;
  recoverable: boolean;
  note?: string;
  persistence: string;
};

export type LawyerStatus = "draft" | "pending_review" | "approved" | "rejected" | "suspended";

export type LawyerFormState = {
  name: string;
  email: string;
  whatsapp: string;
  oabNumber: string;
  oabState: string;
  mainAreaId: string;
  officeCep: string;
  officeNumber: string;
  avatarUrl: string;
  coverUrl: string;
  miniBio: string;
  fullBio: string;
  status: LawyerStatus;
};

export const emptyLawyerForm: LawyerFormState = {
  name: "",
  email: "",
  whatsapp: "",
  oabNumber: "",
  oabState: "SP",
  mainAreaId: "",
  officeCep: "",
  officeNumber: "",
  avatarUrl: "",
  coverUrl: "",
  miniBio: "",
  fullBio: "",
  status: "pending_review"
};

function optionalTrimmed(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

export function buildLawyerPayload(form: LawyerFormState) {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    whatsapp: form.whatsapp.trim(),
    oabNumber: form.oabNumber.trim(),
    oabState: form.oabState.trim().toUpperCase(),
    mainAreaId: form.mainAreaId,
    secondaryAreaIds: [],
    officeCep: form.officeCep.trim(),
    officeNumber: form.officeNumber.trim(),
    avatarUrl: optionalTrimmed(form.avatarUrl),
    coverUrl: optionalTrimmed(form.coverUrl),
    miniBio: optionalTrimmed(form.miniBio),
    fullBio: optionalTrimmed(form.fullBio),
    status: form.status
  };
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? "https://advogado-back-production.up.railway.app" : "http://localhost:3333");

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message ?? "Falha ao chamar API admin.";
    throw new AdminApiError(message, response.status);
  }
  return data as T;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}

export async function fetchAreas(): Promise<LegalArea[]> {
  const response = await fetch(`${API_BASE_URL}${apiContracts.areas}`);
  const data = await parseJson<{ areas: LegalArea[] }>(response);
  return data.areas;
}

export async function geocodeCep(token: string, cep: string): Promise<GeocodeCepResult> {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminGeocodeCep}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ cep })
  });
  return parseJson<GeocodeCepResult>(response);
}

export async function createLawyer(token: string, form: LawyerFormState) {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminLawyers}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(buildLawyerPayload(form))
  });
  return parseJson(response);
}
