import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AdminApiError,
  AdminPrayerRequest,
  AdminUserRecord,
  CepAddress,
  CityRecord,
  Coordinates,
  createAdminCity,
  createAdminState,
  createPartnerLogo,
  createLawyer,
  emptyLawyerForm,
  emptyPartnerLogoForm,
  fetchAdminUsers,
  fetchAdminCities,
  fetchAdminStates,
  fetchAreas,
  fetchLawyers,
  fetchPartnerLogos,
  fetchPrayerRequests,
  geocodeCep,
  inviteLawyerAccess,
  lawyerToForm,
  LawyerFormState,
  LawyerRecord,
  LawyerStatus,
  PartnerLogoFormState,
  PartnerLogoRecord,
  StateRecord,
  updateAdminCity,
  updateAdminState,
  updateAdminUserBlocked,
  updateLawyer,
  updateLawyerStatus,
  updatePrayerRequestStatus,
  uploadLawyerImage,
  uploadPartnerLogo,
  LegalArea
} from "./adminApi";
import {
  AdminSession,
  changePasswordWithInviteToken,
  clearStoredSession,
  fetchCurrentUser,
  loadStoredSession,
  loginAdmin,
  storeSession
} from "./authApi";
import { OfficeLocationMap } from "./components/OfficeLocationMap";
import { kpis } from "./contracts";
import "./styles/app.css";
import logo from "./assets/logo-blue.png";

type Feedback = { kind: "idle" | "success" | "error" | "info"; message: string };
type AdminView = "dashboard" | "lawyers" | "newLawyer" | "locations" | "prayers" | "users" | "partners" | "operation";

function readInviteHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    accessToken: params.get("access_token") ?? "",
    errorCode: params.get("error_code") ?? params.get("error") ?? "",
    errorDescription: params.get("error_description")?.replace(/\+/g, " ") ?? ""
  };
}

const CACHE_TTL_MS = 45_000;
const LAWYERS_PAGE_SIZE = 8;
const PRAYERS_PAGE_SIZE = 6;
const USERS_PAGE_SIZE = 8;

function formatAddress(address: CepAddress) {
  const parts = [address.street, address.neighborhood, address.city, address.state].filter(Boolean);
  return parts.join(" - ");
}

function formatCoordinates(coordinates: Coordinates | null) {
  if (!coordinates) return "Coordenada pendente";
  const metadata = `${coordinates.provider}, ${coordinates.precision}/${coordinates.confidence}`;
  if (coordinates.confidence === "high" && (coordinates.precision === "street" || coordinates.precision === "manual")) {
    return `Coordenada validada (${metadata})`;
  }
  return `Coordenada aproximada, confirmar localizacao (${metadata})`;
}

function formatSafeCoordinateState(lawyer: LawyerRecord) {
  if (lawyer.officeLocationStatus === "validated") return "Coordenada validada";
  if (lawyer.officeLocationStatus === "needs_confirmation") return "Coordenada aproximada, confirmar localizacao";
  if (typeof lawyer.officeLat === "number" && typeof lawyer.officeLng === "number") {
    return "Coordenada aproximada, confirmar localizacao";
  }
  return "Coordenada pendente";
}

function formatGeocodeMetadata(lawyer: LawyerRecord) {
  if (!lawyer.officeGeocodeProvider || !lawyer.officeGeocodePrecision || !lawyer.officeGeocodeConfidence) {
    return "Metadados pendentes";
  }
  return `${lawyer.officeGeocodeProvider} - ${lawyer.officeGeocodePrecision}/${lawyer.officeGeocodeConfidence}`;
}

function formatAccessState(lawyer: LawyerRecord) {
  if (lawyer.firstLoginCompletedAt) return "Acesso ativo";
  if (lawyer.mustChangePassword) return "Troca de senha pendente";
  if (lawyer.accessInvitedAt) return "Convite enviado";
  return "Sem acesso";
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  return {
    page: safePage,
    totalPages,
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize)
  };
}

function Pagination({
  page,
  totalItems,
  totalPages,
  onNext,
  onPrevious
}: {
  page: number;
  totalItems: number;
  totalPages: number;
  onNext: () => void;
  onPrevious: () => void;
}) {
  if (totalItems === 0) return null;
  return (
    <div className="pagination-row" aria-label="Paginacao">
      <span>
        Pagina {page} de {totalPages} - {totalItems} registros
      </span>
      <div>
        <button className="secondary-action" disabled={page <= 1} onClick={onPrevious} type="button">
          Anterior
        </button>
        <button className="secondary-action" disabled={page >= totalPages} onClick={onNext} type="button">
          Proxima
        </button>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponivel";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponivel";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const [, payload] = result.split(",");
      resolve(payload ?? result);
    };
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.readAsDataURL(file);
  });
}

const statusLabels: Record<LawyerStatus, string> = {
  draft: "Rascunho",
  pending_review: "Revisao",
  approved: "Aprovado",
  rejected: "Rejeitado",
  suspended: "Suspenso"
};

const statusOptions = Object.entries(statusLabels) as Array<[LawyerStatus, string]>;

const roleLabels: Record<AdminUserRecord["role"], string> = {
  admin: "Admin",
  client: "Cliente",
  lawyer: "Advogado"
};

