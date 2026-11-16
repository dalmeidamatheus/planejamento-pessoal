const { userFromToken, bearer } = require("../lib/auth");
/* Foto → texto com Claude (visão). Opcional: sem ANTHROPIC_API_KEY responde 501 e o app usa OCR no navegador. */
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: "IA não configurada" });
  if (!await userFromToken(bearer(req))) return res.status(401).json({ error: "Não autenticado" });
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "JSON inválido" });
  }
  const image = String(body?.image || "");
  const mime = ["image/jpeg", "image/png", "image/webp"].includes(body?.mime) ? body.mime : "image/jpeg";
  if (!image || image.length > 6e6) return res.status(400).json({ error: "Imagem ausente ou grande demais" });
  const prompt = "Transcreva fielmente TODO o texto desta imagem (documento, conta, anotação ou quadro), em português quando for o caso. Preserve parágrafos, listas, valores e tabelas simples (use linhas separadas). Não explique, não comente e não invente nada: responda somente com o texto transcrito. Se não houver texto legível, responda com uma resposta vazia.";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: 3000,
        messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: image } }, { type: "text", text: prompt }] }]
      })
    });
    if (!r.ok) return res.status(502).json({ error: "Falha no provedor de IA" });
    const text = ((await r.json()).content || []).map((b) => b.text || "").join("").trim();
    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: "Falha ao ler a imagem" });
  }
};
