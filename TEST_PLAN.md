# Admin Test Plan - Meu Advogado 2.0

## Harness Obrigatorio

Comando principal:

- `npm run harness`

O harness executa:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`

## Smoke Final Obrigatorio

Todo ciclo admin deve validar:

- Login/guard ou mock controlado.
- Rota afetada abre.
- Formulario/lista principal renderiza.
- Erro de API tem estado visual.
- Build sem falha.

## Regressao Critica

- Login admin valido.
- Login com usuario nao-admin bloqueado.
- Logout limpa sessao e bloqueia rota privada.
- Token expirado/invalido retorna para login.
- Admin cadastra advogado com CEP valido.
- CEP invalido bloqueia salvamento.
- Admin altera status do advogado.
- Lista de advogados pagina.
- Urgencia pode ser marcada como resolvida.
- Cliente nao admin nao acessa rotas admin.

## Evidencias

Registrar comando, cwd, exit code, resultado e lacunas.

## Resultado Da Fundacao

Harness local passou com tipos, teste de contrato, build Vite e smoke estrutural. Smoke por servidor Vite respondeu HTTP 200 via `curl` em `http://127.0.0.1:5173`.

## Spec 006 - Login E Sessao

Implementacao validada por `npm run harness` com exit code 0: typecheck, 6 testes, build e smoke estrutural. O smoke local `GET http://127.0.0.1:5173/login` respondeu HTTP 200. Playwright validou a tela `/login` sem credencial real e salvou `harness-results/spec006-admin-login.png`.

Smoke assistido com credencial real executado em 2026-06-02 contra backend local:

- `/login` renderizou.
- admin valido acessou o painel.
- formulario de advogado por CEP funcionou apos login.
- cadastro descartavel foi criado e limpo via service role.
- logout removeu sessao e rota privada voltou para `/login`.
- usuario sem role `admin` nao acessou o painel.
- token/senha/service role/payload sensivel nao apareceram em logs ou evidencias.

Evidencias redigidas: `harness-results/spec006-admin-real-panel-redacted.png`, `harness-results/spec006-admin-real-created-redacted.png` e `harness-results/spec006-admin-real-non-admin-blocked-redacted.png`.

## Smoke Producao Vercel - 2026-06-02

Validacao sem credenciais reais:

- `https://advogado20admin.vercel.app/`: HTTP `200`, titulo `Meu Advogado 2.0 Admin`.
- `https://advogado20admin.vercel.app/login`: HTTP `404`.
- Tela publicada ainda mostra `Bearer token admin`.
- Bundle publicado aponta para `http://localhost:3333`, nao para Railway.
- Request visual falhou em `GET http://localhost:3333/v1/areas` com `ERR_CONNECTION_REFUSED`.
- Evidencias sem credenciais: `harness-results/vercel-admin-root-public.png` e `harness-results/vercel-admin-login-404.png`.

Veredito: `QUESTIONAR_DEPLOY_ADMIN_PRODUCAO`.

Gates pendentes para producao:

- Vercel deve servir build da spec 006 com `/login`.
- Bundle nao deve conter campo/token manual como caminho operacional.
- `VITE_API_BASE_URL` deve apontar para `https://advogado-back-production.up.railway.app`.
- Backend publicado deve responder `GET /v1/me`.
- Repetir smoke assistido com credencial admin real redigida e cadastro descartavel com limpeza.

## Smoke Producao Vercel Pos-Publicacao - 2026-06-02

Validacao sem credenciais reais apos admin commit `cb0b707` e backend commit `e621676`:

- `https://advogado20admin.vercel.app/`: HTTP `200`, titulo `Meu Advogado 2.0 Admin`.
- `https://advogado20admin.vercel.app/login`: HTTP `200`.
- `/login` renderizou Email, Senha e Entrar.
- Bundle publicado aponta para `https://advogado-back-production.up.railway.app` e nao para `localhost:3333`.
- Bundle nao contem campo/token manual como caminho operacional.
- Backend Railway respondeu `GET /v1/me` sem token com `401`.
- Browser falhou `GET https://advogado-back-production.up.railway.app/v1/areas` por CORS.
- Checks CORS: `OPTIONS /v1/me`, `/v1/admin/geocode/cep` e `/v1/admin/lawyers` retornaram `204`, mas sem `Access-Control-Allow-Origin` para `https://advogado20admin.vercel.app`.
- Bundle publicado nao contem `VITE_SUPABASE_ANON_KEY`; login real depende de env Vercel e rebuild.
- Evidencia sem credenciais: `harness-results/vercel-admin-login-updated.png`.

Veredito: `QUESTIONAR_ENV_ADMIN_PRODUCAO`.

Gates pendentes para producao:

- Configurar `VITE_SUPABASE_ANON_KEY` publica na Vercel sem registrar valor.
- Configurar `CORS_ORIGINS` no Railway incluindo `https://advogado20admin.vercel.app`.
- Redeployar Vercel/Railway se necessario.
- Repetir smoke assistido com credencial admin real redigida e cadastro descartavel com limpeza.
