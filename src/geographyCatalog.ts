import type { CityRecord } from "./adminApi";
export const normalizeCityName = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function filterCatalogCities(cities: CityRecord[], stateId: string, search: string, status: "active" | "inactive" | "all") {
  const term = normalizeCityName(search);
  return cities.filter(city => (!stateId || city.stateId === stateId) && (!term || normalizeCityName(city.name).includes(term)) && (status === "all" || city.active === (status === "active")));
}
