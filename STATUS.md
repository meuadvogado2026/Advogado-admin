# Admin Status - Meu Advogado 2.0

**Ultima atualizacao:** 2026-06-03
**Fase:** ADMIN MVP / SPEC 009 GESTAO OPERACIONAL VALIDADA
**Veredito:** ADMIN_GESTAO_ADVOGADOS_SMOKE_AUTH_OK

## Concluido

- [x] Documentacao inicial do ambiente admin criada.
- [x] Responsabilidade de cadastro de advogado definida.
- [x] CEP obrigatorio no fluxo admin definido.
- [x] Scaffold React/Vite/TypeScript criado.
- [x] Shell administrativo placeholder criado.
- [x] Contratos iniciais de backend registrados em codigo.
- [x] Harness CLI, teste, build e smoke criados.
- [x] Ambiente admin passou a ser governado pela `.codex/` unica da raiz; copia local `Meu Advogado 2.0 - admin/.codex` removida.
- [x] Auth/roles backend reais ja existem para rotas admin no backend; login visual admin foi implementado e validado localmente na spec 006.
- [x] Formulario admin de advogado implementado e agora alimentado por sessao admin autenticada.
- [x] UI consulta `POST /v1/admin/geocode/cep` e salva via `POST /v1/admin/lawyers`, sem acessar Supabase ou providers externos diretamente.
- [x] Harness admin passou com typecheck, 3 testes, build e smoke shell.
- [x] Spec 006 implementada: login visual admin, sessao local, validacao de role via `GET /v1/me`, guard simples e logout.
- [x] Harness admin passou com exit code 0 apos a spec 006: typecheck, 6 testes, build e smoke estrutural.
- [x] Smoke local `/login` respondeu HTTP 200.
- [x] Playwright instalado; smoke visual de `/login` confirmou tela de login e ausencia de token manual, com screenshot em `harness-results/spec006-admin-login.png`.
- [x] Smoke assistido com credencial admin real fechado em backend local: login admin, painel, consulta CEP, cadastro descartavel, logout, rota privada bloqueada e usuario nao-admin bloqueado; cadastro de teste limpo.
- [x] Smoke publico sem credenciais do Vercel executado antes do redeploy: raiz `200`, `/login` `404`; build publicado ainda exibe `Bearer token admin`, aponta para `http://localhost:3333` e falha `GET http://localhost:3333/v1/areas`.
- [x] Commit admin `cb0b707` publicado no GitHub/Vercel com fallback SPA para `/login` e API base de producao Railway.
- [x] Smoke publico pos-publicacao: `/login` HTTP `200`, formulario Email/Senha/Entrar, ausencia de campo/token manual e bundle apontando para Railway.
- [x] Revalidacao final sem credenciais: bundle contem configuracao Supabase publica suficiente para login sem imprimir anon key, nao contem `localhost`, rota privada sem sessao volta para `/login` e endpoints Railway respondem com CORS para Vercel.
- [x] Smoke assistido do admin publicado validado: login real digitado pelo usuario no navegador, painel autenticado, CEP, cadastro descartavel, limpeza sem residuo, logout e rota privada bloqueada.
- [x] Spec 008 Parte 1 implementada localmente: sidebar trocou ancoras por views reais (`Dashboard`, `Advogados`, `Novo Advogado`, `Operacao`), menus ganharam icones SVG inline, login/sidebar usam logo oficial arredondada e cadastro por CEP segue preservado.
- [x] Gates spec 008 Parte 1 admin: `npm run typecheck` exit 0, `npm run test` exit 0, `npm run build` exit 0, `npm run smoke` exit 0, `npm run harness` exit 0. Playwright local em `http://127.0.0.1:5174/login` confirmou logo, 4 botoes de navegacao e ausencia de anchors; screenshot em `harness-results/spec008-admin-login-shell.png`.
- [x] Spec 008 Parte 2 implementada localmente: formulario de advogado captura URL da foto, URL da capa, mini bio e bio completa, enviando tudo pelo backend sem upload e sem acesso direto ao Supabase.
- [x] Gates spec 008 Parte 2 admin: `npm run harness` exit 0; teste de contrato valida payload visual com normalizacao de campos vazios para `null`.
- [x] Publicacao Vercel da Parte 2 validada sem credenciais: bundle contem `avatarUrl`/`miniBio`, sem anchors, sem token manual e sem `localhost`.
- [x] Spec 009 implementada localmente: view `Advogados` agora consome `GET /v1/admin/lawyers`, exibe listagem real, busca por nome/OAB/cidade/UF, filtro por status, detalhe operacional seguro e atualizacao minima de status via `PATCH /v1/admin/lawyers/:id`.
- [x] Placeholder antigo da view `Advogados` removido; a UI nao informa mais que a listagem operacional fica para proximo ciclo.
- [x] Gates spec 009 admin: `npm run harness` exit 0; typecheck, 9 testes, build e smoke estrutural passaram.
- [x] Smoke visual local sem credenciais em `http://127.0.0.1:5175/login` confirmou login renderizado, ausencia de token manual e ausencia da mensagem antiga de listagem para proximo ciclo; evidencia segura em `harness-results/spec009-admin-login-local.png`.
- [x] Backend da spec 009 corrigido para hidratar `GET /v1/admin/lawyers` com `name`, `email`, `mainAreaId` e `secondaryAreaIds`, alem de persistir `lawyer_specialties` no cadastro.
- [x] Smoke autenticado local da spec 009 passou com credencial admin real do arquivo de testes, backend local apontando para Supabase real, geocoding stub local e limpeza final `remainingSpec009Profiles=0`; senha/token/service role nao foram impressos.

## Em Andamento

- [x] Integrar API admin para cadastro de advogado por CEP.
- [x] Executar smoke assistido com credencial admin real antes de staging/producao.
- [x] Validar formulario com token admin real contra backend/Supabase (smoke e2e no backend `scripts/admin-form-smoke.ts`: geocode/cep 200, lawyers list 200 `persistence=supabase`, create 201 + limpeza via service role; sem residuo).
- [x] Implementar spec 008 Parte 1 local com views reais, icones e logo arredondada.
- [x] Implementar spec 009 com gestao operacional de advogados usando contratos backend existentes.

## Bloqueios

- Nenhum bloqueio aberto para a spec 006 local. Para operar contra producao/Railway, repetir smoke proporcional no ambiente publicado.
- Admin Vercel publicado esta validado para o fluxo operacional principal. Negativo nao-admin publicado segue opcional/pendente ate haver credencial segura desse perfil no momento.
- Backend Railway passou a retornar `Access-Control-Allow-Origin` para `https://advogado20admin.vercel.app` apos o commit backend `844c048`; o browser carrega `/v1/areas` com `200` e sem falha.
- Spec 008 Parte 1 foi validada localmente; para operar em producao, ainda exige commit/push/deploy Vercel e smoke publicado proporcional.
- Spec 009 esta validada com smoke autenticado local. Antes de operar em producao, publicar admin/backend e repetir smoke proporcional no Vercel/Railway.
- Proximos ciclos devem ser iniciados pela raiz do projeto para carregar a governanca central `.codex/` e specs em `.codex/specs/`.

## Proximo Passo

Spec 009 esta `ADMIN_GESTAO_ADVOGADOS_SMOKE_AUTH_OK`. Proximo gate recomendado para admin: commit/push/deploy de admin e backend, seguido de smoke proporcional publicado no Vercel/Railway sem registrar PII sensivel.
