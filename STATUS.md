# Admin Status - Meu Advogado 2.0

**Ultima atualizacao:** 2026-06-02
**Fase:** ADMIN MVP / PRODUCAO VERCEL QUESTIONAR ENV
**Veredito:** QUESTIONAR_ENV_ADMIN_PRODUCAO

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

## Em Andamento

- [x] Integrar API admin para cadastro de advogado por CEP.
- [x] Executar smoke assistido com credencial admin real antes de staging/producao.
- [x] Validar formulario com token admin real contra backend/Supabase (smoke e2e no backend `scripts/admin-form-smoke.ts`: geocode/cep 200, lawyers list 200 `persistence=supabase`, create 201 + limpeza via service role; sem residuo).

## Bloqueios

- Nenhum bloqueio aberto para a spec 006 local. Para operar contra producao/Railway, repetir smoke proporcional no ambiente publicado.
- Admin Vercel publicado esta alinhado ao login da spec 006, mas o build publicado nao contem `VITE_SUPABASE_ANON_KEY`; configurar a env publica na Vercel e rebuildar.
- Backend Railway nao retornou `Access-Control-Allow-Origin` para `https://advogado20admin.vercel.app`; o browser bloqueia `GET /v1/areas` por CORS antes do login.
- Proximos ciclos devem ser iniciados pela raiz do projeto para carregar a governanca central `.codex/` e specs em `.codex/specs/`.

## Proximo Passo

Spec 006 segue validada localmente, mas o admin publicado esta `QUESTIONAR_ENV_ADMIN_PRODUCAO`. Proximo ciclo recomendado para admin: configurar `VITE_SUPABASE_ANON_KEY` na Vercel, garantir CORS Railway para a origem publicada, redeployar e repetir smoke `/login -> admin -> painel -> CEP -> cadastro descartavel -> logout`.
