export const apiContracts = {
  health: "/health",
  me: "/v1/me",
  areas: "/v1/areas",
  adminLawyers: "/v1/admin/lawyers",
  adminLawyerById: "/v1/admin/lawyers/:id",
  adminGeocodeCep: "/v1/admin/geocode/cep",
  adminPrayerRequests: "/v1/admin/prayer-requests",
  adminUsers: "/v1/admin/users",
  adminUserById: "/v1/admin/users/:id",
  adminLawyerMedia: "/v1/admin/lawyer-media"
} as const;

export const kpis = [
  { label: "Advogados", value: "API", helper: "Cadastro passa pelo backend" },
  { label: "CEP", value: "ON", helper: "Geocoding protegido por admin" },
  { label: "Match", value: "PostGIS", helper: "Aprovado exige coordenada" }
];
