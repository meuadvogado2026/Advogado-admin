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
  provider: "stub" | "nominatim" | "manual";
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

export type LawyerRecord = {
  id: string;
  profileId: string;
  name: string;
  email: string;
  whatsapp: string;
  oabNumber: string;
  oabState: string;
  mainAreaId: string;
  secondaryAreaIds: string[];
  officeCep: string;
  officeNumber: string;
  officeCity?: string | null;
  officeState?: string | null;
  officeLat?: number | null;
  officeLng?: number | null;
  officeLocationPresent?: boolean;
  officeGeocodeProvider?: Coordinates["provider"] | null;
  officeGeocodePrecision?: Coordinates["precision"] | null;
  officeGeocodeConfidence?: Coordinates["confidence"] | null;
  officeGeocodedAt?: string | null;
  officeLocationStatus?: "validated" | "needs_confirmation" | "pending";
  avatarUrl?: string | null;
  coverUrl?: string | null;
  miniBio?: string | null;
  fullBio?: string | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  status: LawyerStatus;
  mustChangePassword?: boolean;
  accessInvitedAt?: string | null;
  firstLoginCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LawyerAccessResult = {
  lawyer: LawyerRecord;
  access: {
    status: "invited" | "not_configured";
    delivery: "email" | "simulated" | "none";
    invitedAt?: string;
  };
  persistence: string;
};

export type AdminPrayerRequest = {
  id: string;
  message: string;
  anonymous: boolean;
  status: "received" | "read";
  createdAt: string;
  readAt?: string | null;
  client?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type AdminUserRecord = {
  id: string;
  role: "client" | "lawyer" | "admin";
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  blockedAt?: string | null;
  mustChangePassword?: boolean;
  accessInvitedAt?: string | null;
  firstLoginCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  lawyerProfileId?: string | null;
  lawyerStatus?: LawyerStatus | null;
};

export type LawyerFormState = {
  name: string;
  email: string;
  whatsapp: string;
  oabNumber: string;
  oabState: string;
  mainAreaId: string;
  secondaryAreaIds: string[];
  officeCep: string;
  officeNumber: string;
  officeManualLat: string;
  officeManualLng: string;
  avatarUrl: string;
  coverUrl: string;
  miniBio: string;
  fullBio: string;
  instagramUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  websiteUrl: string;
  status: LawyerStatus;
};

export type PartnerLogoRecord = {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PartnerLogoFormState = {
  name: string;
  logoUrl: string;
  websiteUrl: string;
  active: boolean;
};

export const emptyLawyerForm: LawyerFormState = {
  name: "",
  email: "",
  whatsapp: "",
  oabNumber: "",
  oabState: "SP",
  mainAreaId: "",
  secondaryAreaIds: [],
  officeCep: "",
  officeNumber: "",
  officeManualLat: "",
  officeManualLng: "",
  avatarUrl: "",
  coverUrl: "",
  miniBio: "",
  fullBio: "",
  instagramUrl: "",
  linkedinUrl: "",
  facebookUrl: "",
  websiteUrl: "",
  status: "pending_review"
};

export const emptyPartnerLogoForm: PartnerLogoFormState = {
  name: "",
  logoUrl: "",
  websiteUrl: "",
  active: true
};

function optionalTrimmed(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function parseManualLocation(form: Pick<LawyerFormState, "officeManualLat" | "officeManualLng">) {
  const latText = form.officeManualLat.trim().replace(",", ".");
  const lngText = form.officeManualLng.trim().replace(",", ".");
  if (!latText && !lngText) return null;
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function buildLawyerPayload(form: LawyerFormState) {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    whatsapp: form.whatsapp.trim(),
    oabNumber: form.oabNumber.trim(),
    oabState: form.oabState.trim().toUpperCase(),
    mainAreaId: form.mainAreaId,
    secondaryAreaIds: form.secondaryAreaIds.filter((areaId) => areaId && areaId !== form.mainAreaId),
    officeCep: form.officeCep.trim(),
    officeNumber: form.officeNumber.trim(),
    avatarUrl: optionalTrimmed(form.avatarUrl),
    coverUrl: optionalTrimmed(form.coverUrl),
    miniBio: optionalTrimmed(form.miniBio),
    fullBio: optionalTrimmed(form.fullBio),
    instagramUrl: optionalTrimmed(form.instagramUrl),
    linkedinUrl: optionalTrimmed(form.linkedinUrl),
    facebookUrl: optionalTrimmed(form.facebookUrl),
    websiteUrl: optionalTrimmed(form.websiteUrl),
    status: form.status
  };
}

const normalizeCep = (value: string) => value.replace(/\D/g, "");

export function buildLawyerUpdatePayload(form: LawyerFormState, original?: LawyerRecord) {
  const payload: Record<string, unknown> = {};

  const name = form.name.trim();
  const email = form.email.trim();
  const whatsapp = form.whatsapp.trim();
  const oabNumber = form.oabNumber.trim();
  const oabState = form.oabState.trim().toUpperCase();
  const officeCep = form.officeCep.trim();
  const officeNumber = form.officeNumber.trim();
  const manualLocation = parseManualLocation(form);
  const optionalFields = {
    avatarUrl: optionalTrimmed(form.avatarUrl),
    coverUrl: optionalTrimmed(form.coverUrl),
    miniBio: optionalTrimmed(form.miniBio),
    fullBio: optionalTrimmed(form.fullBio),
    instagramUrl: optionalTrimmed(form.instagramUrl),
    linkedinUrl: optionalTrimmed(form.linkedinUrl),
    facebookUrl: optionalTrimmed(form.facebookUrl),
    websiteUrl: optionalTrimmed(form.websiteUrl)
  };

  if (original) {
    if (name && name !== original.name) payload.name = name;
    if (email && email !== original.email) payload.email = email;
    if (whatsapp && whatsapp !== original.whatsapp) payload.whatsapp = whatsapp;
    if (oabNumber && oabNumber !== original.oabNumber) payload.oabNumber = oabNumber;
    if (oabState && oabState !== original.oabState) payload.oabState = oabState;
    if (form.mainAreaId && form.mainAreaId !== original.mainAreaId) {
      payload.mainAreaId = form.mainAreaId;
      payload.secondaryAreaIds = form.secondaryAreaIds.filter((areaId) => areaId && areaId !== form.mainAreaId);
    } else if (
      form.secondaryAreaIds.filter((areaId) => areaId && areaId !== form.mainAreaId).join("|") !==
      original.secondaryAreaIds.filter((areaId) => areaId && areaId !== original.mainAreaId).join("|")
    ) {
      payload.secondaryAreaIds = form.secondaryAreaIds.filter((areaId) => areaId && areaId !== form.mainAreaId);
    }
    if (officeCep && normalizeCep(officeCep) !== normalizeCep(original.officeCep)) payload.officeCep = officeCep;
    if (officeNumber && officeNumber !== original.officeNumber) payload.officeNumber = officeNumber;
    if (manualLocation) payload.officeManualLocation = manualLocation;
    for (const [key, value] of Object.entries(optionalFields)) {
      const originalValue = original[key as keyof typeof optionalFields] ?? null;
      if (value !== originalValue) payload[key] = value;
    }
    if (form.status !== original.status) payload.status = form.status;
    return payload;
  }

  Object.assign(payload, optionalFields, { status: form.status });

  if (name) payload.name = name;
  if (email) payload.email = email;
  if (whatsapp) payload.whatsapp = whatsapp;
  if (oabNumber) payload.oabNumber = oabNumber;
  if (oabNumber && oabState) payload.oabState = oabState;
  if (form.mainAreaId) {
    payload.mainAreaId = form.mainAreaId;
    payload.secondaryAreaIds = form.secondaryAreaIds.filter((areaId) => areaId && areaId !== form.mainAreaId);
  }
  if (officeCep) payload.officeCep = officeCep;
  if (officeNumber) payload.officeNumber = officeNumber;
  if (manualLocation) payload.officeManualLocation = manualLocation;

  return payload;
}

export function buildLawyerStatusPatch(status: LawyerStatus) {
  return { status };
}

export function buildPrayerRequestStatusPatch(status: AdminPrayerRequest["status"]) {
  return { status };
}

export function buildUserBlockedPatch(blocked: boolean) {
  return { blocked };
}

export function lawyerToForm(lawyer: LawyerRecord): LawyerFormState {
  return {
    name: lawyer.name,
    email: lawyer.email,
    whatsapp: lawyer.whatsapp,
    oabNumber: lawyer.oabNumber,
    oabState: lawyer.oabState,
    mainAreaId: lawyer.mainAreaId,
    secondaryAreaIds: lawyer.secondaryAreaIds ?? [],
    officeCep: lawyer.officeCep,
    officeNumber: lawyer.officeNumber,
    officeManualLat: "",
    officeManualLng: "",
    avatarUrl: lawyer.avatarUrl ?? "",
    coverUrl: lawyer.coverUrl ?? "",
    miniBio: lawyer.miniBio ?? "",
    fullBio: lawyer.fullBio ?? "",
    instagramUrl: lawyer.instagramUrl ?? "",
    linkedinUrl: lawyer.linkedinUrl ?? "",
    facebookUrl: lawyer.facebookUrl ?? "",
    websiteUrl: lawyer.websiteUrl ?? "",
    status: lawyer.status
  };
}

export function buildPartnerLogoPayload(form: PartnerLogoFormState) {
  return {
    name: form.name.trim(),
    logoUrl: form.logoUrl.trim(),
    websiteUrl: optionalTrimmed(form.websiteUrl),
    active: form.active
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

export async function geocodeCep(token: string, cep: string, officeNumber?: string): Promise<GeocodeCepResult> {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminGeocodeCep}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ cep, ...(officeNumber?.trim() ? { officeNumber: officeNumber.trim() } : {}) })
  });
  return parseJson<GeocodeCepResult>(response);
}

export async function createLawyer(token: string, form: LawyerFormState): Promise<LawyerAccessResult> {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminLawyers}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(buildLawyerPayload(form))
  });
  return parseJson<LawyerAccessResult>(response);
}

