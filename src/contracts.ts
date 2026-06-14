export const apiContracts = {
  health: "/health",
  me: "/v1/me",
  changePassword: "/v1/auth/change-password",
  areas: "/v1/areas",
  states: "/v1/states",
  stateCities: "/v1/states/:stateId/cities",
  adminLawyers: "/v1/admin/lawyers",
  adminLawyerById: "/v1/admin/lawyers/:id",
  adminLawyerAccessInvite: "/v1/admin/lawyers/:id/access-invite",
  adminGeocodeCep: "/v1/admin/geocode/cep",
  adminStates: "/v1/admin/states",
  adminStateById: "/v1/admin/states/:id",
  adminCities: "/v1/admin/cities",
  adminCityById: "/v1/admin/cities/:id",
  adminPrayerRequests: "/v1/admin/prayer-requests",
  adminPrayerRequestById: "/v1/admin/prayer-requests/:id",
  adminUsers: "/v1/admin/users",
  adminUserById: "/v1/admin/users/:id",
  adminLawyerMedia: "/v1/admin/lawyer-media",
  adminPartnerLogos: "/v1/admin/partner-logos",
  adminPartnerLogoMedia: "/v1/admin/partner-logo-media",
  adminBenefits: "/v1/admin/benefits",
  adminBenefitById: "/v1/admin/benefits/:id",
  partnerLogos: "/v1/partner-logos"
} as const;

export const kpis = [
  { label: "Advogados", value: "API", helper: "Cadastro passa pelo backend" },
  { label: "CEP", value: "ON", helper: "Localizacao protegida por admin" },
  { label: "Match", value: "PostGIS", helper: "Aprovado exige coordenada" },
  { label: "Operacao", value: "OK", helper: "Sessao e backend monitorados" }
];
