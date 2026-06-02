import { apiContracts } from "./contracts";
import { AdminApiError } from "./adminApi";

export type AdminUser = {
  id: string;
  email?: string;
  role: "admin" | "client" | "lawyer";
};

export type AdminSession = {
  accessToken: string;
  user: AdminUser;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? "https://advogado-back-production.up.railway.app" : "http://localhost:3333");
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://qpemxkiowiiklztgumqy.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SESSION_STORAGE_KEY = "meu_advogado_admin_session";

type SupabasePasswordResponse = {
  access_token?: string;
  error_description?: string;
  msg?: string;
};

async function parseApiJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message ?? "Falha ao validar sessao admin.";
    throw new AdminApiError(message, response.status);
  }
  return data as T;
}

async function loginWithSupabase(email: string, password: string): Promise<string> {
  if (!SUPABASE_ANON_KEY) {
    throw new AdminApiError("Auth admin nao configurado. Defina VITE_SUPABASE_ANON_KEY.", 500);
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  const data = (await response.json().catch(() => null)) as SupabasePasswordResponse | null;

  if (!response.ok || !data?.access_token) {
    throw new AdminApiError(data?.error_description ?? data?.msg ?? "Credenciais invalidas.", response.status);
  }

  return data.access_token;
}

export async function fetchCurrentUser(token: string): Promise<AdminUser> {
  const response = await fetch(`${API_BASE_URL}${apiContracts.me}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await parseApiJson<{ user: AdminUser }>(response);
  return data.user;
}

export async function loginAdmin(email: string, password: string): Promise<AdminSession> {
  const accessToken = await loginWithSupabase(email.trim(), password);
  const user = await fetchCurrentUser(accessToken);

  if (user.role !== "admin") {
    throw new AdminApiError("Usuario sem permissao de administrador.", 403);
  }

  return { accessToken, user };
}

export function loadStoredSession(): AdminSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed.accessToken || parsed.user?.role !== "admin") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeSession(session: AdminSession) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
