export const apiContracts = {
  health: "/health",
  areas: "/v1/areas",
  adminLawyers: "/v1/admin/lawyers",
  adminLawyerById: "/v1/admin/lawyers/:id",
  adminGeocodeCep: "/v1/admin/geocode/cep"
} as const;

export const kpis = [
  { label: "Advogados", value: "API", helper: "Cadastro passa pelo backend" },
  { label: "CEP", value: "ON", helper: "Geocoding protegido por admin" },
  { label: "Match", value: "PostGIS", helper: "Aprovado exige coordenada" }
];
