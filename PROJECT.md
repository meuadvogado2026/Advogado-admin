# Admin Project - Meu Advogado 2.0

**Fase:** fundacao inicial executavel  
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

## Scaffold Atual

- React + Vite + TypeScript.
- Shell administrativo com sidebar, KPIs, busca e tabela placeholder de advogados.
- Contratos locais apontando para backend (`/v1/admin/lawyers`) e sem acesso direto ao Supabase.
- Harness CLI e smoke estrutural.

## Scripts

- `npm run dev`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`
- `npm run harness`
