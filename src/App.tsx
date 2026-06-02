import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AdminApiError,
  CepAddress,
  Coordinates,
  createLawyer,
  emptyLawyerForm,
  fetchAreas,
  geocodeCep,
  LawyerFormState,
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

type Feedback = { kind: "idle" | "success" | "error" | "info"; message: string };

function formatAddress(address: CepAddress) {
  const parts = [address.street, address.neighborhood, address.city, address.state].filter(Boolean);
  return parts.join(" - ");
}

function formatCoordinates(coordinates: Coordinates | null) {
  if (!coordinates) return "Coordenada pendente";
  return `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)} (${coordinates.provider}, ${coordinates.confidence})`;
}

export function App() {
  const [session, setSession] = useState<AdminSession | null>(() => loadStoredSession());
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authFeedback, setAuthFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(session));
  const [areas, setAreas] = useState<LegalArea[]>([]);
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
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : "Falha ao salvar advogado.";
      setFeedback({ kind: "error", message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar" aria-label="Navegacao administrativa">
        <strong>Advogado 2.0</strong>
        <nav>
          <a href="#dashboard">Dashboard</a>
          <a href="#advogados">Advogados</a>
          <a href="#cadastro">Cadastro</a>
          <a href="#operacao">Operacao</a>
        </nav>
      </aside>

      <section className="content">
        {!session || isCheckingSession ? (
          <section className="login-view" aria-label="Login administrativo">
            <form className="panel login-panel" onSubmit={handleLogin}>
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
            <p className="eyebrow">Spec 006</p>
            <h1>Cadastro admin por CEP</h1>
            <p className="session-label">{session.user.email ?? "admin"} - role admin</p>
          </div>
          <div className="header-actions">
            <a className="header-action" href="#cadastro">
              Novo advogado
            </a>
            <button className="secondary-action" onClick={handleLogout} type="button">
              Sair
            </button>
          </div>
        </header>

        <section className="kpi-grid" aria-label="Indicadores administrativos" id="dashboard">
          {kpis.map((kpi) => (
            <article className="kpi" key={kpi.label}>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.helper}</small>
            </article>
          ))}
        </section>

        <section className="workspace">
          <form className="panel form-panel" id="cadastro" onSubmit={handleSubmit}>
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

          <aside className="panel result-panel" id="operacao" aria-live="polite">
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
        </section>
          </>
        )}
      </section>
    </main>
  );
}
