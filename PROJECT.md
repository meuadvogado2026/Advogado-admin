# Admin Project - Meu Advogado 2.0

**Fase:** admin MVP com gestao operacional de advogados local / spec 009 implementada
**Stack alvo:** React web + TypeScript  
**Hospedagem alvo:** Vercel

## Objetivo

Construir o painel administrativo para operar a plataforma Meu Advogado 2.0.

## Responsabilidades

- Login/admin guard.
- Dashboard operacional.
- Cadastro e edicao de advogados.
- CEP obrigatorio no cadastro do advogado.
- Aprovar, reprovar, suspender ou inativar advogado.
- Gerenciar urgencias.
- Gerenciar beneficios VIP.
- Gerenciar parceiros.
- Consultar usuarios/clientes.

## Fora De Escopo

- Cadastrar cliente manualmente no MVP, salvo necessidade operacional.
- Consultar Supabase direto para regra de negocio.
- Fazer deploy sem smoke pos-deploy.

## Fontes De Verdade

- `../DOCUMENTACAO_TECNICA.md`
- `../.codex/SPEC_Specs/SPEC_MeuAdvogado20_SDD.md`
- `../Telas/painel_administrativo_web`

## Estado Atual

- React + Vite + TypeScript.
- Shell administrativo com sidebar e formulario de cadastro de advogado.
- View `Advogados` com listagem operacional, filtros, detalhe seguro e alteracao de status via backend.
- UI da spec 002 consulta `GET /v1/areas`, `POST /v1/admin/geocode/cep` e salva via `POST /v1/admin/lawyers`.
- Contratos locais apontam para backend e nao acessam Supabase, BrasilAPI ou Nominatim diretamente.
- Formulario validado com token admin real contra backend/Supabase por smoke e2e no backend, com limpeza automatica.
- Login visual admin implementado na spec 006: `/login`, sessao local, guard, validacao de role via backend e logout substituem o Bearer token manual.
- Spec 009 removeu o placeholder da listagem e passou a consumir `GET/PATCH /v1/admin/lawyers`.
- Harness CLI e smoke estrutural.

## Scripts

- `npm run dev`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`
- `npm run harness`
