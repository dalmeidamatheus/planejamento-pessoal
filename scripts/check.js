const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const root = path.join(__dirname, "..");
const pub = path.join(root, "public");
let bad = 0;
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
}
for (const f of [...walk(pub), ...walk(path.join(root, "api")), ...walk(path.join(root, "scripts"))].filter((f2) => f2.endsWith(".js"))) {
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
  } catch (e) {
    bad++;
    console.error("✗ sintaxe:", path.relative(root, f), "\n", String(e.stderr).split("\n").slice(0, 4).join("\n"));
  }
}
/* BARREIRA DE FINANÇAS: arquivos que conversam com IA não podem tocar em dados financeiros (veja lib/guard.js). */
const AI_FILES = ["lib/ai.js", "lib/guard.js", "api/summarize.js", "api/ocr.js", "api/transcribe.js", "api/diet.js", "api/ai-status.js", "public/js/core/diet.js", "public/js/core/summarizer.js", "public/js/core/ocr.js", "public/js/core/transcriber.js", "public/js/core/voicecmd.js", "public/js/core/aistatus.js", "public/js/modules/notes/summary.js"];
const FIN = /(^|[^\w.])S\.(tx|recur|cards|budgets|goals|assets|divs)\b|\bS\.settings\.(salary|opening|cashNow)\b|\b(monthTx|totals|cashAvailable|assetVal|netWorth)\s*\(|JSON\.stringify\(\s*S\s*[,)]|\bpushCloud\b|user_data/;
for (const f of AI_FILES) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  const m = fs.readFileSync(p, "utf8").match(FIN);
  if (m) {
    bad++;
    console.error("✗ barreira de finanças: " + f + " usa dado financeiro (" + m[0] + "). Arquivos de IA não podem ler finanças.");
  }
}
const refs = [];
for (const page of ["index.html", "m/index.html"]) {
  const html = fs.readFileSync(path.join(pub, page), "utf8");
  refs.push(...[...html.matchAll(/(?:src|href)="\/([^"#?]+)"/g)].map((m) => m[1]));
}
for (const r of refs) if (!fs.existsSync(path.join(pub, r))) {
  bad++;
  console.error("✗ arquivo referenciado não existe:", r);
}
const used = new Set(refs);
for (const f of walk(path.join(pub, "js")).map((f2) => path.relative(pub, f2).replace(/\\/g, "/")))
  if (!used.has(f)) console.warn("! não referenciado no index.html:", f);
console.log(bad ? `
${bad} problema(s).` : `✓ ok — ${refs.length} arquivos referenciados, sintaxe válida.`);
process.exit(bad ? 1 : 0);