export async function updateLawyer(token: string, lawyerId: string, form: LawyerFormState, original?: LawyerRecord) {
  const response = await fetch(
    `${API_BASE_URL}${apiContracts.adminLawyerById.replace(":id", encodeURIComponent(lawyerId))}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(buildLawyerUpdatePayload(form, original))
    }
  );
  return parseJson<{ lawyer: LawyerRecord }>(response);
}

export async function inviteLawyerAccess(token: string, lawyerId: string): Promise<LawyerAccessResult> {
  const response = await fetch(
    `${API_BASE_URL}${apiContracts.adminLawyerAccessInvite.replace(":id", encodeURIComponent(lawyerId))}`,
    {
      method: "POST",
      headers: authHeaders(token)
    }
  );
  return parseJson<LawyerAccessResult>(response);
}

export async function fetchLawyers(token: string): Promise<{ lawyers: LawyerRecord[]; persistence: string }> {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminLawyers}`, {
    headers: authHeaders(token)
  });
  return parseJson<{ lawyers: LawyerRecord[]; persistence: string }>(response);
}

export async function updateLawyerStatus(token: string, lawyerId: string, status: LawyerStatus) {
  const response = await fetch(
    `${API_BASE_URL}${apiContracts.adminLawyerById.replace(":id", encodeURIComponent(lawyerId))}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(buildLawyerStatusPatch(status))
    }
  );
  return parseJson<{ lawyer: LawyerRecord }>(response);
}

export async function uploadLawyerImage(
  token: string,
  input: { kind: "avatar" | "cover"; fileName: string; mimeType: string; base64Data: string }
) {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminLawyerMedia}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input)
  });
  return parseJson<{ image: { url: string; path: string; contentType: string }; persistence: string }>(response);
}

export async function fetchPrayerRequests(token: string): Promise<{ requests: AdminPrayerRequest[]; persistence: string }> {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminPrayerRequests}`, {
    headers: authHeaders(token)
  });
  return parseJson<{ requests: AdminPrayerRequest[]; persistence: string }>(response);
}

