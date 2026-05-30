# Admin API Contracts - Meu Advogado 2.0

**Estado:** UI spec 002 integrada aos contratos backend

## Dashboard

- `GET /v1/admin/dashboard`

## Advogados

- `GET /v1/admin/lawyers`
- `POST /v1/admin/lawyers`
- `PATCH /v1/admin/lawyers/:id`
- `PATCH /v1/admin/lawyers/:id/status`

Cadastro deve aceitar:

- dados pessoais;
- OAB/UF;
- especialidades;
- WhatsApp;
- CEP e endereco;
- foto/capa;
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
backend, usando Bearer token admin informado pelo operador. Login visual admin e
smoke com token real ainda estao pendentes.
