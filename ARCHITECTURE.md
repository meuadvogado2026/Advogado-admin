# Admin Architecture - Meu Advogado 2.0

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

- `src/App.tsx`: shell admin placeholder.
- `src/contracts.ts`: endpoints consumidos pelo admin.
- `src/styles/app.css`: tokens e layout escuro/dourado iniciais.
- `scripts/harness.ts`: CLI de validacao do ambiente.

Ressalva: guard admin ainda nao foi implementado; o shell e local/mocked.
