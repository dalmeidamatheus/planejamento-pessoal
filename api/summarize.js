const MAX_CHARS = 6e4;
const { userFromToken, bearer } = require("../lib/auth");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "IA não configurada" });
  if (!await userFromToken(bearer(req))) return res.status(401).json({ error: "Não autenticado" });
  let text = "";
  try {
    text = String((typeof req.body === "string" ? JSON.parse(req.body) : req.body)?.text || "");
  } catch {
    return res.status(400).json({ error: "JSON inválido" });
  }
  text = text.trim().slice(0, MAX_CHARS);
  if (text.length < 40) return res.status(400).json({ error: "Texto muito curto" });
  const prompt = `Você recebe a transcrição (em português) de uma reunião. Responda SOMENTE com JSON válido, sem markdown, no formato:
{"summary":"resumo objetivo em até 6 linhas, uma por \\n","decisions":["..."],"actions":["verbo no infinitivo + responsável/prazo se citado"]}
Não invente informações que não estejam na transcrição.

TRANSCRIÇÃO:
${text}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: 1200, messages: [{ role: "user", content: prompt }] })
    });
    if (!r.ok) return res.status(502).json({ error: "Falha no provedor de IA" });
    const raw = (await r.json()).content?.map((b) => b.text || "").join("") || "";
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const arr = (a) => Array.isArray(a) ? a.map(String).slice(0, 12) : [];
    return res.status(200).json({ summary: String(json.summary || ""), decisions: arr(json.decisions), actions: arr(json.actions) });
  } catch {
    return res.status(502).json({ error: "Resposta inválida da IA" });
  }
};