function FirstAccessPage() {
  const invite = useMemo(() => readInviteHash(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(() => {
    if (invite.errorCode) {
      return {
        kind: "error",
        message:
          invite.errorCode === "otp_expired"
            ? "Este convite expirou. Solicite ao administrador um novo convite de acesso."
            : invite.errorDescription || "Convite invalido. Solicite um novo acesso ao administrador."
      };
    }
    if (!invite.accessToken) {
      return { kind: "error", message: "Link de convite incompleto. Abra o link mais recente recebido por e-mail." };
    }
    return { kind: "info", message: "Defina uma senha para acessar o painel do advogado no aplicativo." };
  });
  const [isSaving, setIsSaving] = useState(false);

  async function handleFirstAccess(event: FormEvent) {
    event.preventDefault();
    if (!invite.accessToken) {
      setFeedback({ kind: "error", message: "Link de convite invalido ou expirado." });
      return;
    }
    if (password.length < 8) {
      setFeedback({ kind: "error", message: "Use uma senha com pelo menos 8 caracteres." });
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({ kind: "error", message: "As senhas nao conferem." });
      return;
    }

    setIsSaving(true);
    setFeedback({ kind: "info", message: "Salvando senha com seguranca..." });
    try {
      await changePasswordWithInviteToken(invite.accessToken, password);
      window.history.replaceState(null, "", "/primeiro-acesso");
      setPassword("");
      setConfirmPassword("");
      setFeedback({ kind: "success", message: "Senha definida. Agora entre no aplicativo com seu e-mail e nova senha." });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Nao foi possivel definir a senha.";
      setFeedback({ kind: "error", message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-view" aria-label="Primeiro acesso do advogado">
        <form className="panel login-panel" onSubmit={handleFirstAccess}>
          <img alt="Advogado 2.0" className="login-logo" src={logo} />
          <div>
            <p className="eyebrow">Advogado</p>
            <h1>Primeiro acesso</h1>
          </div>

          <label className="field">
            <span>Nova senha</span>
            <input
              autoComplete="new-password"
              disabled={isSaving || !invite.accessToken || Boolean(invite.errorCode)}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          <label className="field">
            <span>Confirmar senha</span>
            <input
              autoComplete="new-password"
              disabled={isSaving || !invite.accessToken || Boolean(invite.errorCode)}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </label>

          <button disabled={isSaving || !invite.accessToken || Boolean(invite.errorCode)} type="submit">
            {isSaving ? "Salvando" : "Definir senha"}
          </button>

          {feedback.message ? <p className={`feedback ${feedback.kind}`}>{feedback.message}</p> : null}
        </form>
      </section>
    </main>
  );
}

export function App() {
  if (window.location.pathname === "/primeiro-acesso") {
    return <FirstAccessPage />;
  }

  const [session, setSession] = useState<AdminSession | null>(() => loadStoredSession());
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authFeedback, setAuthFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(session));
  const [areas, setAreas] = useState<LegalArea[]>([]);
  const [lawyers, setLawyers] = useState<LawyerRecord[]>([]);
  const [states, setStates] = useState<StateRecord[]>([]);
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [stateDraft, setStateDraft] = useState({ code: "", name: "" });
  const [cityDraft, setCityDraft] = useState({ stateId: "", name: "" });
  const [locationsFeedback, setLocationsFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);
  const [lawyerSearch, setLawyerSearch] = useState("");
  const [lawyerStatusFilter, setLawyerStatusFilter] = useState<"all" | LawyerStatus>("all");
  const [lawyersFeedback, setLawyersFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isLoadingLawyers, setIsLoadingLawyers] = useState(false);
  const [isUpdatingLawyer, setIsUpdatingLawyer] = useState(false);
  const [invitingLawyerId, setInvitingLawyerId] = useState<string | null>(null);
  const [editingLawyerId, setEditingLawyerId] = useState<string | null>(null);
  const [lawyerPage, setLawyerPage] = useState(1);
  const [lawyersLoadedAt, setLawyersLoadedAt] = useState(0);
  const [prayerRequests, setPrayerRequests] = useState<AdminPrayerRequest[]>([]);
  const [prayerStatusFilter, setPrayerStatusFilter] = useState<"all" | AdminPrayerRequest["status"]>("all");
  const [prayersFeedback, setPrayersFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isLoadingPrayers, setIsLoadingPrayers] = useState(false);
  const [updatingPrayerId, setUpdatingPrayerId] = useState<string | null>(null);
  const [prayerPage, setPrayerPage] = useState(1);
  const [prayersLoadedAt, setPrayersLoadedAt] = useState(0);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [usersFeedback, setUsersFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [usersLoadedAt, setUsersLoadedAt] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState<"avatar" | "cover" | null>(null);
  const [partners, setPartners] = useState<PartnerLogoRecord[]>([]);
  const [partnerForm, setPartnerForm] = useState<PartnerLogoFormState>(emptyPartnerLogoForm);
  const [partnersFeedback, setPartnersFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [isSavingPartner, setIsSavingPartner] = useState(false);
  const [isUploadingPartnerLogo, setIsUploadingPartnerLogo] = useState(false);
  const [form, setForm] = useState<LawyerFormState>(emptyLawyerForm);
  const [address, setAddress] = useState<CepAddress | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodeRequestRef = useRef(0);
  const [isSaving, setIsSaving] = useState(false);
  const token = session?.accessToken ?? "";

  useEffect(() => {
    fetchAreas()
      .then((items) => {
        setAreas(items);
        setForm((current) => ({ ...current, mainAreaId: current.mainAreaId || items[0]?.id || "" }));
      })
      .catch(() => {
        setFeedback({ kind: "error", message: "Nao foi possivel carregar as areas juridicas." });
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setIsCheckingSession(false);
      if (window.location.pathname !== "/login") {
        window.history.replaceState(null, "", "/login");
      }
      return;
    }

    fetchCurrentUser(session.accessToken)
      .then((user) => {
        if (cancelled) return;
        if (user.role !== "admin") {
          clearStoredSession();
          setSession(null);
          setAuthFeedback({ kind: "error", message: "Sessao sem permissao admin." });
          return;
        }
        const refreshed = { ...session, user };
        setSession(refreshed);
        storeSession(refreshed);
        if (window.location.pathname === "/login") {
          window.history.replaceState(null, "", "/");
        }
      })
      .catch(() => {
        if (cancelled) return;
        clearStoredSession();
        setSession(null);
        setAuthFeedback({ kind: "error", message: "Sessao expirada. Entre novamente." });
      })
      .finally(() => {
        if (!cancelled) setIsCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = useMemo(() => {
    if (!session) return false;
    if (editingLawyerId) return true;
    return Boolean(
      form.name &&
        form.email &&
        form.whatsapp &&
        form.oabNumber &&
        form.oabState &&
        form.mainAreaId &&
        form.serviceStateId &&
        form.serviceCityId &&
        form.officeCep &&
        form.officeNumber &&
        form.officeManualLat &&
        form.officeManualLng
    );
  }, [form, session]);

  const formCities = useMemo(
    () => cities.filter((city) => city.active && city.stateId === form.serviceStateId),
    [cities, form.serviceStateId]
  );

  const areaById = useMemo(() => new Map(areas.map((area) => [area.id, area.name])), [areas]);

  const filteredLawyers = useMemo(() => {
    const query = lawyerSearch.trim().toLowerCase();
    return lawyers.filter((lawyer) => {
      const statusMatches = lawyerStatusFilter === "all" || lawyer.status === lawyerStatusFilter;
      const searchMatches =
        !query ||
        [lawyer.name, lawyer.oabNumber, lawyer.oabState, lawyer.officeCity, lawyer.officeState]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return statusMatches && searchMatches;
    });
  }, [lawyers, lawyerSearch, lawyerStatusFilter]);

  const selectedLawyer = useMemo(
    () => lawyers.find((lawyer) => lawyer.id === selectedLawyerId) ?? filteredLawyers[0] ?? null,
    [filteredLawyers, lawyers, selectedLawyerId]
  );

  const pagedLawyers = useMemo(
    () => paginate(filteredLawyers, lawyerPage, LAWYERS_PAGE_SIZE),
    [filteredLawyers, lawyerPage]
  );

  const filteredPrayerRequests = useMemo(
    () =>
      prayerRequests.filter((request) => {
        return prayerStatusFilter === "all" || request.status === prayerStatusFilter;
      }),
    [prayerRequests, prayerStatusFilter]
  );

  const pagedPrayerRequests = useMemo(
    () => paginate(filteredPrayerRequests, prayerPage, PRAYERS_PAGE_SIZE),
    [filteredPrayerRequests, prayerPage]
  );

  const prayerStats = useMemo(() => {
    const unread = prayerRequests.filter((request) => request.status === "received").length;
    const read = prayerRequests.length - unread;
    return { unread, read, total: prayerRequests.length };
  }, [prayerRequests]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      if (!query) return true;
      return [user.name, user.email, user.role, user.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [users, userSearch]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null,
    [filteredUsers, users, selectedUserId]
  );

  const pagedUsers = useMemo(
    () => paginate(filteredUsers, userPage, USERS_PAGE_SIZE),
    [filteredUsers, userPage]
  );

  useEffect(() => {
    setLawyerPage(1);
  }, [lawyerSearch, lawyerStatusFilter]);

  useEffect(() => {
    setPrayerPage(1);
  }, [prayerStatusFilter]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch]);

  useEffect(() => {
    if (activeView === "lawyers" && session && lawyers.length === 0 && !isLoadingLawyers) {
      void handleLoadLawyers();
    }
  }, [activeView, session]);

  useEffect(() => {
    if (activeView === "prayers" && session && prayerRequests.length === 0 && !isLoadingPrayers) {
      void handleLoadPrayerRequests();
    }
    if (activeView === "users" && session && users.length === 0 && !isLoadingUsers) {
      void handleLoadUsers();
    }
    if (activeView === "partners" && session && partners.length === 0 && !isLoadingPartners) {
      void handleLoadPartnerLogos();
    }
    if ((activeView === "locations" || activeView === "newLawyer") && session && states.length === 0) {
      void handleLoadLocations();
    }
  }, [activeView, session]);

  async function handleLoadLocations() {
    if (!token) return;
    try {
      const [nextStates, nextCities] = await Promise.all([fetchAdminStates(token), fetchAdminCities(token)]);
      setStates(nextStates);
      setCities(nextCities);
      setCityDraft((current) => ({ ...current, stateId: current.stateId || nextStates[0]?.id || "" }));
      setLocationsFeedback({ kind: "success", message: "Catalogo de localidades atualizado." });
    } catch (error) {
      setLocationsFeedback({
        kind: "error",
        message: error instanceof AdminApiError ? error.message : "Falha ao carregar localidades."
      });
    }
  }

  async function handleLoadLawyers(force = false) {
    if (!token) {
      setLawyersFeedback({ kind: "error", message: "Entre como admin antes de listar advogados." });
      return;
    }
    if (!force && lawyers.length > 0 && Date.now() - lawyersLoadedAt < CACHE_TTL_MS) {
      setLawyersFeedback({ kind: "success", message: "Listagem restaurada do cache da sessao." });
      return;
    }

    setIsLoadingLawyers(true);
    setLawyersFeedback({ kind: "info", message: "Carregando advogados pelo backend..." });
    try {
      const response = await fetchLawyers(token);
      setLawyers(response.lawyers);
      setLawyersLoadedAt(Date.now());
      setSelectedLawyerId((current) => current ?? response.lawyers[0]?.id ?? null);
      setLawyersFeedback({
        kind: response.lawyers.length ? "success" : "info",
        message: response.lawyers.length
          ? `Listagem carregada via ${response.persistence}.`
          : "Nenhum advogado cadastrado ainda."
      });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao listar advogados.";
      setLawyersFeedback({ kind: "error", message });
    } finally {
      setIsLoadingLawyers(false);
    }
  }

  async function handleLoadPrayerRequests(force = false) {
    if (!token) {
      setPrayersFeedback({ kind: "error", message: "Entre como admin antes de listar pedidos." });
      return;
    }
    if (!force && prayerRequests.length > 0 && Date.now() - prayersLoadedAt < CACHE_TTL_MS) {
      setPrayersFeedback({ kind: "success", message: "Pedidos restaurados do cache da sessao." });
      return;
    }

    setIsLoadingPrayers(true);
    setPrayersFeedback({ kind: "info", message: "Carregando pedidos de oracao..." });
    try {
      const response = await fetchPrayerRequests(token);
      setPrayerRequests(response.requests);
      setPrayersLoadedAt(Date.now());
      setPrayersFeedback({
        kind: response.requests.length ? "success" : "info",
        message: response.requests.length
          ? `Pedidos carregados via ${response.persistence}.`
          : "Nenhum pedido de oracao recebido ainda."
      });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao listar pedidos de oracao.";
      setPrayersFeedback({ kind: "error", message });
    } finally {
      setIsLoadingPrayers(false);
    }
  }

  async function handleLoadUsers(force = false) {
    if (!token) {
      setUsersFeedback({ kind: "error", message: "Entre como admin antes de listar usuarios." });
      return;
    }
    if (!force && users.length > 0 && Date.now() - usersLoadedAt < CACHE_TTL_MS) {
      setUsersFeedback({ kind: "success", message: "Usuarios restaurados do cache da sessao." });
      return;
    }

    setIsLoadingUsers(true);
    setUsersFeedback({ kind: "info", message: "Carregando usuarios cadastrados..." });
    try {
      const response = await fetchAdminUsers(token);
      setUsers(response.users);
      setUsersLoadedAt(Date.now());
      setSelectedUserId((current) => current ?? response.users[0]?.id ?? null);
      setUsersFeedback({
        kind: response.users.length ? "success" : "info",
        message: response.users.length ? `Usuarios carregados via ${response.persistence}.` : "Nenhum usuario cadastrado."
      });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao listar usuarios.";
      setUsersFeedback({ kind: "error", message });
    } finally {
      setIsLoadingUsers(false);
    }
  }

  async function handleLoadPartnerLogos() {
    if (!token) {
      setPartnersFeedback({ kind: "error", message: "Entre como admin antes de listar parceiros." });
      return;
    }

    setIsLoadingPartners(true);
    setPartnersFeedback({ kind: "info", message: "Carregando logos de parceiros..." });
    try {
      const response = await fetchPartnerLogos(token);
      setPartners(response.partners);
      setPartnersFeedback({
        kind: response.partners.length ? "success" : "info",
        message: response.partners.length
          ? `Parceiros carregados via ${response.persistence}.`
          : "Nenhum parceiro cadastrado ainda."
      });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao listar parceiros.";
      setPartnersFeedback({ kind: "error", message });
    } finally {
      setIsLoadingPartners(false);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setIsLoggingIn(true);
    setAuthFeedback({ kind: "info", message: "Validando acesso admin..." });
    try {
      const nextSession = await loginAdmin(loginEmail, loginPassword);
      storeSession(nextSession);
      setSession(nextSession);
      setLoginPassword("");
      setAuthFeedback({ kind: "success", message: "Sessao admin iniciada." });
      window.history.replaceState(null, "", "/");
    } catch (error) {
      clearStoredSession();
      const message = error instanceof AdminApiError ? error.message : "Falha ao entrar.";
      setAuthFeedback({ kind: "error", message });
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    clearStoredSession();
    setSession(null);
    setFeedback({ kind: "idle", message: "" });
    setAuthFeedback({ kind: "info", message: "Sessao encerrada." });
    window.history.replaceState(null, "", "/login");
  }

  function Icon({ name }: { name: AdminView }) {
    const paths: Record<AdminView, string> = {
      dashboard: "M4 5h7v7H4V5Zm9 0h7v4h-7V5ZM4 14h7v5H4v-5Zm9-3h7v8h-7v-8Z",
      lawyers:
        "M8 11a4 4 0 1 1 3.2-1.6A5.8 5.8 0 0 0 8 11Zm0 2c3.3 0 6 1.7 6 3.8V19H2v-2.2C2 14.7 4.7 13 8 13Zm9-1a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm-2 2.2c.6-.1 1.3-.2 2-.2 2.8 0 5 1.3 5 3v2h-6v-2.2c0-1-.4-1.9-1-2.6Z",
      newLawyer:
        "M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z",
      prayers:
        "M12 21s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.7-7 10-7 10Zm-1-16h2v3h-2V5Zm0-3h2v2h-2V2Z",
      users:
        "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8c0-3 3.6-5 8-5s8 2 8 5v1H4v-1Zm15-8 3 3-3 3-1.4-1.4.6-.6H16v-2h2.2l-.6-.6L19 12Z",
      partners:
        "M4 5h16v10H4V5Zm2 2v8h12V7H6Zm1 10h10v2H7v-2Zm11.5-2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM8 9.5 10.2 12l2.1-2.6L16 14H6l2-4.5Z",
      operation:
        "M12 2 3 6v6c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V6l-9-4Zm0 3.2 6 2.7V12c0 3.8-2.5 7.2-6 8.4-3.5-1.2-6-4.6-6-8.4V7.9l6-2.7Z"
      ,
      locations:
        "M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"
    };

    return (
      <svg aria-hidden="true" className="nav-icon" viewBox="0 0 24 24">
        <path d={paths[name]} />
      </svg>
    );
  }

  const navItems: Array<{ view: AdminView; label: string }> = [
    { view: "dashboard", label: "Dashboard" },
    { view: "lawyers", label: "Advogados" },
    { view: "newLawyer", label: "Novo Advogado" },
    { view: "locations", label: "Estados e Cidades" },
    { view: "prayers", label: "Oracoes" },
    { view: "users", label: "Usuarios" },
    { view: "partners", label: "Parceiros" },
    { view: "operation", label: "Operacao" }
  ];

  function updateForm(field: Exclude<keyof LawyerFormState, "secondaryAreaIds">, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "mainAreaId" ? { secondaryAreaIds: current.secondaryAreaIds.filter((areaId) => areaId !== value) } : {})
      ,...(field === "serviceStateId" ? { serviceCityId: "" } : {})
    }));
    if (field === "officeCep") {
      setAddress(null);
      setCoordinates(null);
      setForm((current) => ({ ...current, officeManualLat: "", officeManualLng: "" }));
    }
    if (field === "officeNumber") {
      setCoordinates(null);
      setForm((current) => ({ ...current, officeManualLat: "", officeManualLng: "" }));
    }
  }

  function updateManualLocation(lat: string, lng: string) {
    setForm((current) => ({
      ...current,
      officeManualLat: lat,
      officeManualLng: lng
    }));
  }

  function toggleSecondaryArea(areaId: string, checked: boolean) {
    setForm((current) => {
      if (areaId === current.mainAreaId) return current;
      const next = checked
        ? [...new Set([...current.secondaryAreaIds, areaId])]
        : current.secondaryAreaIds.filter((currentAreaId) => currentAreaId !== areaId);
      return { ...current, secondaryAreaIds: next };
    });
  }

  function updatePartnerForm(field: keyof PartnerLogoFormState, value: string | boolean) {
    setPartnerForm((current) => ({ ...current, [field]: value }));
  }

  function startNewLawyer() {
    setEditingLawyerId(null);
    setForm((current) => ({ ...emptyLawyerForm, mainAreaId: current.mainAreaId || areas[0]?.id || "" }));
    setAddress(null);
    setCoordinates(null);
    setFeedback({ kind: "idle", message: "" });
    setActiveView("newLawyer");
  }

  function startEditLawyer(lawyer: LawyerRecord) {
    setEditingLawyerId(lawyer.id);
    setSelectedLawyerId(lawyer.id);
    const city = cities.find((item) => item.id === lawyer.serviceCityId);
    setForm({ ...lawyerToForm(lawyer), serviceStateId: city?.stateId ?? "" });
    setAddress(
      lawyer.officeCity || lawyer.officeState
        ? {
            cep: lawyer.officeCep,
            street: "",
            neighborhood: "",
            city: lawyer.officeCity ?? "",
            state: lawyer.officeState ?? ""
          }
        : null
    );
    setCoordinates(
      typeof lawyer.officeLat === "number" && typeof lawyer.officeLng === "number"
        ? {
            lat: lawyer.officeLat,
            lng: lawyer.officeLng,
            provider: lawyer.officeGeocodeProvider ?? "nominatim",
            precision: lawyer.officeGeocodePrecision ?? "cep_centroid",
            confidence: lawyer.officeGeocodeConfidence ?? "medium"
          }
        : null
    );
    setFeedback({ kind: "info", message: "Edicao carregada. Alterar o CEP revalida a localizacao pelo backend." });
    setActiveView("newLawyer");
  }

  async function handleCreateState(event: FormEvent) {
    event.preventDefault();
    if (!token || !stateDraft.code.trim() || !stateDraft.name.trim()) return;
    try {
      await createAdminState(token, { ...stateDraft, active: true });
      setStateDraft({ code: "", name: "" });
      await handleLoadLocations();
    } catch (error) {
      setLocationsFeedback({ kind: "error", message: error instanceof AdminApiError ? error.message : "Falha ao criar estado." });
    }
  }

  async function handleCreateCity(event: FormEvent) {
    event.preventDefault();
    if (!token || !cityDraft.stateId || !cityDraft.name.trim()) {
      setLocationsFeedback({ kind: "error", message: "Informe estado e cidade." });
      return;
    }
    try {
      await createAdminCity(token, { stateId: cityDraft.stateId, name: cityDraft.name, active: true });
      setCityDraft((current) => ({ ...current, name: "" }));
      await handleLoadLocations();
    } catch (error) {
      setLocationsFeedback({ kind: "error", message: error instanceof AdminApiError ? error.message : "Falha ao criar cidade." });
    }
  }

  async function toggleState(state: StateRecord) {
    await updateAdminState(token, state.id, { active: !state.active });
    await handleLoadLocations();
  }

  async function toggleCity(city: CityRecord) {
    await updateAdminCity(token, city.id, { active: !city.active });
    await handleLoadLocations();
  }

  function handleNavigate(view: AdminView) {
    if (view === "newLawyer") {
      startNewLawyer();
      return;
    }
    setActiveView(view);
  }

  async function handleGeocode() {
    if (!token) {
      setFeedback({ kind: "error", message: "Entre como admin antes de consultar CEP." });
      return;
    }

    const requestId = ++geocodeRequestRef.current;
    setIsGeocoding(true);
    setFeedback({ kind: "info", message: "Consultando CEP pelo backend..." });
    try {
      const result = await geocodeCep(token, form.officeCep, form.officeNumber);
      if (requestId !== geocodeRequestRef.current) return;
      setAddress(result.address);
      setCoordinates(result.coordinates);
      setForm((current) => ({
        ...current,
        officeManualLat: result.coordinates ? result.coordinates.lat.toFixed(6) : "",
        officeManualLng: result.coordinates ? result.coordinates.lng.toFixed(6) : ""
      }));
      setFeedback({
        kind: result.coordinates ? "success" : "info",
        message: result.note ?? "CEP normalizado pelo backend."
      });
    } catch (error) {
      if (requestId !== geocodeRequestRef.current) return;
      const message = error instanceof AdminApiError ? error.message : "Falha ao consultar CEP.";
      setFeedback({ kind: "error", message });
    } finally {
      if (requestId === geocodeRequestRef.current) setIsGeocoding(false);
    }
  }

  useEffect(() => {
    if (!token || activeView !== "newLawyer" || form.officeCep.replace(/\D/g, "").length !== 8) return;
    const timer = window.setTimeout(() => void handleGeocode(), 500);
    return () => {
      window.clearTimeout(timer);
      geocodeRequestRef.current += 1;
    };
  }, [activeView, form.officeCep, form.officeNumber, token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      setFeedback({ kind: "error", message: "Preencha os campos obrigatorios antes de salvar." });
      return;
    }
    const manualLocationFilled = Boolean(form.officeManualLat.trim() || form.officeManualLng.trim());
    if (manualLocationFilled) {
      const lat = Number(form.officeManualLat.trim().replace(",", "."));
      const lng = Number(form.officeManualLng.trim().replace(",", "."));
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setFeedback({ kind: "error", message: "Informe latitude e longitude confirmadas validas." });
        return;
      }
    }

    setIsSaving(true);
    setFeedback({ kind: "info", message: editingLawyerId ? "Atualizando advogado pelo backend..." : "Salvando advogado pelo backend..." });
    try {
      const originalLawyer = editingLawyerId ? lawyers.find((lawyer) => lawyer.id === editingLawyerId) : undefined;
      const response = editingLawyerId ? await updateLawyer(token, editingLawyerId, form, originalLawyer) : await createLawyer(token, form);
      const createdAccess = !editingLawyerId
        ? (response as { access?: { status?: string } }).access
        : undefined;
      setFeedback({
        kind: "success",
        message: editingLawyerId
          ? "Advogado atualizado."
          : createdAccess?.status === "invited"
            ? "Advogado salvo e convite de acesso enviado por e-mail."
            : "Advogado salvo. Se aprovado, ja entra elegivel para match com coordenada valida."
      });
      if ("lawyer" in response) {
        setLawyers((current) => {
          const exists = current.some((item) => item.id === response.lawyer.id);
          return exists ? current.map((item) => (item.id === response.lawyer.id ? response.lawyer : item)) : [response.lawyer, ...current];
        });
        setLawyersLoadedAt(Date.now());
        setSelectedLawyerId(response.lawyer.id);
      }
      setEditingLawyerId(null);
      setForm((current) => ({ ...emptyLawyerForm, mainAreaId: current.mainAreaId || areas[0]?.id || "" }));
      setAddress(null);
      setCoordinates(null);
      if (lawyers.length > 0 || activeView === "newLawyer") {
        void handleLoadLawyers(true);
      }
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao salvar advogado.";
      setFeedback({ kind: "error", message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInviteLawyerAccess(lawyer: LawyerRecord) {
    if (!token) {
      setLawyersFeedback({ kind: "error", message: "Entre como admin antes de ativar acesso." });
      return;
    }

    setInvitingLawyerId(lawyer.id);
    setLawyersFeedback({ kind: "info", message: "Enviando convite de primeiro acesso..." });
    try {
      const response = await inviteLawyerAccess(token, lawyer.id);
      setLawyers((current) => current.map((item) => (item.id === response.lawyer.id ? response.lawyer : item)));
      setSelectedLawyerId(response.lawyer.id);
      setLawyersLoadedAt(Date.now());
      setLawyersFeedback({
        kind: "success",
        message:
          response.access.delivery === "simulated"
            ? "Convite de acesso simulado no ambiente local."
            : "Convite de acesso enviado por e-mail."
      });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao ativar acesso.";
      setLawyersFeedback({ kind: "error", message });
    } finally {
      setInvitingLawyerId(null);
    }
  }

  async function handleImageUpload(kind: "avatar" | "cover", file: File | null) {
    if (!file) return;
    if (!token) {
      setFeedback({ kind: "error", message: "Entre como admin antes de enviar imagem." });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback({ kind: "error", message: "Use JPG, PNG ou WebP." });
      return;
    }
    if (file.size > 2_000_000) {
      setFeedback({ kind: "error", message: "Imagem deve ter no maximo 2MB." });
      return;
    }

    setIsUploadingImage(kind);
    setFeedback({ kind: "info", message: kind === "avatar" ? "Enviando foto de perfil..." : "Enviando foto de capa..." });
    try {
      const base64Data = await fileToBase64(file);
      const response = await uploadLawyerImage(token, {
        kind,
        fileName: file.name,
        mimeType: file.type,
        base64Data
      });
      updateForm(kind === "avatar" ? "avatarUrl" : "coverUrl", response.image.url);
      setFeedback({ kind: "success", message: "Imagem enviada e pronta para salvar no perfil." });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao enviar imagem.";
      setFeedback({ kind: "error", message });
    } finally {
      setIsUploadingImage(null);
    }
  }

  async function handlePartnerLogoUpload(file: File | null) {
    if (!file) return;
    if (!token) {
      setPartnersFeedback({ kind: "error", message: "Entre como admin antes de enviar logo." });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPartnersFeedback({ kind: "error", message: "Use JPG, PNG ou WebP." });
      return;
    }
    if (file.size > 2_000_000) {
      setPartnersFeedback({ kind: "error", message: "Logo deve ter no maximo 2MB." });
      return;
    }

    setIsUploadingPartnerLogo(true);
    setPartnersFeedback({ kind: "info", message: "Enviando logo do parceiro..." });
    try {
      const base64Data = await fileToBase64(file);
      const response = await uploadPartnerLogo(token, {
        fileName: file.name,
        mimeType: file.type,
        base64Data
      });
      updatePartnerForm("logoUrl", response.image.url);
      setPartnersFeedback({ kind: "success", message: "Logo enviada. Confira a renderizacao antes de salvar." });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao enviar logo.";
      setPartnersFeedback({ kind: "error", message });
    } finally {
      setIsUploadingPartnerLogo(false);
    }
  }

  async function handlePartnerSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setPartnersFeedback({ kind: "error", message: "Entre como admin antes de salvar parceiro." });
      return;
    }
    if (!partnerForm.name.trim() || !partnerForm.logoUrl.trim()) {
      setPartnersFeedback({ kind: "error", message: "Informe nome e logo do parceiro antes de salvar." });
      return;
    }

    setIsSavingPartner(true);
    setPartnersFeedback({ kind: "info", message: "Salvando parceiro..." });
    try {
      const response = await createPartnerLogo(token, partnerForm);
      setPartners((current) => [response.partner, ...current]);
      setPartnerForm(emptyPartnerLogoForm);
      setPartnersFeedback({ kind: "success", message: "Parceiro salvo com logo renderizada no painel." });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao salvar parceiro.";
      setPartnersFeedback({ kind: "error", message });
    } finally {
      setIsSavingPartner(false);
    }
  }

  async function handlePrayerStatusChange(request: AdminPrayerRequest, status: AdminPrayerRequest["status"]) {
    if (!token) {
      setPrayersFeedback({ kind: "error", message: "Entre como admin antes de atualizar a oracao." });
      return;
    }

    setUpdatingPrayerId(request.id);
    setPrayersFeedback({ kind: "info", message: status === "read" ? "Marcando oracao como lida..." : "Reabrindo leitura..." });
    try {
      const response = await updatePrayerRequestStatus(token, request.id, status);
      setPrayerRequests((current) => current.map((item) => (item.id === response.request.id ? response.request : item)));
      setPrayersLoadedAt(Date.now());
      setPrayersFeedback({ kind: "success", message: status === "read" ? "Oracao marcada como lida." : "Oracao voltou para recebida." });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao atualizar oracao.";
      setPrayersFeedback({ kind: "error", message });
    } finally {
      setUpdatingPrayerId(null);
    }
  }

  async function handleStatusChange(lawyer: LawyerRecord, status: LawyerStatus) {
    if (!token) {
      setLawyersFeedback({ kind: "error", message: "Entre como admin antes de atualizar status." });
      return;
    }

    setIsUpdatingLawyer(true);
    setLawyersFeedback({ kind: "info", message: "Atualizando status pelo backend..." });
    try {
      const response = await updateLawyerStatus(token, lawyer.id, status);
      setLawyers((current) => current.map((item) => (item.id === response.lawyer.id ? response.lawyer : item)));
      setLawyersLoadedAt(Date.now());
      setSelectedLawyerId(response.lawyer.id);
      setLawyersFeedback({ kind: "success", message: "Status atualizado com regra de coordenada preservada." });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao atualizar status.";
      setLawyersFeedback({ kind: "error", message });
    } finally {
      setIsUpdatingLawyer(false);
    }
  }

  async function handleUserBlockedChange(user: AdminUserRecord, blocked: boolean) {
    if (!token) {
      setUsersFeedback({ kind: "error", message: "Entre como admin antes de atualizar usuario." });
      return;
    }

    setIsUpdatingUser(true);
    setUsersFeedback({ kind: "info", message: blocked ? "Bloqueando usuario..." : "Desbloqueando usuario..." });
    try {
      const response = await updateAdminUserBlocked(token, user.id, blocked);
      setUsers((current) => current.map((item) => (item.id === response.user.id ? response.user : item)));
      setUsersLoadedAt(Date.now());
      setSelectedUserId(response.user.id);
      setUsersFeedback({ kind: "success", message: blocked ? "Usuario bloqueado." : "Usuario desbloqueado." });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao atualizar usuario.";
      setUsersFeedback({ kind: "error", message });
    } finally {
      setIsUpdatingUser(false);
    }
  }

  if (!session || isCheckingSession) {
    return (
      <main className="login-shell">
        <section className="login-view" aria-label="Login administrativo">
          <form className="panel login-panel" onSubmit={handleLogin}>
            <img alt="Advogado 2.0" className="login-logo" src={logo} />
            <div>
              <p className="eyebrow">Admin</p>
              <h1>Acesso administrativo</h1>
            </div>

            <label className="field">
              <span>Email</span>
              <input
                autoComplete="username"
                disabled={isCheckingSession}
                onChange={(event) => setLoginEmail(event.target.value)}
                type="email"
                value={loginEmail}
              />
            </label>

            <label className="field">
              <span>Senha</span>
              <input
                autoComplete="current-password"
                disabled={isCheckingSession}
                onChange={(event) => setLoginPassword(event.target.value)}
                type="password"
                value={loginPassword}
              />
            </label>

            <button disabled={isCheckingSession || isLoggingIn || !loginEmail || !loginPassword} type="submit">
              {isCheckingSession ? "Validando sessao" : isLoggingIn ? "Entrando" : "Entrar"}
            </button>

            {authFeedback.message ? <p className={`feedback ${authFeedback.kind}`}>{authFeedback.message}</p> : null}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar" aria-label="Navegacao administrativa">
        <div className="sidebar-brand">
          <img alt="Advogado 2.0" className="sidebar-logo" src={logo} />
          <strong>Advogado 2.0</strong>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              className={`nav-button ${activeView === item.view ? "active" : ""}`}
              key={item.view}
              onClick={() => handleNavigate(item.view)}
              type="button"
            >
              <Icon name={item.view} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-health">
          <span className="health-dot" aria-hidden="true" />
          <span>Servidor: 100% Online</span>
        </div>
      </aside>

      <section className="content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Painel administrativo</p>
            <h1>{navItems.find((item) => item.view === activeView)?.label}</h1>
            <p className="session-label">{session.user.email ?? "admin"} - role admin</p>
          </div>
          <div className="header-actions">
            <button className="header-action" onClick={startNewLawyer} type="button">
              Novo advogado
            </button>
            <button className="secondary-action" onClick={handleLogout} type="button">
              Sair
            </button>
          </div>
        </header>

        {activeView === "dashboard" ? <section className="kpi-grid" aria-label="Indicadores administrativos">
          {kpis.map((kpi) => (
            <article className="kpi" key={kpi.label}>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.helper}</small>
            </article>
          ))}
        </section> : null}

        {activeView === "lawyers" ? (
          <section className="lawyers-workspace" aria-label="Gestao operacional de advogados">
            <section className="panel table-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Advogados</p>
                  <h2>Gestao operacional</h2>
                </div>
                <div className="toolbar-actions">
                  <button className="secondary-action" disabled={isLoadingLawyers} onClick={() => void handleLoadLawyers(true)} type="button">
                    {isLoadingLawyers ? "Atualizando" : "Atualizar"}
                  </button>
                  <button className="header-action" onClick={startNewLawyer} type="button">
                    Novo advogado
                  </button>
                </div>
              </div>

              <div className="filters-row" aria-label="Filtros de advogados">
                <label className="field">
                  <span>Busca</span>
                  <input
                    placeholder="Nome, OAB, cidade ou UF"
                    value={lawyerSearch}
                    onChange={(event) => setLawyerSearch(event.target.value)}
                  />
                </label>
                <label className="field compact-filter">
                  <span>Status</span>
                  <select
                    value={lawyerStatusFilter}
                    onChange={(event) => setLawyerStatusFilter(event.target.value as "all" | LawyerStatus)}
                  >
                    <option value="all">Todos</option>
                    {statusOptions.map(([status, label]) => (
                      <option key={status} value={status}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {lawyersFeedback.message ? <p className={`feedback ${lawyersFeedback.kind}`}>{lawyersFeedback.message}</p> : null}

              <div className="lawyers-list" role="list" aria-busy={isLoadingLawyers}>
                {isLoadingLawyers ? <p className="empty-state">Carregando advogados...</p> : null}
                {!isLoadingLawyers && filteredLawyers.length === 0 ? (
                  <p className="empty-state">Nenhum advogado encontrado para os filtros atuais.</p>
                ) : null}
                {!isLoadingLawyers
                  ? pagedLawyers.items.map((lawyer) => (
                      <button
                        className={`lawyer-row ${selectedLawyer?.id === lawyer.id ? "selected" : ""}`}
                        key={lawyer.id}
                        onClick={() => setSelectedLawyerId(lawyer.id)}
                        type="button"
                        role="listitem"
                      >
                        <span className={`status-dot ${lawyer.status}`} aria-hidden="true" />
                        <span className="avatar-mini" aria-hidden="true">
                          {lawyer.avatarUrl ? <img alt="" src={lawyer.avatarUrl} /> : initials(lawyer.name)}
                        </span>
                        <span className="lawyer-main">
                          <strong>{lawyer.name}</strong>
                          <small>
                            OAB/{lawyer.oabState} {lawyer.oabNumber}
                          </small>
                        </span>
                        <span className="lawyer-meta">
                          {[lawyer.officeCity, lawyer.officeState].filter(Boolean).join("/")}
                        </span>
                        <span className="status-pill">{statusLabels[lawyer.status]}</span>
                      </button>
                    ))
                  : null}
              </div>
              <Pagination
                page={pagedLawyers.page}
                totalItems={filteredLawyers.length}
                totalPages={pagedLawyers.totalPages}
                onNext={() => setLawyerPage((current) => Math.min(current + 1, pagedLawyers.totalPages))}
                onPrevious={() => setLawyerPage((current) => Math.max(current - 1, 1))}
              />
            </section>

            <aside className="panel detail-panel" aria-label="Detalhe seguro do advogado">
              {selectedLawyer ? (
                <>
                  <div>
                    <p className="eyebrow">Detalhe</p>
                    <h2>{selectedLawyer.name}</h2>
                  </div>

                  <dl>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <select
                          aria-label="Alterar status do advogado"
                          disabled={isUpdatingLawyer}
                          value={selectedLawyer.status}
                          onChange={(event) => handleStatusChange(selectedLawyer, event.target.value as LawyerStatus)}
                        >
                          {statusOptions.map(([status, label]) => (
                            <option key={status} value={status}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </dd>
                    </div>
                    <div>
                      <dt>OAB</dt>
                      <dd>
                        {selectedLawyer.oabNumber}/{selectedLawyer.oabState}
                      </dd>
                    </div>
                    <div>
                      <dt>Area principal</dt>
                      <dd>{areaById.get(selectedLawyer.mainAreaId) ?? selectedLawyer.mainAreaId}</dd>
                    </div>
                    <div>
                      <dt>Especialidades secundarias</dt>
                      <dd>
                        {selectedLawyer.secondaryAreaIds
                          .map((areaId) => areaById.get(areaId) ?? areaId)
                          .join(", ") || "Nao informadas"}
                      </dd>
                    </div>
                    <div>
                      <dt>Cidade/UF</dt>
                      <dd>{[selectedLawyer.officeCity, selectedLawyer.officeState].filter(Boolean).join("/") || "Nao informado"}</dd>
                    </div>
                    <div>
                      <dt>Geocoding</dt>
                      <dd>
                        {formatSafeCoordinateState(selectedLawyer)}
                        {" - "}
                        {formatGeocodeMetadata(selectedLawyer)}
                      </dd>
                    </div>
                    <div>
                      <dt>Acesso</dt>
                      <dd>{formatAccessState(selectedLawyer)}</dd>
                    </div>
                    <div>
                      <dt>Contato administrativo</dt>
                      <dd>{selectedLawyer.email}</dd>
                    </div>
                    <div>
                      <dt>Campos visuais</dt>
                      <dd>
                        {[
                          selectedLawyer.avatarUrl ? "foto" : null,
                          selectedLawyer.coverUrl ? "capa" : null,
                          selectedLawyer.miniBio || selectedLawyer.fullBio ? "bio" : null,
                          selectedLawyer.instagramUrl ||
                          selectedLawyer.linkedinUrl ||
                          selectedLawyer.facebookUrl ||
                          selectedLawyer.websiteUrl
                            ? "redes"
                            : null
                        ]
                          .filter(Boolean)
                          .join(", ") || "Nao preenchidos"}
                      </dd>
                    </div>
                    <div>
                      <dt>Atualizado</dt>
                      <dd>{formatDate(selectedLawyer.updatedAt)}</dd>
                    </div>
                  </dl>

                  <button className="header-action" onClick={() => startEditLawyer(selectedLawyer)} type="button">
                    Editar advogado
                  </button>
                  {selectedLawyer.officeLocationStatus !== "validated" ? (
                    <button className="secondary-action" onClick={() => startEditLawyer(selectedLawyer)} type="button">
                      Confirmar localizacao
                    </button>
                  ) : null}
                  {!selectedLawyer.accessInvitedAt ? (
                    <button
                      className="secondary-action"
                      disabled={invitingLawyerId === selectedLawyer.id}
                      onClick={() => handleInviteLawyerAccess(selectedLawyer)}
                      type="button"
                    >
                      {invitingLawyerId === selectedLawyer.id ? "Enviando convite" : "Ativar acesso"}
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="empty-state">Selecione um advogado para ver detalhes operacionais.</p>
              )}
            </aside>
          </section>
        ) : null}

        {activeView === "locations" ? (
          <section className="workspace" aria-label="Gestao de estados e cidades">
            <div className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Catalogo geografico</p>
                  <h2>Estados e cidades</h2>
                </div>
                <button className="secondary-action" onClick={() => void handleLoadLocations()} type="button">Atualizar</button>
              </div>

              <form className="address-row" onSubmit={handleCreateState}>
                <label className="field compact">
                  <span>UF</span>
                  <input maxLength={2} value={stateDraft.code} onChange={(event) => setStateDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
                </label>
                <label className="field">
                  <span>Estado</span>
                  <input value={stateDraft.name} onChange={(event) => setStateDraft((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <button type="submit">Cadastrar estado</button>
              </form>

              <div className="specialty-options simple-list">
                {states.map((state) => (
                  <button className="secondary-action" key={state.id} onClick={() => void toggleState(state)} type="button">
                    {state.code} - {state.name} ({state.active ? "ativo" : "inativo"})
                  </button>
                ))}
              </div>

              <form className="address-row" onSubmit={handleCreateCity}>
                <label className="field">
                  <span>Estado da cidade</span>
                  <select value={cityDraft.stateId} onChange={(event) => setCityDraft((current) => ({ ...current, stateId: event.target.value }))}>
                    <option value="">Selecione</option>
                    {states.filter((state) => state.active).map((state) => <option key={state.id} value={state.id}>{state.code} - {state.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Cidade</span>
                  <input value={cityDraft.name} onChange={(event) => setCityDraft((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <button type="submit">Cadastrar cidade</button>
              </form>
              <p className="empty-state">As cidades do DF ja ficam pre-cadastradas. Use esta tela apenas para ativar, desativar ou incluir novas cidades.</p>
              {locationsFeedback.message ? <p className={`feedback ${locationsFeedback.kind}`}>{locationsFeedback.message}</p> : null}
            </div>

            <aside className="panel result-panel">
              <p className="eyebrow">Cidades cadastradas</p>
              <h2>{cities.length} registros</h2>
              <div className="specialty-options simple-list">
                {cities.map((city) => (
                  <button className="secondary-action" key={city.id} onClick={() => void toggleCity(city)} type="button">
                    {states.find((state) => state.id === city.stateId)?.code ?? "UF"} - {city.name} ({city.active ? "ativa" : "inativa"})
                  </button>
                ))}
              </div>
            </aside>
          </section>
        ) : null}

        {activeView === "newLawyer" ? <section className="workspace">
          <form className="panel form-panel" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{editingLawyerId ? "Editar advogado" : "Advogado"}</p>
                <h2>{editingLawyerId ? "Atualizar dados operacionais" : "Dados operacionais"}</h2>
              </div>
              <select
                aria-label="Status"
                value={form.status}
                onChange={(event) => updateForm("status", event.target.value)}
              >
                <option value="draft">Rascunho</option>
                <option value="pending_review">Revisao</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Rejeitado</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Nome</span>
                <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
              </label>

              <label className="field">
                <span>Email</span>
                <input value={form.email} onChange={(event) => updateForm("email", event.target.value)} type="email" />
              </label>

              <label className="field">
                <span>WhatsApp</span>
                <input value={form.whatsapp} onChange={(event) => updateForm("whatsapp", event.target.value)} />
              </label>

              <label className="field">
                <span>OAB</span>
                <input value={form.oabNumber} onChange={(event) => updateForm("oabNumber", event.target.value)} />
              </label>

              <label className="field compact">
                <span>UF OAB</span>
                <input
                  maxLength={2}
                  value={form.oabState}
                  onChange={(event) => updateForm("oabState", event.target.value.toUpperCase())}
                />
              </label>

              <label className="field">
                <span>Area principal</span>
                <select value={form.mainAreaId} onChange={(event) => updateForm("mainAreaId", event.target.value)}>
                  {areas.map((area) => (
                    <option value={area.id} key={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="field wide specialty-field">
              <legend>Especialidades secundarias</legend>
              <div className="specialty-options">
                {areas
                  .filter((area) => area.id !== form.mainAreaId)
                  .map((area) => (
                    <label className="specialty-chip" key={area.id}>
                      <input
                        checked={form.secondaryAreaIds.includes(area.id)}
                        onChange={(event) => toggleSecondaryArea(area.id, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{area.name}</span>
                    </label>
                  ))}
              </div>
            </fieldset>

            <div className="form-grid">
              <label className="field">
                <span>Estado de atendimento</span>
                <select value={form.serviceStateId} onChange={(event) => updateForm("serviceStateId", event.target.value)}>
                  <option value="">Selecione o estado</option>
                  {states.filter((state) => state.active).map((state) => <option key={state.id} value={state.id}>{state.code} - {state.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Cidade de atendimento</span>
                <select disabled={!form.serviceStateId} value={form.serviceCityId} onChange={(event) => updateForm("serviceCityId", event.target.value)}>
                  <option value="">Selecione a cidade</option>
                  {formCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
              </label>
              <label className="toggle-row">
                <input
                  checked={form.availableForMatches}
                  onChange={(event) => setForm((current) => ({ ...current, availableForMatches: event.target.checked }))}
                  type="checkbox"
                />
                Disponivel para matches
              </label>
            </div>

            <div className="visual-grid">
              <div className="media-field">
                <span>Foto de perfil</span>
                <div className="avatar-preview">
                  {form.avatarUrl ? <img alt="Previa da foto de perfil" src={form.avatarUrl} /> : <strong>Foto</strong>}
                </div>
                <label className="upload-action">
                  {isUploadingImage === "avatar" ? "Enviando" : "Upload foto"}
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={Boolean(isUploadingImage)}
                    onChange={(event) => void handleImageUpload("avatar", event.currentTarget.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
                <input
                  aria-label="URL da foto"
                  placeholder="https://..."
                  value={form.avatarUrl}
                  onChange={(event) => updateForm("avatarUrl", event.target.value)}
                />
              </div>

              <div className="media-field">
                <span>Foto de capa</span>
                <div className="cover-preview">
                  {form.coverUrl ? <img alt="Previa da foto de capa" src={form.coverUrl} /> : <strong>Capa</strong>}
                </div>
                <label className="upload-action">
                  {isUploadingImage === "cover" ? "Enviando" : "Upload capa"}
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={Boolean(isUploadingImage)}
                    onChange={(event) => void handleImageUpload("cover", event.currentTarget.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
                <input
                  aria-label="URL da capa"
                  placeholder="https://..."
                  value={form.coverUrl}
                  onChange={(event) => updateForm("coverUrl", event.target.value)}
                />
              </div>

              <label className="field">
                <span>Mini bio</span>
                <textarea
                  maxLength={240}
                  value={form.miniBio}
                  onChange={(event) => updateForm("miniBio", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Bio completa</span>
                <textarea
                  maxLength={1200}
                  value={form.fullBio}
                  onChange={(event) => updateForm("fullBio", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Instagram</span>
                <input
                  placeholder="https://instagram.com/..."
                  value={form.instagramUrl}
                  onChange={(event) => updateForm("instagramUrl", event.target.value)}
                />
              </label>

              <label className="field">
                <span>LinkedIn</span>
                <input
                  placeholder="https://www.linkedin.com/in/..."
                  value={form.linkedinUrl}
                  onChange={(event) => updateForm("linkedinUrl", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Facebook</span>
                <input
                  placeholder="https://www.facebook.com/..."
                  value={form.facebookUrl}
                  onChange={(event) => updateForm("facebookUrl", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Site profissional</span>
                <input
                  placeholder="https://..."
                  value={form.websiteUrl}
                  onChange={(event) => updateForm("websiteUrl", event.target.value)}
                />
              </label>
            </div>

            <div className="address-row">
              <label className="field">
                <span>CEP</span>
                <input
                  inputMode="numeric"
                  value={form.officeCep}
                  onChange={(event) => updateForm("officeCep", event.target.value)}
                  placeholder="01001-000"
                />
              </label>

              <label className="field compact">
                <span>Numero</span>
                <input value={form.officeNumber} onChange={(event) => updateForm("officeNumber", event.target.value)} />
              </label>

              <button className="secondary-action" disabled={isGeocoding || !form.officeCep} onClick={handleGeocode} type="button">
                {isGeocoding ? "Consultando" : "Consultar CEP"}
              </button>
            </div>

            <div className="manual-location-panel">
              <OfficeLocationMap
                addressLabel={address ? formatAddress(address) : [selectedLawyer?.officeCity, selectedLawyer?.officeState].filter(Boolean).join("/")}
                coordinates={coordinates}
                manualLat={form.officeManualLat}
                manualLng={form.officeManualLng}
                onManualLocationChange={updateManualLocation}
              />

              <div className="address-row manual-coordinates-row">
                <label className="field">
                  <span>Latitude confirmada</span>
                  <input
                    inputMode="decimal"
                    placeholder="-23.000000"
                    value={form.officeManualLat}
                    onChange={(event) => updateForm("officeManualLat", event.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Longitude confirmada</span>
                  <input
                    inputMode="decimal"
                    placeholder="-46.000000"
                    value={form.officeManualLng}
                    onChange={(event) => updateForm("officeManualLng", event.target.value)}
                  />
                </label>
              </div>
            </div>

            <footer className="form-actions">
              {editingLawyerId ? (
                <button className="secondary-action" onClick={startNewLawyer} type="button">
                  Cancelar edicao
                </button>
              ) : null}
              <button disabled={isSaving || !canSubmit} type="submit">
                {isSaving ? "Salvando" : editingLawyerId ? "Atualizar advogado" : "Salvar advogado"}
              </button>
            </footer>
          </form>

          <aside className="panel result-panel" aria-live="polite">
            <div>
              <p className="eyebrow">Endereco</p>
              <h2>Previa do backend</h2>
            </div>

            <dl>
              <div>
                <dt>Endereco</dt>
                <dd>{address ? formatAddress(address) : "Aguardando consulta"}</dd>
              </div>
              <div>
                <dt>Coordenada</dt>
                <dd>{formatCoordinates(coordinates)}</dd>
              </div>
            </dl>

            {feedback.message ? <p className={`feedback ${feedback.kind}`}>{feedback.message}</p> : null}
          </aside>
        </section> : null}

        {activeView === "prayers" ? (
          <section className="prayers-workspace" aria-label="Pedidos de oracao recebidos">
            <section className="panel prayer-hero">
              <div>
                <p className="eyebrow">Oracao</p>
                <h2>Pedidos recebidos</h2>
              </div>
              <div className="prayer-stats" aria-label="Resumo de oracoes">
                <div>
                  <strong>{prayerStats.unread}</strong>
                  <span>Recebidas</span>
                </div>
                <div>
                  <strong>{prayerStats.read}</strong>
                  <span>Lidas</span>
                </div>
                <div>
                  <strong>{prayerStats.total}</strong>
                  <span>Total</span>
                </div>
              </div>
              <div className="toolbar-actions">
                {(["all", "received", "read"] as const).map((status) => (
                  <button
                    className={`filter-chip ${prayerStatusFilter === status ? "active" : ""}`}
                    key={status}
                    onClick={() => setPrayerStatusFilter(status)}
                    type="button"
                  >
                    {status === "all" ? "Todas" : status === "received" ? "Recebidas" : "Lidas"}
                  </button>
                ))}
                <button className="secondary-action" disabled={isLoadingPrayers} onClick={() => void handleLoadPrayerRequests(true)} type="button">
                  {isLoadingPrayers ? "Atualizando" : "Atualizar"}
                </button>
              </div>
            </section>

            {prayersFeedback.message ? <p className={`feedback ${prayersFeedback.kind}`}>{prayersFeedback.message}</p> : null}

            <div className="request-list" aria-busy={isLoadingPrayers}>
              {isLoadingPrayers ? <p className="empty-state">Carregando pedidos...</p> : null}
              {!isLoadingPrayers && filteredPrayerRequests.length === 0 ? (
                <p className="empty-state">Nenhum pedido de oracao recebido ainda.</p>
              ) : null}
              {!isLoadingPrayers
                ? pagedPrayerRequests.items.map((request) => (
                    <article className={`request-item ${request.status === "read" ? "read" : ""}`} key={request.id}>
                      <div className="request-meta">
                        <span className={`status-pill ${request.status === "read" ? "read-pill" : ""}`}>
                          {request.status === "received" ? "Recebido" : "Lida"}
                        </span>
                        <time>{formatDateTime(request.createdAt)}</time>
                      </div>
                      <p className="prayer-message">{request.message}</p>
                      <div className="request-footer">
                        <small>
                          {request.anonymous || !request.client
                            ? "Pedido anonimo"
                            : `${request.client.name} - ${request.client.email}`}
                          {request.readAt ? ` - lida em ${formatDateTime(request.readAt)}` : ""}
                        </small>
                        <button
                          className={request.status === "read" ? "secondary-action" : "prayer-read-action"}
                          disabled={updatingPrayerId === request.id}
                          onClick={() => void handlePrayerStatusChange(request, request.status === "read" ? "received" : "read")}
                          type="button"
                        >
                          {updatingPrayerId === request.id
                            ? "Atualizando"
                            : request.status === "read"
                              ? "Reabrir"
                              : "Marcar lida"}
                        </button>
                      </div>
                    </article>
                  ))
                : null}
            </div>
            <Pagination
              page={pagedPrayerRequests.page}
              totalItems={filteredPrayerRequests.length}
              totalPages={pagedPrayerRequests.totalPages}
              onNext={() => setPrayerPage((current) => Math.min(current + 1, pagedPrayerRequests.totalPages))}
              onPrevious={() => setPrayerPage((current) => Math.max(current - 1, 1))}
            />
          </section>
        ) : null}

        {activeView === "partners" ? (
          <section className="workspace" aria-label="Logos de parceiros">
            <form className="panel form-panel" onSubmit={handlePartnerSubmit}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Parceiros</p>
                  <h2>Adicionar logo</h2>
                </div>
                <button className="secondary-action" disabled={isLoadingPartners} onClick={handleLoadPartnerLogos} type="button">
                  {isLoadingPartners ? "Atualizando" : "Atualizar"}
                </button>
              </div>

              <div className="partner-logo-preview">
                {partnerForm.logoUrl ? <img alt={`Logo ${partnerForm.name || "do parceiro"}`} src={partnerForm.logoUrl} /> : <strong>Logo</strong>}
              </div>

              <div className="form-grid">
                <label className="field">
                  <span>Nome do parceiro</span>
                  <input value={partnerForm.name} onChange={(event) => updatePartnerForm("name", event.target.value)} />
                </label>

                <label className="field">
                  <span>Site</span>
                  <input
                    placeholder="https://..."
                    value={partnerForm.websiteUrl}
                    onChange={(event) => updatePartnerForm("websiteUrl", event.target.value)}
                  />
                </label>
              </div>

              <label className="field wide">
                <span>URL da logo</span>
                <input
                  placeholder="https://..."
                  value={partnerForm.logoUrl}
                  onChange={(event) => updatePartnerForm("logoUrl", event.target.value)}
                />
              </label>

              <div className="partner-actions">
                <label className="upload-action">
                  {isUploadingPartnerLogo ? "Enviando" : "Upload logo"}
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isUploadingPartnerLogo}
                    onChange={(event) => void handlePartnerLogoUpload(event.currentTarget.files?.[0] ?? null)}
                    type="file"
                  />
                </label>

                <label className="toggle-row">
                  <input
                    checked={partnerForm.active}
                    onChange={(event) => updatePartnerForm("active", event.target.checked)}
                    type="checkbox"
                  />
                  Ativo
                </label>
              </div>

              <footer className="form-actions">
                <button disabled={isSavingPartner || !partnerForm.name || !partnerForm.logoUrl} type="submit">
                  {isSavingPartner ? "Salvando" : "Salvar parceiro"}
                </button>
              </footer>

              {partnersFeedback.message ? <p className={`feedback ${partnersFeedback.kind}`}>{partnersFeedback.message}</p> : null}
            </form>

            <aside className="panel result-panel">
              <div>
                <p className="eyebrow">Renderizacao</p>
                <h2>Logos cadastradas</h2>
              </div>

              <div className="partner-list" aria-busy={isLoadingPartners}>
                {isLoadingPartners ? <p className="empty-state">Carregando parceiros...</p> : null}
                {!isLoadingPartners && partners.length === 0 ? <p className="empty-state">Nenhuma logo cadastrada.</p> : null}
                {!isLoadingPartners
                  ? partners.map((partner) => (
                      <article className="partner-item" key={partner.id}>
                        <div className="partner-thumb">
                          <img alt={`Logo ${partner.name}`} src={partner.logoUrl} />
                        </div>
                        <div>
                          <strong>{partner.name}</strong>
                          <small>{partner.active ? "Ativo" : "Inativo"}</small>
                        </div>
                      </article>
                    ))
                  : null}
              </div>
            </aside>
          </section>
        ) : null}

        {activeView === "users" ? (
          <section className="lawyers-workspace" aria-label="Usuarios cadastrados">
            <section className="panel table-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Usuarios</p>
                  <h2>Cadastros do app</h2>
                </div>
                <button className="secondary-action" disabled={isLoadingUsers} onClick={() => void handleLoadUsers(true)} type="button">
                  {isLoadingUsers ? "Atualizando" : "Atualizar"}
                </button>
              </div>

              <label className="field">
                <span>Busca</span>
                <input
                  placeholder="Nome, email, telefone ou role"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                />
              </label>

              {usersFeedback.message ? <p className={`feedback ${usersFeedback.kind}`}>{usersFeedback.message}</p> : null}

              <div className="lawyers-list" role="list" aria-busy={isLoadingUsers}>
                {isLoadingUsers ? <p className="empty-state">Carregando usuarios...</p> : null}
                {!isLoadingUsers && filteredUsers.length === 0 ? (
                  <p className="empty-state">Nenhum usuario encontrado.</p>
                ) : null}
                {!isLoadingUsers
                  ? pagedUsers.items.map((user) => (
                      <button
                        className={`lawyer-row user-row ${selectedUser?.id === user.id ? "selected" : ""}`}
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        type="button"
                        role="listitem"
                      >
                        <span className={`status-dot ${user.blockedAt ? "rejected" : "approved"}`} aria-hidden="true" />
                        <span className="avatar-mini" aria-hidden="true">
                          {user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : initials(user.name || user.email)}
                        </span>
                        <span className="lawyer-main">
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </span>
                        <span className="lawyer-meta">{roleLabels[user.role]}</span>
                        <span className="status-pill">{user.blockedAt ? "Bloqueado" : "Ativo"}</span>
                      </button>
                    ))
                  : null}
              </div>
              <Pagination
                page={pagedUsers.page}
                totalItems={filteredUsers.length}
                totalPages={pagedUsers.totalPages}
                onNext={() => setUserPage((current) => Math.min(current + 1, pagedUsers.totalPages))}
                onPrevious={() => setUserPage((current) => Math.max(current - 1, 1))}
              />
            </section>

            <aside className="panel detail-panel" aria-label="Detalhe do usuario">
              {selectedUser ? (
                <>
                  <div>
                    <p className="eyebrow">Detalhe</p>
                    <h2>{selectedUser.name}</h2>
                  </div>

                  <dl>
                    <div>
                      <dt>Status</dt>
                      <dd>{selectedUser.blockedAt ? `Bloqueado em ${formatDateTime(selectedUser.blockedAt)}` : "Ativo"}</dd>
                    </div>
                    <div>
                      <dt>Role</dt>
                      <dd>{roleLabels[selectedUser.role]}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{selectedUser.email}</dd>
                    </div>
                    <div>
                      <dt>Telefone</dt>
                      <dd>{selectedUser.phone || "Nao informado"}</dd>
                    </div>
                    <div>
                      <dt>Advogado</dt>
                      <dd>
                        {selectedUser.lawyerProfileId
                          ? `${selectedUser.lawyerProfileId} - ${selectedUser.lawyerStatus ? statusLabels[selectedUser.lawyerStatus] : "sem status"}`
                          : "Nao vinculado"}
                      </dd>
                    </div>
                    <div>
                      <dt>Criado</dt>
                      <dd>{formatDateTime(selectedUser.createdAt)}</dd>
                    </div>
                  </dl>

                  <button
                    className={selectedUser.blockedAt ? "header-action" : "secondary-action"}
                    disabled={isUpdatingUser || selectedUser.id === session.user.id}
                    onClick={() => void handleUserBlockedChange(selectedUser, !selectedUser.blockedAt)}
                    type="button"
                  >
                    {selectedUser.blockedAt ? "Desbloquear usuario" : "Bloquear usuario"}
                  </button>
                </>
              ) : (
                <p className="empty-state">Selecione um usuario para visualizar os dados.</p>
              )}
            </aside>
          </section>
        ) : null}

        {activeView === "operation" ? (
          <section className="panel result-panel" aria-live="polite">
            <div>
              <p className="eyebrow">Operacao</p>
              <h2>Status do backend</h2>
            </div>
            <dl>
              <div>
                <dt>Endereco consultado</dt>
                <dd>{address ? formatAddress(address) : "Nenhuma consulta recente nesta sessao"}</dd>
              </div>
              <div>
                <dt>Coordenada</dt>
                <dd>{formatCoordinates(coordinates)}</dd>
              </div>
              <div>
                <dt>Sessao</dt>
                <dd>Admin validado pelo backend via /v1/me.</dd>
              </div>
            </dl>
            {feedback.message ? <p className={`feedback ${feedback.kind}`}>{feedback.message}</p> : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
