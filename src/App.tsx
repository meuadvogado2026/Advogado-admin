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
  const [token, setToken] = useState("");
  const [areas, setAreas] = useState<LegalArea[]>([]);
  const [form, setForm] = useState<LawyerFormState>(emptyLawyerForm);
  const [address, setAddress] = useState<CepAddress | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const canSubmit = useMemo(
    () =>
      Boolean(
        token &&
          form.name &&
          form.email &&
          form.whatsapp &&
          form.oabNumber &&
          form.oabState &&
          form.mainAreaId &&
          form.officeCep &&
          form.officeNumber
      ),
    [form, token]
  );

  function updateForm(field: keyof LawyerFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "officeCep") {
      setAddress(null);
      setCoordinates(null);
    }
  }

  async function handleGeocode() {
    if (!token) {
      setFeedback({ kind: "error", message: "Informe um Bearer token admin antes de consultar CEP." });
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
        <header className="page-header">
          <div>
            <p className="eyebrow">Spec 002</p>
            <h1>Cadastro admin por CEP</h1>
          </div>
          <a className="header-action" href="#cadastro">
            Novo advogado
          </a>
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

            <label className="field wide">
              <span>Bearer token admin</span>
              <input
                autoComplete="off"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Cole o token admin local"
                type="password"
              />
            </label>

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
      </section>
    </main>
  );
}
