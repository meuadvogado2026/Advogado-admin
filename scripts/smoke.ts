import { existsSync } from "node:fs";

const requiredFiles = ["index.html", "src/App.tsx", "src/contracts.ts", "src/authApi.ts", "src/assets/logo-blue.png"];
const missing = requiredFiles.filter((file) => !existsSync(file));

if (missing.length > 0) {
  throw new Error(`Smoke admin falhou. Arquivos ausentes: ${missing.join(", ")}`);
}

const app = await import("node:fs").then(({ readFileSync }) => readFileSync("src/App.tsx", "utf8"));

if (
  !app.includes("activeView") ||
  !app.includes("nav-button") ||
  !app.includes("login-logo") ||
  !app.includes("sidebar-logo") ||
  !app.includes("fetchLawyers") ||
  !app.includes("handleStatusChange") ||
  !app.includes("Gestao operacional") ||
  app.includes("A listagem operacional completa fica para o proximo ciclo") ||
  app.includes('href="#')
) {
  throw new Error("Smoke admin falhou. Gestao real, views, icones ou logo arredondada ausentes.");
}

console.log("Smoke admin OK: shell React, login/sessao, gestao de advogados, views reais, logo, contracts e entrada Vite existem.");
