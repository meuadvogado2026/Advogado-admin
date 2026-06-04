import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  AdminPrayerRequest,
  AdminUserRecord,
  CepAddress,
  Coordinates,
  createLawyer,
  emptyLawyerForm,
  fetchAdminUsers,
  fetchAreas,
  fetchLawyers,
  fetchPrayerRequests,
  geocodeCep,
  LawyerFormState,
  LawyerRecord,
  LawyerStatus,
  updateAdminUserBlocked,
  updateLawyerStatus,
  uploadLawyerImage,
  LegalArea
} from "./adminApi";
import {
  AdminSession,
  clearStoredSession,
  fetchCurrentUser,
  loadStoredSession,
  loginAdmin,
  storeSession
} from "./authApi";
import { kpis } from "./contracts";
import "./styles/app.css";
import logo from "./assets/logo-blue.png";

type Feedback = { kind: "idle" | "success" | "error" | "info"; message: string };
type AdminView = "dashboard" | "lawyers" | "newLawyer" | "prayers" | "users" | "operation";

function formatAddress(address: CepAddress) {
  const parts = [address.street, address.neighborhood, address.city, address.state].filter(Boolean);
  return parts.join(" - ");
}

function formatCoordinates(coordinates: Coordinates | null) {
  if (!coordinates) return "Coordenada pendente";
  return `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)} (${coordinates.provider}, ${coordinates.confidence})`;
}

