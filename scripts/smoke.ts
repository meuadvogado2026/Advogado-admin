import { existsSync } from "node:fs";

const requiredFiles = ["index.html", "src/App.tsx", "src/contracts.ts"];
const missing = requiredFiles.filter((file) => !existsSync(file));

if (missing.length > 0) {
  throw new Error(`Smoke admin falhou. Arquivos ausentes: ${missing.join(", ")}`);
}

console.log("Smoke admin OK: shell React, contracts e entrada Vite existem.");
