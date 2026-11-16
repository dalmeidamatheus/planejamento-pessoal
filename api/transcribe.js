const { userFromToken, bearer } = require("../lib/auth");
/* Transcrição de alta precisão (Whisper). Opcional: sem OPENAI_API_KEY responde 501 e o app
   continua usando o reconhecimento de voz do navegador. Recebe trechos curtos de áudio em base64. */
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!process.env.OPENAI_API_KEY) return res.status(501).json({ error: "Transcrição não configurada" });
  if (!await userFromToken(bearer(req))) return res.status(401).json({ error: "Não autenticado" });
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "JSON inválido" });
  }
  const b64 = String(body?.audio || "");
  if (!b64 || b64.length > 6e6) return res.status(400).json({ error: "Áudio ausente ou grande demais" });
  const mime = /^audio\/(webm|mp4|ogg|wav|mpeg)/.test(body?.mime || "") ? body.mime : "audio/webm";
  const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : mime.includes("mpeg") ? "mp3" : "webm";
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(b64, "base64")], { type: mime }), "trecho." + ext);
  form.append("model", process.env.TRANSCRIBE_MODEL || "whisper-1");
  form.append("language", /^[a-z]{2}$/.test(body?.lang || "") ? body.lang : "pt");
  form.append("response_format", "json");
  try {
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + process.env.OPENAI_API_KEY }, body: form });
    if (!r.ok) return res.status(502).json({ error: "Falha no provedor de transcrição" });
    return res.status(200).json({ text: String((await r.json()).text || "").trim() });
  } catch {
    return res.status(502).json({ error: "Falha ao transcrever" });
  }
};
