// Production uses the active DigitalOcean service until the canonical API DNS is ready.
const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
if (import.meta.env.PROD && configuredApiUrl && new URL(configuredApiUrl).hostname.endsWith(".railway.app")) {
  throw new Error("VITE_API_BASE_URL ainda aponta para Railway. Atualize a variavel de producao para a API DigitalOcean.");
}
export const API_BASE_URL = configuredApiUrl ||
  (import.meta.env.PROD ? "https://advogado20-app-wlrbq.ondigitalocean.app" : "http://localhost:3333");
