const { userFromToken, bearer } = require("../lib/auth");
const ai = require("../lib/ai");
/* Foto → texto com IA de visão (Gemini gratuito ou Claude). Sem chave: 501 e o app usa o OCR do navegador. */
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!ai.configured("vision")) return res.status(501).json({ error: "IA não configurada" });
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
    const r = await ai.run("vision", { prompt, b64: image, mime, max: 3000 });
    return res.status(200).json({ text: r.text, provider: r.name });
  } catch {
    return res.status(502).json({ error: "Falha ao ler a imagem" });
  }
};