function formatSafeCoordinateState(lawyer: LawyerRecord) {
  return typeof lawyer.officeLat === "number" && typeof lawyer.officeLng === "number" ? "Coordenada validada" : "Coordenada pendente";
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

export function App() {
  const [session, setSession] = useState<AdminSession | null>(() => loadStoredSession());
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authFeedback, setAuthFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(session));
  const [areas, setAreas] = useState<LegalArea[]>([]);
  const [lawyers, setLawyers] = useState<LawyerRecord[]>([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);
  const [lawyerSearch, setLawyerSearch] = useState("");
  const [lawyerStatusFilter, setLawyerStatusFilter] = useState<"all" | LawyerStatus>("all");
  const [lawyersFeedback, setLawyersFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isLoadingLawyers, setIsLoadingLawyers] = useState(false);
  const [isUpdatingLawyer, setIsUpdatingLawyer] = useState(false);
  const [prayerRequests, setPrayerRequests] = useState<AdminPrayerRequest[]>([]);
  const [prayersFeedback, setPrayersFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isLoadingPrayers, setIsLoadingPrayers] = useState(false);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [usersFeedback, setUsersFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState<"avatar" | "cover" | null>(null);
  const [form, setForm] = useState<LawyerFormState>(emptyLawyerForm);
  const [address, setAddress] = useState<CepAddress | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isGeocoding, setIsGeocoding] = useState(false);
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

  const canSubmit = useMemo(
    () =>
      Boolean(
        session &&
          form.name &&
          form.email &&
          form.whatsapp &&
          form.oabNumber &&
          form.oabState &&
          form.mainAreaId &&
          form.officeCep &&
          form.officeNumber
      ),
    [form, session]
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
  }, [activeView, session]);

  async function handleLoadLawyers() {
    if (!token) {
      setLawyersFeedback({ kind: "error", message: "Entre como admin antes de listar advogados." });
      return;
    }

    setIsLoadingLawyers(true);
    setLawyersFeedback({ kind: "info", message: "Carregando advogados pelo backend..." });
    try {
      const response = await fetchLawyers(token);
      setLawyers(response.lawyers);
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

  async function handleLoadPrayerRequests() {
    if (!token) {
      setPrayersFeedback({ kind: "error", message: "Entre como admin antes de listar pedidos." });
      return;
    }

    setIsLoadingPrayers(true);
    setPrayersFeedback({ kind: "info", message: "Carregando pedidos de oracao..." });
    try {
      const response = await fetchPrayerRequests(token);
      setPrayerRequests(response.requests);
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

  async function handleLoadUsers() {
    if (!token) {
      setUsersFeedback({ kind: "error", message: "Entre como admin antes de listar usuarios." });
      return;
    }

    setIsLoadingUsers(true);
    setUsersFeedback({ kind: "info", message: "Carregando usuarios cadastrados..." });
    try {
      const response = await fetchAdminUsers(token);
      setUsers(response.users);
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
      operation:
        "M12 2 3 6v6c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V6l-9-4Zm0 3.2 6 2.7V12c0 3.8-2.5 7.2-6 8.4-3.5-1.2-6-4.6-6-8.4V7.9l6-2.7Z"
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
    { view: "prayers", label: "Oracoes" },
    { view: "users", label: "Usuarios" },
    { view: "operation", label: "Operacao" }
  ];

  function updateForm(field: keyof LawyerFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "officeCep") {
      setAddress(null);
      setCoordinates(null);
    }
  }

  async function handleGeocode() {
    if (!token) {
      setFeedback({ kind: "error", message: "Entre como admin antes de consultar CEP." });
      return;
    }

    setIsGeocoding(true);
    setFeedback({ kind: "info", message: "Consultando CEP pelo backend..." });
    try {
      const result = await geocodeCep(token, form.officeCep);
      setAddress(result.address);
      setCoordinates(result.coordinates);
      setFeedback({
        kind: result.coordinates ? "success" : "info",
        message: result.note ?? "CEP normalizado pelo backend."
      });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao consultar CEP.";
      setFeedback({ kind: "error", message });
    } finally {
      setIsGeocoding(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      setFeedback({ kind: "error", message: "Preencha os campos obrigatorios antes de salvar." });
      return;
    }

    setIsSaving(true);
    setFeedback({ kind: "info", message: "Salvando advogado pelo backend..." });
    try {
      await createLawyer(token, form);
      setFeedback({ kind: "success", message: "Advogado salvo. Se aprovado, ja entra elegivel para match com coordenada valida." });
      setForm((current) => ({ ...emptyLawyerForm, mainAreaId: current.mainAreaId }));
      setAddress(null);
      setCoordinates(null);
      if (lawyers.length > 0 || activeView === "newLawyer") {
        void handleLoadLawyers();
      }
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao salvar advogado.";
      setFeedback({ kind: "error", message });
    } finally {
      setIsSaving(false);
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
      setSelectedUserId(response.user.id);
      setUsersFeedback({ kind: "success", message: blocked ? "Usuario bloqueado." : "Usuario desbloqueado." });
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao atualizar usuario.";
      setUsersFeedback({ kind: "error", message });
    } finally {
      setIsUpdatingUser(false);
    }
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
              onClick={() => setActiveView(item.view)}
              type="button"
            >
              <Icon name={item.view} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        {!session || isCheckingSession ? (
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
        ) : (
          <>
        <header className="page-header">
          <div>
            <p className="eyebrow">Spec 008 - Parte 1</p>
            <h1>{navItems.find((item) => item.view === activeView)?.label}</h1>
            <p className="session-label">{session.user.email ?? "admin"} - role admin</p>
          </div>
          <div className="header-actions">
            <button className="header-action" onClick={() => setActiveView("newLawyer")} type="button">
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
                  <button className="secondary-action" disabled={isLoadingLawyers} onClick={handleLoadLawyers} type="button">
                    {isLoadingLawyers ? "Atualizando" : "Atualizar"}
                  </button>
                  <button className="header-action" onClick={() => setActiveView("newLawyer")} type="button">
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
                  ? filteredLawyers.map((lawyer) => (
                      <button
                        className={`lawyer-row ${selectedLawyer?.id === lawyer.id ? "selected" : ""}`}
                        key={lawyer.id}
                        onClick={() => setSelectedLawyerId(lawyer.id)}
                        type="button"
                        role="listitem"
                      >
                        <span className={`status-dot ${lawyer.status}`} aria-hidden="true" />
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
                      <dt>Cidade/UF</dt>
                      <dd>{[selectedLawyer.officeCity, selectedLawyer.officeState].filter(Boolean).join("/") || "Nao informado"}</dd>
                    </div>
                    <div>
                      <dt>Geocoding</dt>
                      <dd>{formatSafeCoordinateState(selectedLawyer)}</dd>
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
                          selectedLawyer.miniBio || selectedLawyer.fullBio ? "bio" : null
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
                </>
              ) : (
                <p className="empty-state">Selecione um advogado para ver detalhes operacionais.</p>
              )}
            </aside>
          </section>
        ) : null}

        {activeView === "newLawyer" ? <section className="workspace">
          <form className="panel form-panel" onSubmit={handleSubmit}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Advogado</p>
                <h2>Dados operacionais</h2>
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

            <footer className="form-actions">
              <button disabled={isSaving || !canSubmit} type="submit">
                {isSaving ? "Salvando" : "Salvar advogado"}
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
          <section className="panel table-panel" aria-label="Pedidos de oracao recebidos">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Oracao</p>
                <h2>Pedidos recebidos</h2>
              </div>
              <button className="secondary-action" disabled={isLoadingPrayers} onClick={handleLoadPrayerRequests} type="button">
                {isLoadingPrayers ? "Atualizando" : "Atualizar"}
              </button>
            </div>

            {prayersFeedback.message ? <p className={`feedback ${prayersFeedback.kind}`}>{prayersFeedback.message}</p> : null}

            <div className="request-list" aria-busy={isLoadingPrayers}>
              {isLoadingPrayers ? <p className="empty-state">Carregando pedidos...</p> : null}
              {!isLoadingPrayers && prayerRequests.length === 0 ? (
                <p className="empty-state">Nenhum pedido de oracao recebido ainda.</p>
              ) : null}
              {!isLoadingPrayers
                ? prayerRequests.map((request) => (
                    <article className="request-item" key={request.id}>
                      <div className="request-meta">
                        <span className="status-pill">{request.status === "received" ? "Recebido" : request.status}</span>
                        <time>{formatDateTime(request.createdAt)}</time>
                      </div>
                      <p>{request.message}</p>
                      <small>
                        {request.anonymous || !request.client
                          ? "Pedido anonimo"
                          : `${request.client.name} - ${request.client.email}`}
                      </small>
                    </article>
                  ))
                : null}
            </div>
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
                <button className="secondary-action" disabled={isLoadingUsers} onClick={handleLoadUsers} type="button">
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
                  ? filteredUsers.map((user) => (
                      <button
                        className={`lawyer-row user-row ${selectedUser?.id === user.id ? "selected" : ""}`}
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        type="button"
                        role="listitem"
                      >
                        <span className={`status-dot ${user.blockedAt ? "rejected" : "approved"}`} aria-hidden="true" />
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
          </>
        )}
      </section>
    </main>
  );
}
