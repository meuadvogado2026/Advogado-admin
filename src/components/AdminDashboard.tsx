import { useEffect, useState } from "react";
import { fetchAdminDashboard, type AdminDashboardData } from "../adminApi";

const number = (value: number) => value.toLocaleString("pt-BR");
const percent = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
type Props = { token: string; onReview: () => void; onApproved: () => void; onLocations: () => void; onPrayers: (status: "received" | "read") => void; onPartners: () => void; onBenefits: () => void };

export function AdminDashboard({ token, onReview, onApproved, onLocations, onPrayers, onPartners, onBenefits }: Props) {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetchAdminDashboard(token, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(() => {
      if (!controller.signal.aborted) { setData(null); setError("Não foi possível carregar os indicadores. Tente novamente."); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, revision]);

  const cards = data ? [
    { label: "Usuários do app", value: data.users.total, helper: `${number(data.users.clients)} clientes · ${number(data.users.lawyerAccounts)} contas de advogados. Administradores não entram no total.` },
    { label: "Clientes cadastrados", value: data.users.clients, helper: "Contas de clientes registradas na plataforma." },
    { label: "Advogados cadastrados", value: data.lawyers.total, helper: `${number(data.lawyers.statuses.approved)} aprovados · ${number(data.lawyers.statuses.pending_review)} em revisão.` },
    { label: "Advogados disponíveis", value: data.lawyers.available, helper: "Aprovados e com cadastro apto para aparecer nas buscas." },
    { label: "Cidades atendidas", value: data.coverage.servedCities, helper: `${percent(data.coverage.percentage)} das ${number(data.coverage.activeCities)} cidades ativas cadastradas. Não representa cobertura nacional.` },
    { label: "Novos usuários em 30 dias", value: data.users.newLast30Days, helper: "Contas de clientes e advogados criadas nos últimos 30 dias." }
  ] : [];
  return <section className="dashboard" aria-label="Visão geral da plataforma" aria-busy={loading}>
    <div className="panel-heading dashboard-heading">
      <div><p className="eyebrow">Visão geral</p><h2>O que acontece na plataforma</h2>
        <p className="dashboard-note">{data ? `Atualizado em ${new Date(data.generatedAt).toLocaleString("pt-BR")}` : "Indicadores calculados sobre a base completa."}</p></div>
      <button className="secondary-action" disabled={loading} onClick={() => setRevision(current => current + 1)} type="button">{loading ? "Atualizando..." : "Atualizar indicadores"}</button>
    </div>
    {loading ? <p role="status" className="dashboard-note">Carregando indicadores...</p> : null}
    {error ? <div className="feedback error" role="alert"><p>{error}</p><button className="secondary-action" onClick={() => setRevision(current => current + 1)} type="button">Tentar novamente</button></div> : null}
    {data ? <>
      {data.users.total === 0 && data.lawyers.total === 0 ? <p className="feedback info">A plataforma ainda não tem usuários ou advogados cadastrados. Os indicadores serão atualizados conforme os cadastros forem criados.</p> : null}
      <div className="kpi-grid dashboard-kpis" aria-label="Indicadores da plataforma">{cards.map(card => <article className="kpi" key={card.label} data-metric={card.label}><span>{card.label}</span><strong>{number(card.value)}</strong><small>{card.helper}</small></article>)}</div>
      <section className="dashboard-operations" aria-label="Orações, parceiros e benefícios">
        <section className="panel operation-summary" aria-label="Resumo de orações">
          <p className="eyebrow">Pedidos de oração</p><h2>Acompanhamento dos pedidos</h2>
          <div className="operation-headline"><strong data-operation="prayers-pending">{number(data.operations.prayers.pending)}</strong><span>pendentes de leitura</span></div>
          <dl className="dashboard-statuses">
            <div><dt>Lidas</dt><dd data-operation="prayers-read">{number(data.operations.prayers.read)}</dd></div>
            <div><dt>Total de pedidos</dt><dd data-operation="prayers-total">{number(data.operations.prayers.total)}</dd></div>
          </dl>
          <p className="dashboard-note">{percent(data.operations.prayers.readPercentage)} dos pedidos já foram lidos. A leitura não registra uma resposta ao usuário.</p>
          <div className="operation-actions"><button className="secondary-action" onClick={() => onPrayers("received")} type="button">Ver orações pendentes</button><button className="secondary-action" onClick={() => onPrayers("read")} type="button">Ver orações lidas</button></div>
        </section>
        <section className="panel operation-summary" aria-label="Resumo de parceiros">
          <p className="eyebrow">Parceiros</p><h2>Rede de parceiros</h2>
          <div className="operation-headline"><strong data-operation="partners-total">{number(data.operations.partners.total)}</strong><span>parceiros cadastrados</span></div>
          <dl className="dashboard-statuses"><div><dt>Ativos</dt><dd data-operation="partners-active">{number(data.operations.partners.active)}</dd></div><div><dt>Inativos</dt><dd data-operation="partners-inactive">{number(data.operations.partners.inactive)}</dd></div></dl>
          <p className="dashboard-note">{percent(data.operations.partners.activePercentage)} dos parceiros cadastrados estão ativos.</p>
          <button className="secondary-action" onClick={onPartners} type="button">Gerenciar parceiros</button>
        </section>
        <section className="panel operation-summary" aria-label="Resumo de benefícios">
          <p className="eyebrow">Benefícios</p><h2>Catálogo de benefícios</h2>
          <div className="operation-headline"><strong data-operation="benefits-total">{number(data.operations.benefits.total)}</strong><span>benefícios cadastrados</span></div>
          <dl className="dashboard-statuses"><div><dt>Ativos</dt><dd data-operation="benefits-active">{number(data.operations.benefits.active)}</dd></div><div><dt>Inativos</dt><dd data-operation="benefits-inactive">{number(data.operations.benefits.inactive)}</dd></div></dl>
          <p className="dashboard-note">{percent(data.operations.benefits.activePercentage)} dos benefícios cadastrados estão ativos.</p>
          <button className="secondary-action" onClick={onBenefits} type="button">Gerenciar benefícios</button>
        </section>
      </section>
      <div className="dashboard-panels">
        <section className="panel dashboard-region-panel" aria-label="Distribuição por região">
          <p className="eyebrow">Presença regional</p><h2>Advogados por região</h2>
          <p className="dashboard-note">Percentual sobre todos os {number(data.lawyers.total)} cadastros de advogados, pela cidade de atendimento. Inclui todos os status; sem cidade definida entra em “Não informado”.</p>
          <div className="region-list">{data.regions.map(region => <div className="region-row" key={region.name}>
            <div><span>{region.name}</span><strong>{number(region.count)} · {percent(region.percentage)}</strong></div>
            <div className="region-track" role="img" aria-label={`${region.name}: ${region.count} advogados, ${percent(region.percentage)}`}><span style={{ width: `${region.percentage}%` }} /></div>
          </div>)}</div>
        </section>
        <section className="panel dashboard-priorities" aria-label="Prioridades de gestão">
          <p className="eyebrow">Próximas ações</p><h2>Onde atuar agora</h2>
          <button className="priority-action" onClick={onReview} type="button"><strong>{number(data.lawyers.statuses.pending_review)}</strong><span>Advogados aguardando análise<small>Abrir cadastros em revisão</small></span></button>
          <button className="priority-action" onClick={onApproved} type="button"><strong>{number(data.lawyers.approvedUnavailable)}</strong><span>Aprovados ainda indisponíveis<small>Conferir disponibilidade, acesso e localização do escritório</small></span></button>
          <button className="priority-action" onClick={onLocations} type="button"><strong>{number(data.coverage.unservedCities)}</strong><span>Cidades cadastradas sem atendimento<small>Consultar cidades para ampliar a presença</small></span></button>
          <p className="dashboard-note">Os indicadores mostram a situação atual. Não são uma previsão de demanda.</p>
        </section>
      </div>
      <div className="dashboard-panels">
        <section className="panel dashboard-states" aria-label="Advogados por estado">
          <p className="eyebrow">Estados</p><h2>Distribuição dos advogados por UF</h2>
          <div className="dashboard-table-scroll"><table><thead><tr><th scope="col">Estado</th><th scope="col">Cadastros</th><th scope="col">Disponíveis</th><th scope="col">% do total</th></tr></thead>
          <tbody>{data.states.map(state => <tr key={state.code}><th scope="row">{state.code === "--" ? state.name : `${state.code} · ${state.name}`}</th><td>{number(state.count)}</td><td>{number(state.available)}</td><td>{percent(state.percentage)}</td></tr>)}</tbody></table></div>
          {!data.states.length ? <p className="empty-state">Nenhum estado cadastrado.</p> : null}
          <p className="dashboard-note">Base: cidade de atendimento, não UF da OAB ou localização dos usuários. Percentuais arredondados.</p>
        </section>
        <section className="panel" aria-label="Situação dos advogados"><p className="eyebrow">Cadastros</p><h2>Situação dos advogados</h2>
          <dl className="dashboard-statuses">{([["approved", "Aprovados"], ["pending_review", "Em revisão"], ["draft", "Rascunhos"], ["rejected", "Rejeitados"], ["suspended", "Suspensos"]] as const).map(([status, label]) => <div key={status}><dt>{label}</dt><dd>{number(data.lawyers.statuses[status])}</dd></div>)}</dl>
        </section>
      </div>
    </> : null}
  </section>;
}
