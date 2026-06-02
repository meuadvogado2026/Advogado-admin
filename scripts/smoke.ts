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
  app.includes('href="#')
) {
  throw new Error("Smoke admin falhou. Views reais, icones ou logo arredondada da spec 008 ausentes.");
}

console.log("Smoke admin OK: shell React, login/sessao, views reais, logo, contracts e entrada Vite existem.");
