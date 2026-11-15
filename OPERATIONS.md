# Admin Operations - Advogado 2.0

**Hospedagem alvo:** Vercel

## Ambientes

- Local.
- Preview.
- Production.

## Variaveis

Somente variaveis publicas seguras no frontend. Segredos ficam no backend/Railway.

## Deploy

- Preview por branch.
- Production apenas apos build, smoke e validacao.

## Smoke Pos-Deploy

- Abrir URL.
- Login admin.
- Dashboard carrega.
- Tela de advogados carrega.
- API health/backing services OK.

## Local

- `npm run dev` abre o Vite local.
- `npm run build` gera `dist/`.
- `npm run harness` deve passar antes de qualquer preview/deploy.

## Rollback

- Usar rollback da Vercel.
- Manter API versionada para evitar quebra entre deploys.


## SPEC-020 - Dominio admin (2026-11-14)

API compartilhada em src/apiConfig.ts usa DigitalOcean em producao; override legado Railway e rejeitado. Desenvolvimento permanece localhost. Harness tipos/testes/build/smoke OK. Dominio alvo admin.advogado20.com.br depende de acesso a equipe Vercel meuadvogado2026s-projects e DNS. Convites existentes continuam com redirect Vercel ate allowlist/variavel serem atualizados em conjunto.


## SPEC-021 - Gestao administrativa / 2026-11-14

Novo Advogado e Operacao ocultos na navegacao; atalho global removido; cadastro/edicao preservado em Advogados. Cidades carregam todas as paginas incluindo inativas, mas lista/opcoes mostram so ativas. Cadastro repetido de ativa informa o registro e posiciona sua pagina; inativa oferece Reativar/Cancelar, usando PATCH active=true sem recriar. Card de oracao quebra nomes/emails longos e mantem botao dentro. Harness32 testes/tipos/build/smoke e Chrome com fixtures nos tamanhos1366/1024/768/390 OK. API requer includeInactive=true para detectar inativas (publicar backend antes do admin).


## SPEC-022 - Dashboard e consulta por estado / 2026-11-14

Dashboard consome API agregada:6 cards, regioes/UF com base explicada, status e prioridades acionaveis. Loading/erro/retry/vazio/atualizacao nao fabricam totais. Catalogo consulta cidades porUF/nome/situacao, reseta pagina e acompanha estado do formulario. Reativacao explicita e lista de advogados preservadas. Sidebar deixa de prometer100%Online sem monitoramento. Harness35 testes/tipos/build/smoke e Chrome fixtures nas4larguras OK. Requer API CON-022 antes da publicacao.


## SPEC-023 - Operacao no dashboard / 2026-11-14

Tres blocos no dashboard: oracoes pendentes/lidas/total e percentual lido; parceiros/beneficios total/ativos/inativos e percentual ativo. Atalhos abrem filtros received/read ou gestao correta. Loading/erro/vazio/refresh preservados e sem confundir leitura com resposta. Harness35 testes/tipos/build/smoke e Chrome fixtures4larguras OK. Publicar apos API estendida.

## SPEC-024
Consultar AUTH_LINKS.md para envs, rollout/rollback, limites de fila/replicas e gates de recebimento/Android. Nenhum MX/SMTP alterado.
