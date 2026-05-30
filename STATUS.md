# Admin Status - Meu Advogado 2.0

**Ultima atualizacao:** 2026-05-30  
**Fase:** SPEC 002 UI ADMIN IMPLEMENTADA  
**Veredito:** OK_COM_RESSALVAS

## Concluido

- [x] Documentacao inicial do ambiente admin criada.
- [x] Responsabilidade de cadastro de advogado definida.
- [x] CEP obrigatorio no fluxo admin definido.
- [x] Scaffold React/Vite/TypeScript criado.
- [x] Shell administrativo placeholder criado.
- [x] Contratos iniciais de backend registrados em codigo.
- [x] Harness CLI, teste, build e smoke criados.
- [x] Ambiente admin passou a ser governado pela `.codex/` unica da raiz; copia local `Meu Advogado 2.0 - admin/.codex` removida.
- [x] Auth/roles backend reais ja existem para rotas admin no backend; integracao visual do admin ainda nao foi implementada.
- [x] Formulario admin de advogado implementado com Bearer token informado pelo operador.
- [x] UI consulta `POST /v1/admin/geocode/cep` e salva via `POST /v1/admin/lawyers`, sem acessar Supabase ou providers externos diretamente.
- [x] Harness admin passou com typecheck, 3 testes, build e smoke shell.

## Em Andamento

- [x] Integrar API admin para cadastro de advogado por CEP.
- [ ] Criar login visual admin para obter/gerenciar sessao sem colar token manualmente.
- [x] Validar formulario com token admin real contra backend/Supabase (smoke e2e no backend `scripts/admin-form-smoke.ts`: geocode/cep 200, lawyers list 200 `persistence=supabase`, create 201 + limpeza via service role; sem residuo).

## Bloqueios

- Login visual admin ainda nao implementado; a tela consome Bearer token informado pelo operador.
- Smoke real do cadastro com token admin valido ainda pendente.
- Proximos ciclos devem ser iniciados pela raiz do projeto para carregar a governanca central `.codex/` e specs em `.codex/specs/`.

## Proximo Passo

Formulario validado com token admin real contra backend/Supabase (smoke e2e). Proximo: evoluir o login visual admin para dispensar o token colado manualmente.
