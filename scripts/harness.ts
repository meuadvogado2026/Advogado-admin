import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const stepsToRun = [
  { command: "npm run typecheck", objective: "Validar tipos TypeScript do admin." },
  { command: "npm run test", objective: "Executar testes de contrato do admin." },
  { command: "npm run build", objective: "Gerar build web para Vercel." },
  { command: "npm run smoke", objective: "Validar shell administrativo minimo." }
];

const steps = stepsToRun.map((step) => {
  const result = spawnSync(step.command, { cwd, shell: true, encoding: "utf8" });
  return { ...step, exitCode: result.status, result: `${result.stdout}\n${result.stderr}`.trim() };
});

const exitCode = steps.some((step) => step.exitCode !== 0) ? 1 : 0;
const report = {
  environment: "admin",
  cwd,
  objective: "Harness admin: tipos, testes, build e smoke de login/sessao.",
  exitCode,
  result: exitCode === 0 ? "OK" : "FALHOU",
  gaps: ["Smoke visual com credencial admin real ainda deve ser executado antes de operar em staging/producao."],
  steps
};

await mkdir("harness-results", { recursive: true });
await writeFile("harness-results/latest.json", JSON.stringify(report, null, 2));
await writeFile(
  "harness-results/latest.md",
  `# Harness Admin\n\n- cwd: ${cwd}\n- objetivo: ${report.objective}\n- exit code: ${exitCode}\n- resultado: ${report.result}\n- lacunas: ${report.gaps.join("; ")}\n`
);

console.log(JSON.stringify(report, null, 2));
process.exit(exitCode);
