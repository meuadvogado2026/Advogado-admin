# Admin Status - Meu Advogado 2.0

## Spec 012 - 2026-06-10

- Refinamento local: estados/cidades inativos nao aparecem; a tela informa que novo
  cadastro com a mesma chave reativa o registro existente e remove status redundante.
  Backend permanece autoridade da reativacao. Harness admin OK.
- Ajuste visual em 2026-06-10: a gestao de estados/cidades passou a deixar os formularios
  apenas para cadastro, mover os registros para o painel lateral e paginar estados e
  cidades. Gates admin: contratos, typecheck, build e harness OK.
- Ajuste operacional em 2026-06-10: registros de estados/cidades viraram linhas com
  status e acoes separadas. Cidade pode ser apagada pelo painel; estado so habilita
  apagar quando nao possui cidade ativa, mantendo o backend como autoridade final para
  vinculos. Gates admin: contratos, typecheck, build e harness OK.
- Ajuste visual em 2026-06-10: o painel de registros agora abre `Estados` e `Cidades`
  por botoes separados e cada item exibe apenas um `X` para exclusao. Gates admin:
  contratos, typecheck, build e harness OK.
- Hotfix em 2026-06-10: `DELETE` de estados/cidades deixou de enviar
  `Content-Type: application/json` sem body, removendo o erro Fastify
  `FST_ERR_CTP_EMPTY_JSON_BODY`. Smoke real controlado validou bloqueio `409` com
  cidade ativa e exclusao `204` apos inativar a cidade.

CEP automatico, mapa create/edit do escritorio, coordenada final, seletores dependentes
e gestao simples de estados/cidades implementados. A tela de estados/cidades nao usa
mapa nem centroide; DF fica pre-cadastrado pela migration `0012`. Smoke autenticado
cross-stack permanece pendente.

**Ultima atualizacao:** 2026-06-10
**Fase:** ADMIN MVP / PRODUCAO VALIDADA
**Veredito:** ADMIN_LAYOUT_DARK_LOCAL_OK / ADMIN_EDICAO_ADVOGADO_PATCH_PARCIAL_OK / PERFIL_ADVOGADO_SOCIAIS_PRODUCAO_OK / MIGRATION_0006_APLICADA_OK / MIGRATION_0005_APLICADA_OK / ADMIN_OPERACIONAL_ORACOES_USUARIOS_MIDIA_PRODUCAO_OK / MIGRATION_0004_APLICADA_OK

