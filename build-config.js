const fs = require("fs");
const path = require("path");
const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_ANON_KEY || "").trim();
const ai = (process.env.AI_ENDPOINT || "/api/summarize").trim();
const file = path.join(__dirname, "..", "public", "js", "config.js");
if (!url && !key) {
  console.log("[build-config] SUPABASE_URL/SUPABASE_ANON_KEY não definidos — mantendo modo local.");
  process.exit(0);
}
if (!/^https:\/\/.+\.supabase\.(co|in)$/.test(url) || !key) {
  console.error("[build-config] SUPABASE_URL inválida ou SUPABASE_ANON_KEY ausente.");
  process.exit(1);
}
const out = `'use strict';
const CONFIG=${JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON_KEY: key, AI_ENDPOINT: ai }, null, 2)};
`;
fs.writeFileSync(file, out);
console.log("[build-config] config.js gerado com Supabase habilitado.");
