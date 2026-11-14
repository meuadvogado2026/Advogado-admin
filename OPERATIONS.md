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
