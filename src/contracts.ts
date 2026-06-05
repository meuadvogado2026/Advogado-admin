export const apiContracts = {
  health: "/health",
  me: "/v1/me",
  areas: "/v1/areas",
  adminLawyers: "/v1/admin/lawyers",
  adminLawyerById: "/v1/admin/lawyers/:id",
  adminLawyerAccessInvite: "/v1/admin/lawyers/:id/access-invite",
  adminGeocodeCep: "/v1/admin/geocode/cep",
  adminPrayerRequests: "/v1/admin/prayer-requests",
  adminPrayerRequestById: "/v1/admin/prayer-requests/:id",
  adminUsers: "/v1/admin/users",
  adminUserById: "/v1/admin/users/:id",
  adminLawyerMedia: "/v1/admin/lawyer-media",
  adminPartnerLogos: "/v1/admin/partner-logos",
  adminPartnerLogoMedia: "/v1/admin/partner-logo-media",
  partnerLogos: "/v1/partner-logos"
} as const;

export const kpis = [
  { label: "Advogados", value: "API", helper: "Cadastro passa pelo backend" },
  { label: "CEP", value: "ON", helper: "Geocoding protegido por admin" },
  { label: "Match", value: "PostGIS", helper: "Aprovado exige coordenada" },
  { label: "Operacao", value: "OK", helper: "Sessao e backend monitorados" }
];
