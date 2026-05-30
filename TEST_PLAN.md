# Admin Test Plan - Meu Advogado 2.0

## Harness Obrigatorio

Comando principal:

- `npm run harness`

O harness executa:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`

## Smoke Final Obrigatorio

Todo ciclo admin deve validar:

- Login/guard ou mock controlado.
- Rota afetada abre.
- Formulario/lista principal renderiza.
- Erro de API tem estado visual.
- Build sem falha.

## Regressao Critica

- Admin cadastra advogado com CEP valido.
- CEP invalido bloqueia salvamento.
- Admin altera status do advogado.
- Lista de advogados pagina.
- Urgencia pode ser marcada como resolvida.
- Cliente nao admin nao acessa rotas admin.

## Evidencias

Registrar comando, cwd, exit code, resultado e lacunas.

## Resultado Da Fundacao

Harness local passou com tipos, teste de contrato, build Vite e smoke estrutural. Smoke por servidor Vite respondeu HTTP 200 via `curl` em `http://127.0.0.1:5173`.
