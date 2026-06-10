# Admin Architecture - Advogado 2.0

## Fronteiras

Admin web chama API backend. Nao consulta Supabase diretamente para regra de negocio.

## Modulos Previstos

- `auth`: sessao e guards.
- `dashboard`: KPIs.
- `lawyers`: cadastro, edicao, status e CEP.
- `clients`: consulta.
- `urgent-calls`: atendimento e resolucao.
- `benefits`: CRUD.
- `partners`: CRUD.
- `settings`: configuracoes futuras.

## Rotas Previstas

- `/login`
- `/`
- `/advogados`
- `/advogados/novo`
- `/advogados/:id`
- `/clientes`
- `/urgencias`
- `/beneficios`
- `/parceiros`
- `/configuracoes`

## Regras

- Todas as rotas privadas exigem role `admin`.
- Formularios validam client-side para UX e server-side na API.
- Tabelas devem ser paginadas.
- Acoes criticas geram audit log no backend.

## Estrutura Atual

- `src/App.tsx`: shell admin, login/sessao, cadastro por CEP e gestao operacional de advogados.
- `src/contracts.ts`: endpoints consumidos pelo admin.
- `src/styles/app.css`: tokens e layout escuro/dourado iniciais.
- `scripts/harness.ts`: CLI de validacao do ambiente.

Ressalva: smoke visual com credencial admin real ainda deve ser executado antes de staging/producao.

## Spec 006 - Auth Admin

Implementado:

- `/login` como rota publica operacional.
- Rotas privadas protegidas por guard frontend e, obrigatoriamente, por role guard backend.
- Login pode usar Supabase Auth REST com anon key publica somente para autenticacao; regra de negocio e autorizacao de dominio seguem no backend.
- Validacao de role deve passar pelo backend (`GET /v1/me` ou equivalente).
- Sessao local deve permitir logout e limpeza em caso de token expirado/invalido.
- O formulario de advogado deixou de depender de Bearer token colado manualmente.

## Spec 009 - Gestao De Advogados

Implementado:

- View `Advogados` com listagem via `GET /v1/admin/lawyers`.
- Busca local por nome, OAB, cidade e UF.
- Filtro local por status.
- Painel de detalhe operacional seguro.
- Atualizacao minima de status via `PATCH /v1/admin/lawyers/:id`.

Regras:

- O admin nao mostra coordenada exata nem CEP completo no detalhe.
- Backend continua autoridade para role admin e regra de aprovacao com coordenada valida.
- Sem backend/schema novo neste ciclo.