- [x] Contrato admin atualizado em 2026-06-10 para validar os nomes acentuados recebidos de `/v1/areas`: `Direito de Família`, `Direito Previdenciário` e `Direito Tributário`.
- [x] Integracao do catalogo com 8 especialidades validada localmente em 2026-06-10: o formulario admin continua consumindo `/v1/areas` do backend e a cobertura de contrato confirma `Direito Empresarial` e `Direito Tributario` entre as 8 opcoes. Gates: `npm run typecheck`, 22 testes, `npm run build` e `npm run harness` exit 0. Disponibilidade em producao depende da aplicacao/publicacao backend da migration `0010`.
- [x] Primeiro acesso do advogado publicado no commit `c18fae3`: cadastro novo mostra convite enviado pelo backend e detalhe operacional exibe `Sem acesso`, `Convite enviado`, `Troca de senha pendente` ou `Acesso ativo`; legados sem convite ganham botao `Ativar acesso`, chamando `POST /v1/admin/lawyers/:id/access-invite`. Admin nao exibe senha, token, action link ou service role. Gates: `npm run harness` exit 0 (19 testes, build e smoke), Vercel `/login` 200 e bundle publicado contem `access-invite`.
- [x] Hotfix convite advogado publicado em 2026-06-05 no commit `cd8b9df`: criada pagina publica `/primeiro-acesso` para receber redirect do Supabase, tratar link expirado e definir senha via backend `POST /v1/auth/change-password` sem salvar token do convite. Gates: `npm run harness` exit 0 (20 testes/build/smoke), Vercel `/primeiro-acesso` 200 e bundle publicado contem `Primeiro acesso`/`change-password`. Pendente operacional: reenviar convite expirado.

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
- [x] Correcao/garantia de persistencia do status de aprovacao do advogado coberta por teste backend: `PATCH /v1/admin/lawyers/:id` persiste status e a listagem subsequente reflete a escolha; aprovacao sem coordenada valida segue bloqueada pelo backend.
- [x] Formulario admin ganhou upload de foto de perfil e capa via `POST /v1/admin/lawyer-media`, preview de imagem e fallback por URL HTTPS.
- [x] View `Oracoes` criada para carregar pedidos recebidos via `GET /v1/admin/prayer-requests`.
- [x] View `Usuarios` criada para listar usuarios cadastrados, visualizar dados operacionais e bloquear/desbloquear via `PATCH /v1/admin/users/:id`.
- [x] Gates locais do ciclo ampliado: admin `npm run typecheck`, `npm run test`, `npm run build`, `npm run harness` exit 0; Browser local em `http://localhost:5176/login` confirmou login, sidebar com `Oracoes`/`Usuarios` e console sem erros.
- [x] Ciclo ampliado publicado no Vercel pelo commit admin `783e76e`, junto do backend Railway `a0067c4`, apos migration `0004` aplicada no Supabase aprovado.
- [x] Smoke publico producao: `/login` HTTP `200`, bundle novo sem `localhost`, sem token manual, endpoints admin novos sem token retornando `401` no backend e CORS `204` para a origem Vercel.
- [x] Smoke autenticado assistido producao: painel admin abriu, advogados listaram, status persistiu apos recarga, upload de imagem pequena funcionou, views `Oracoes` e `Usuarios` abriram e bloqueio/desbloqueio de usuario descartavel seguro passou com limpeza dos dados de teste.
- [x] Melhorias publicadas em 2026-06-04 pelo commit `bf93a39`: view `Advogados` ganhou acao de editar advogado usando `PATCH /v1/admin/lawyers/:id`; view `Oracoes` marca/reabre leitura com estado visual; view `Parceiros` permite upload, preview e cadastro de logos. Admin `npm run harness` exit 0, Browser local confirmou `/login`, smoke publico basico `/login` retornou 200 e smoke funcional backend validou oracao lida/parceiro com limpeza.
- [x] Formulario admin de advogado ganhou campos opcionais HTTPS para Instagram, LinkedIn, Facebook e site profissional, enviados ao backend junto dos demais dados operacionais. Publicacao social fechada em 2026-06-04 com Vercel `/login` 200 e bundle sem `localhost`; backend/mobile publicados e validados.
- [x] Bugfix publicado no commit `801cdc1`: edicao de advogado agora envia PATCH parcial comparando contra o registro original, permitindo salvar status/redes sociais sem depender de cadastro completo legado e sem reconsultar CEP quando o CEP nao mudou. Admin `npm run harness` exit 0 e Vercel `/login` 200 com bundle novo sem `localhost`.
- [x] Layout escuro do painel admin implementado localmente em 2026-06-04 usando a referencia visual apenas para layout/cores, preservando a estrutura de menus (`Dashboard`, `Advogados`, `Novo Advogado`, `Oracoes`, `Usuarios`, `Parceiros`, `Operacao`). Login passou a renderizar fora do shell, sem pre-visualizacao dos menus. Gates: `npm run typecheck`, `npm run test`, `npm run build`, `npm run smoke`, `npm run harness` exit 0; smoke visual local confirmou 7 abas, 4 KPIs, sidebar escura e ausencia de sidebar no `/login`.
- [x] Melhorias admin publicadas em 2026-06-04 pelo commit `30439d3`: criacao/edicao de advogado agora preserva especialidades secundarias, lista de advogados exibe foto circular/iniciais, Advogados/Usuarios/Oracoes ganharam paginacao local e cache curto em memoria de sessao, tela de Oracoes ganhou cards interativos com filtros e resumo, e a escala tipografica do painel foi reduzida. Gates: `npm run harness` exit 0 com 19 testes; smoke visual autenticado mockado confirmou avatares, paginacao, chips de especialidade, cards de oracao e ausencia de overflow mobile. Vercel `/login` retornou 200 com bundle novo contendo especialidades secundarias/paginacao/cache/oracoes novas, sem `localhost` e sem token manual.

## Em Andamento

- [x] Integrar API admin para cadastro de advogado por CEP.
- [x] Executar smoke assistido com credencial admin real antes de staging/producao.
- [x] Validar formulario com token admin real contra backend/Supabase (smoke e2e no backend `scripts/admin-form-smoke.ts`: geocode/cep 200, lawyers list 200 `persistence=supabase`, create 201 + limpeza via service role; sem residuo).
- [x] Implementar spec 008 Parte 1 local com views reais, icones e logo arredondada.
- [x] Implementar spec 009 com gestao operacional de advogados usando contratos backend existentes.
- [x] Implementar painel admin ampliado com midia, oracoes e usuarios.
- [x] Implementar melhorias locais de edicao de advogado, oracao lida e parceiros.

## Bloqueios

- Nenhum bloqueio aberto para a spec 006 local. Para operar contra producao/Railway, repetir smoke proporcional no ambiente publicado.
- Admin Vercel publicado esta validado para o fluxo operacional principal. Negativo nao-admin publicado segue opcional/pendente ate haver credencial segura desse perfil no momento.
- Backend Railway passou a retornar `Access-Control-Allow-Origin` para `https://advogado20admin.vercel.app` apos o commit backend `844c048`; o browser carrega `/v1/areas` com `200` e sem falha.
- Admin operacional ampliado esta publicado e validado em producao. Migration `0004_admin_users_blocking.sql` aplicada manualmente pelo usuario no Supabase SQL Editor aprovado; verificacao REST redigida confirmou `profiles.blocked_at`.
- Melhorias de edicao/oracao/parceiros ja foram publicadas e a migration `0005_admin_prayers_partners.sql` foi aplicada; smoke funcional publicado validou oracao lida e parceiro descartavel com limpeza.
- Negativo nao-admin publicado segue opcional/pendente ate haver credencial segura desse perfil no momento.
- Proximos ciclos devem ser iniciados pela raiz do projeto para carregar a governanca central `.codex/` e specs em `.codex/specs/`.

## Proximo Passo

Redirect publico `/primeiro-acesso` esta publicado e permitido no Supabase. Falta apenas
o smoke humano de definir senha a partir de convite recebido em e-mail real valido, sem
registrar senha, token ou action link. O restante do admin operacional permanece publicado
e validado.
