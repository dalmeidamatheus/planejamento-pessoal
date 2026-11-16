/* Provedores de IA do servidor. Todos são opcionais: sem chave, o app usa os modos gratuitos que rodam no navegador.
   Texto e visão (resumo de reunião, foto → texto):
     1. GEMINI_API_KEY    — Google Gemini, tem plano gratuito (chave em https://aistudio.google.com/apikey)
     2. ANTHROPIC_API_KEY — Claude, pago por uso
   Voz → texto (transcrição Whisper):
     1. GROQ_API_KEY      — Groq, tem plano gratuito (chave em https://console.groq.com/keys)
     2. OPENAI_API_KEY    — OpenAI, pago por uso */
const env = (k) => (process.env[k] || "").trim();

function providers() {
  return {
    text: env("GEMINI_API_KEY") ? "gemini" : env("ANTHROPIC_API_KEY") ? "claude" : null,
    vision: env("GEMINI_API_KEY") ? "gemini" : env("ANTHROPIC_API_KEY") ? "claude" : null,
    stt: env("GROQ_API_KEY") ? "groq" : env("OPENAI_API_KEY") ? "openai" : null
  };
}

async function gemini(parts, max) {
  const model = env("GEMINI_MODEL") || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env("GEMINI_API_KEY") },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { maxOutputTokens: max, temperature: 0.2 } })
  });
  if (!r.ok) throw new Error("gemini " + r.status);
  const j = await r.json();
  return ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map((p) => p.text || "").join("").trim();
}

async function claude(content, max) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: env("ANTHROPIC_MODEL") || "claude-haiku-5-5", max_tokens: max, messages: [{ role: "user", content }] })
  });
  if (!r.ok) throw new Error("claude " + r.status);
  return ((await r.json()).content || []).map((b) => b.text || "").join("").trim();
}

/** Gera texto a partir de um prompt. */
async function text(prompt, max = 1200) {
  const p = providers().text;
  if (p === "gemini") return gemini([{ text: prompt }], max);
  if (p === "claude") return claude(prompt, max);
  const e = new Error("sem provedor"); e.code = 501; throw e;
}

/** Lê uma imagem (base64) seguindo o prompt. */
async function vision(prompt, b64, mime, max = 3000) {
  const p = providers().vision;
  if (p === "gemini") return gemini([{ inline_data: { mime_type: mime, data: b64 } }, { text: prompt }], max);
  if (p === "claude") return claude([{ type: "image", source: { type: "base64", media_type: mime, data: b64 } }, { type: "text", text: prompt }], max);
  const e = new Error("sem provedor"); e.code = 501; throw e;
}

/** Transcreve áudio (Buffer) com Whisper (Groq ou OpenAI). */
async function transcribe(buf, mime, ext, lang) {
  const p = providers().stt;
  if (!p) { const e = new Error("sem provedor"); e.code = 501; throw e; }
  const form = new FormData();
  form.append("file", new Blob([buf], { type: mime }), "trecho." + ext);
  form.append("model", p === "groq" ? env("TRANSCRIBE_MODEL") || "whisper-large-v3-turbo" : env("TRANSCRIBE_MODEL") || "whisper-1");
  form.append("language", lang);
  form.append("response_format", "json");
  const url = p === "groq" ? "https://api.groq.com/openai/v1/audio/transcriptions" : "https://api.openai.com/v1/audio/transcriptions";
  const key = p === "groq" ? env("GROQ_API_KEY") : env("OPENAI_API_KEY");
  const r = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + key }, body: form });
  if (!r.ok) throw new Error(p + " " + r.status);
  return String((await r.json()).text || "").trim();
}

module.exports = { providers, text, vision, transcribe };
