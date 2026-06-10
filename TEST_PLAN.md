# Admin Test Plan - Meu Advogado 2.0

## Spec 012

- Confirmar que a gestao renderiza somente os registros ativos retornados pela API.
- Confirmar que cadastrar novamente uma localidade inativa a faz reaparecer.
- Mapa create/edit, CEP automatico, resposta antiga ignorada e coordenada no POST/PATCH.
- Estado/cidade dependentes, disponibilidade, bloqueios e gestao simples do catalogo sem mapa.

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

## Spec 009 - Gestao Operacional De Advogados

Validacao local executada em 2026-06-03:

- `npm run harness` exit code `0`.
- Typecheck passou.
- Testes de contrato passaram com 9 testes.
- Build Vite passou.
- Smoke estrutural confirmou shell, login/sessao, gestao de advogados, views reais, logo e contratos.
- Smoke visual local sem credenciais em `http://127.0.0.1:5175/login` confirmou `Acesso administrativo`, `Email`, `Senha`, `Entrar`, ausencia de `Bearer token admin` e ausencia da mensagem antiga de listagem para proximo ciclo.
- Evidencia visual segura: `harness-results/spec009-admin-login-local.png`.
- Smoke autenticado local com credencial admin real passou em ambiente controlado: admin `http://127.0.0.1:5176`, backend `http://127.0.0.1:3334`, persistencia Supabase real e geocoding stub local.
- Fluxo validado: login, `Advogados`, `Novo Advogado`, consulta CEP, cadastro descartavel, busca/filtro, detalhe seguro sem CEP/coordenada exata, alteracao de status via `PATCH`, logout e limpeza.
- Limpeza final confirmou `remainingSpec009Profiles=0`.

Lacuna:

- Repetir smoke proporcional apos deploy Vercel/Railway antes de operar em producao.

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
- Redeployar Vercel/Railway se necessario.
- Repetir smoke assistido com credencial admin real redigida e cadastro descartavel com limpeza.

## Smoke Producao CORS Pos-Fix Backend - 2026-06-02

Validacao sem credenciais reais apos backend commit `844c048`:

- `GET /v1/areas`: `200`, `Access-Control-Allow-Origin: https://advogado20admin.vercel.app`.
- `GET /v1/me` sem token: `401`, `Access-Control-Allow-Origin: https://advogado20admin.vercel.app`.
- `OPTIONS /v1/me`: `204`, `Access-Control-Allow-Origin: https://advogado20admin.vercel.app`.
- `OPTIONS /v1/admin/geocode/cep`: `204`, `Access-Control-Allow-Origin: https://advogado20admin.vercel.app`.
- `OPTIONS /v1/admin/lawyers`: `204`, `Access-Control-Allow-Origin: https://advogado20admin.vercel.app`.
- Playwright em `/login` carregou `GET /v1/areas` com `200` e sem falha.
- Bundle Vercel ainda nao contem `VITE_SUPABASE_ANON_KEY`.

Veredito: `QUESTIONAR_ENV_ADMIN_PRODUCAO`.

Gate pendente daquele momento:

- Configurar `VITE_SUPABASE_ANON_KEY` publica na Vercel sem registrar valor.
- Repetir smoke assistido com credencial admin real redigida e cadastro descartavel com limpeza.

## Smoke Producao Vercel Pos-Env Supabase - 2026-06-02

Validacao sem credenciais reais apos usuario informar env Vercel configurada e login real bem-sucedido:

- `https://advogado20admin.vercel.app/login`: HTTP `200`.
- `/login` renderizou Email, Senha e Entrar, sem campo/token manual.
- Rota privada sem sessao redirecionou para `/login`.
- Bundle publicado aponta para `https://advogado-back-production.up.railway.app` e nao para `localhost`.
- Bundle contem configuracao Supabase publica suficiente para login; anon key nao foi impressa nem registrada.
- `GET /v1/areas` retornou `200` com CORS para Vercel.
- `GET /v1/me` sem token retornou `401` com CORS para Vercel.
- `POST /v1/admin/geocode/cep` e `POST /v1/admin/lawyers` sem token retornaram `401` com CORS para Vercel.
- Preflights de `/v1/me`, `/v1/admin/geocode/cep` e `/v1/admin/lawyers` retornaram `204` com CORS para Vercel.

Veredito: `QUESTIONAR_CREDENCIAL_NECESSARIA`.

Gate pendente para producao:

- Repetir smoke assistido com credencial admin real fornecida no momento: login, painel, CEP, cadastro descartavel, limpeza, logout, rota privada bloqueada e negativo nao-admin se houver credencial segura.

## Smoke Producao Vercel Autenticado - 2026-06-02

Validacao assistida com credencial admin real digitada pelo usuario no navegador:

- Login real abriu painel autenticado com role admin.
- Painel publicado manteve formulario operacional sem token manual.
- CEP valido foi consultado pela UI via backend Railway.
- Advogado descartavel foi cadastrado pela UI via `POST /v1/admin/lawyers`.
- Limpeza foi executada via service role local mirando apenas identificadores unicos do smoke.
- Verificacao final da limpeza: `remainingProfiles=0`, `remainingLawyers=0`.
- Logout removeu sessao e a rota privada voltou para `/login`.
- Negativo nao-admin nao executado por falta de credencial segura desse perfil.

Veredito: `VALIDADA_SMOKE_ADMIN_PRODUCAO`.
