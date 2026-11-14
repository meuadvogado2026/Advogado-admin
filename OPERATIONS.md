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


## SPEC-021 - Gestao administrativa / 2026-11-14

Novo Advogado e Operacao ocultos na navegacao; atalho global removido; cadastro/edicao preservado em Advogados. Cidades carregam todas as paginas incluindo inativas, mas lista/opcoes mostram so ativas. Cadastro repetido de ativa informa o registro e posiciona sua pagina; inativa oferece Reativar/Cancelar, usando PATCH active=true sem recriar. Card de oracao quebra nomes/emails longos e mantem botao dentro. Harness32 testes/tipos/build/smoke e Chrome com fixtures nos tamanhos1366/1024/768/390 OK. API requer includeInactive=true para detectar inativas (publicar backend antes do admin).