export async function updatePrayerRequestStatus(token: string, requestId: string, status: AdminPrayerRequest["status"]) {
  const response = await fetch(
    `${API_BASE_URL}${apiContracts.adminPrayerRequestById.replace(":id", encodeURIComponent(requestId))}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(buildPrayerRequestStatusPatch(status))
    }
  );
  return parseJson<{ request: AdminPrayerRequest }>(response);
}

export async function fetchAdminUsers(token: string): Promise<{ users: AdminUserRecord[]; persistence: string }> {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminUsers}`, {
    headers: authHeaders(token)
  });
  return parseJson<{ users: AdminUserRecord[]; persistence: string }>(response);
}

export async function updateAdminUserBlocked(token: string, userId: string, blocked: boolean) {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminUserById.replace(":id", encodeURIComponent(userId))}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(buildUserBlockedPatch(blocked))
  });
  return parseJson<{ user: AdminUserRecord }>(response);
}

export async function fetchPartnerLogos(token: string): Promise<{ partners: PartnerLogoRecord[]; persistence: string }> {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminPartnerLogos}`, {
    headers: authHeaders(token)
  });
  return parseJson<{ partners: PartnerLogoRecord[]; persistence: string }>(response);
}

export async function createPartnerLogo(token: string, form: PartnerLogoFormState) {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminPartnerLogos}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(buildPartnerLogoPayload(form))
  });
  return parseJson<{ partner: PartnerLogoRecord; persistence: string }>(response);
}

export async function uploadPartnerLogo(
  token: string,
  input: { fileName: string; mimeType: string; base64Data: string }
) {
  const response = await fetch(`${API_BASE_URL}${apiContracts.adminPartnerLogoMedia}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ kind: "partnerLogo", ...input })
  });
  return parseJson<{ image: { url: string; path: string; contentType: string }; persistence: string }>(response);
}
