# Admin API Contracts - Meu Advogado 2.0

**Estado:** UI spec 009 integrada aos contratos backend de gestao de advogados

## Dashboard

- `GET /v1/admin/dashboard`

## Advogados

- `GET /v1/admin/lawyers`
- `POST /v1/admin/lawyers`
- `PATCH /v1/admin/lawyers/:id`

Cadastro deve aceitar:

- dados pessoais;
- OAB/UF;
- especialidades;
- WhatsApp;
- CEP e endereco;
- URL HTTPS de foto/capa, mini bio e bio completa, sem upload;
- status/plano.

## CEP

- `POST /v1/admin/geocode/cep`

Retorna endereco e coordenadas ou erro validavel.

## Operacao

- `GET /v1/admin/urgent-calls`
- `PATCH /v1/admin/urgent-calls/:id`
- `GET /v1/admin/clients`
- `CRUD /v1/admin/benefits`
- `CRUD /v1/admin/partners`

## Erros

- `401`: nao autenticado.
- `403`: nao admin.
- `422`: validacao.
- `429`: rate limit.
- `500`: erro interno.

## Estado Atual

O admin consome contratos locais em `src/contracts.ts`. A UI da spec 002 chama
`GET /v1/areas`, `POST /v1/admin/geocode/cep` e `POST /v1/admin/lawyers` pelo
backend. Antes da spec 006 o fluxo usava Bearer token admin informado pelo operador;
agora o token vem da sessao admin autenticada. O fluxo foi validado com token admin
real contra backend/Supabase pelo smoke e2e `Meu Advogado 2.0 - back/scripts/admin-form-smoke.ts`,
incluindo geocode, list, create e limpeza automatica via service role. A spec 006
validou login visual admin, sessao, logout, rota privada bloqueada e usuario nao-admin
bloqueado em smoke assistido.

Spec 008 Parte 2 ampliou o cadastro para enviar `avatarUrl`, `coverUrl`, `miniBio` e
`fullBio` pelo backend. URLs inseguras/invalidas sao normalizadas pelo backend para
`null`; o admin nao faz upload nem acessa Supabase diretamente.

Spec 009 implementou gestao operacional local de advogados na UI:

- `GET /v1/admin/lawyers` carrega a listagem com Bearer token da sessao admin.
- A listagem retorna identidade operacional hidratada pelo backend: `name`, `email`, OAB, status, `mainAreaId` e `secondaryAreaIds`.
- Busca e filtro por status sao locais sobre a lista retornada.
- O detalhe operacional nao exibe CEP completo nem coordenada exata; mostra apenas o estado `Coordenada validada`/`Coordenada pendente`.
- `PATCH /v1/admin/lawyers/:id` atualiza status com payload minimo `{ "status": "..." }`.
- A regra de aprovacao com coordenada valida permanece no backend.
- `POST /v1/admin/lawyers` persiste as especialidades em `lawyer_specialties`; sem acesso direto do admin ao Supabase.

## Spec 006 - Login E Sessao Admin

Contrato alvo:

- Login visual admin com email/senha usando Supabase Auth REST com anon key publica.
- Validacao de role por backend em `GET /v1/me`.
- Todas as rotas operacionais admin continuam exigindo `Authorization: Bearer <token>` com role `admin`.

Regras:

- O admin nao acessa tabelas Supabase para regra de negocio.
- Service role nunca vai para o admin.
- Senha nao e persistida.
- Token completo nao deve aparecer em logs, docs, console ou harness.
- Usuario autenticado sem role `admin` recebe bloqueio seguro.
