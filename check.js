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
const html = fs.readFileSync(path.join(pub, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)="\/([^"#?]+)"/g)].map((m) => m[1]);
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
