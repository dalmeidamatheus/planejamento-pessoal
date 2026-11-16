/* Provedores de IA do servidor, com FALLBACK AUTOMÁTICO do melhor para o pior.
   Cada recurso tem uma fila ordenada por qualidade. O servidor tenta, na ordem, os provedores que têm chave
   configurada; se um falhar (cota esgotada, erro, fora do ar) passa para o próximo. Se todos falharem, o app
   cai nos modos que rodam no próprio navegador (veja public/js/core/*). Nenhuma chave é obrigatória.

   VISÃO (foto -> texto):  Claude > Gemini > Mistral OCR > Groq Llama 4 Scout > OpenRouter (grátis) > OCR.space > navegador (Tesseract)
   VOZ (transcrição):      Groq Whisper v3 > OpenAI Whisper > AssemblyAI > Mistral Voxtral > Cloudflare Whisper > navegador (Whisper local) > navegador (Web Speech)
   TEXTO (resumo):         Claude > Gemini > Groq Llama 3.3 > Mistral > OpenRouter (grátis) > resumo local */
const env = (k) => (process.env[k] || "").trim();
const has = (...ks) => ks.every((k) => env(k));
const J = { "content-type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(url, headers, body, form) {
  const r = await fetch(url, { method: "POST", headers: form ? headers : { ...J, ...headers }, body: form || JSON.stringify(body) });
  if (!r.ok) throw new Error(url.split("/")[2] + " " + r.status);
  return r.json();
}
/* API estilo OpenAI (chat/completions) usada por Groq, Mistral e OpenRouter */
async function chat(url, key, model, content, max) {
  const j = await post(url, { Authorization: "Bearer " + key }, { model, max_tokens: max, temperature: 0.2, messages: [{ role: "user", content }] });
  return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "").trim();
}
const dataUrl = (a) => `data:${a.mime};base64,${a.b64}`;
const imgContent = (a) => [{ type: "image_url", image_url: { url: dataUrl(a) } }, { type: "text", text: a.prompt }];

/* ---------- texto ---------- */
const TEXT = [
  { id: "claude", name: "Claude (Anthropic)", free: false, env: ["ANTHROPIC_API_KEY"], link: "https://console.anthropic.com/", on: () => has("ANTHROPIC_API_KEY"),
    run: async (a) => ((await post("https://api.anthropic.com/v1/messages", { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01" }, { model: env("ANTHROPIC_MODEL") || "claude-haiku-5-5", max_tokens: a.max, messages: [{ role: "user", content: a.prompt }] })).content || []).map((b) => b.text || "").join("").trim() },
  { id: "gemini", name: "Google Gemini", free: true, env: ["GEMINI_API_KEY"], link: "https://aistudio.google.com/apikey", on: () => has("GEMINI_API_KEY"), run: (a) => gemini([{ text: a.prompt }], a.max) },
  { id: "groq", name: "Groq (Llama 3.3)", free: true, env: ["GROQ_API_KEY"], link: "https://console.groq.com/keys", on: () => has("GROQ_API_KEY"),
    run: (a) => chat("https://api.groq.com/openai/v1/chat/completions", env("GROQ_API_KEY"), env("GROQ_TEXT_MODEL") || "llama-3.3-70b-versatile", a.prompt, a.max) },
  { id: "mistral", name: "Mistral", free: true, env: ["MISTRAL_API_KEY"], link: "https://console.mistral.ai/api-keys", on: () => has("MISTRAL_API_KEY"),
    run: (a) => chat("https://api.mistral.ai/v1/chat/completions", env("MISTRAL_API_KEY"), env("MISTRAL_TEXT_MODEL") || "mistral-small-latest", a.prompt, a.max) },
  { id: "openrouter", name: "OpenRouter (modelos grátis)", free: true, env: ["OPENROUTER_API_KEY"], link: "https://openrouter.ai/keys", on: () => has("OPENROUTER_API_KEY"),
    run: (a) => chat("https://openrouter.ai/api/v1/chat/completions", env("OPENROUTER_API_KEY"), env("OPENROUTER_TEXT_MODEL") || "meta-llama/llama-3.3-70b-instruct:free", a.prompt, a.max) }
];

async function gemini(parts, max) {
  const model = env("GEMINI_MODEL") || "gemini-2.5-flash";
  const j = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { "x-goog-api-key": env("GEMINI_API_KEY") }, { contents: [{ role: "user", parts }], generationConfig: { maxOutputTokens: max, temperature: 0.2 } });
  return ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map((p) => p.text || "").join("").trim();
}

/* ---------- visão ---------- */
const VISION = [
  { id: "claude", name: "Claude (Anthropic)", free: false, env: ["ANTHROPIC_API_KEY"], link: "https://console.anthropic.com/", on: () => has("ANTHROPIC_API_KEY"),
    run: async (a) => ((await post("https://api.anthropic.com/v1/messages", { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01" }, { model: env("ANTHROPIC_MODEL") || "claude-haiku-5-5", max_tokens: a.max, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: a.mime, data: a.b64 } }, { type: "text", text: a.prompt }] }] })).content || []).map((b) => b.text || "").join("").trim() },
  { id: "gemini", name: "Google Gemini", free: true, env: ["GEMINI_API_KEY"], link: "https://aistudio.google.com/apikey", on: () => has("GEMINI_API_KEY"),
    run: (a) => gemini([{ inline_data: { mime_type: a.mime, data: a.b64 } }, { text: a.prompt }], a.max) },
  { id: "mistral", name: "Mistral OCR", free: true, env: ["MISTRAL_API_KEY"], link: "https://console.mistral.ai/api-keys", on: () => has("MISTRAL_API_KEY"),
    run: async (a) => { const j = await post("https://api.mistral.ai/v1/ocr", { Authorization: "Bearer " + env("MISTRAL_API_KEY") }, { model: "mistral-ocr-latest", document: { type: "image_url", image_url: dataUrl(a) } }); return (j.pages || []).map((p) => p.markdown || "").join("\n\n").trim(); } },
  { id: "groq", name: "Groq (Llama 4 Scout)", free: true, env: ["GROQ_API_KEY"], link: "https://console.groq.com/keys", on: () => has("GROQ_API_KEY"),
    run: (a) => chat("https://api.groq.com/openai/v1/chat/completions", env("GROQ_API_KEY"), env("GROQ_VISION_MODEL") || "meta-llama/llama-4-scout-17b-16e-instruct", imgContent(a), a.max) },
  { id: "openrouter", name: "OpenRouter (modelos grátis)", free: true, env: ["OPENROUTER_API_KEY"], link: "https://openrouter.ai/keys", on: () => has("OPENROUTER_API_KEY"),
    run: (a) => chat("https://openrouter.ai/api/v1/chat/completions", env("OPENROUTER_API_KEY"), env("OPENROUTER_VISION_MODEL") || "google/gemma-3-27b-it:free", imgContent(a), a.max) },
  { id: "ocrspace", name: "OCR.space", free: true, env: ["OCRSPACE_API_KEY"], link: "https://ocr.space/ocrapi/freekey", on: () => has("OCRSPACE_API_KEY"),
    run: async (a) => {
      const f = new FormData();
      f.append("apikey", env("OCRSPACE_API_KEY")); f.append("base64Image", dataUrl(a)); f.append("language", "por"); f.append("OCREngine", "2"); f.append("scale", "true");
      const j = await post("https://api.ocr.space/parse/image", {}, null, f);
      if (j.IsErroredOnProcessing) throw new Error("ocrspace");
      return (j.ParsedResults || []).map((p) => p.ParsedText || "").join("\n").trim();
    } }
];

/* ---------- voz -> texto (a = { buf, mime, ext, lang }) ---------- */
function whisperForm(a, model) {
  const f = new FormData();
  f.append("file", new Blob([a.buf], { type: a.mime }), "trecho." + a.ext);
  f.append("model", model); f.append("language", a.lang); f.append("response_format", "json");
  return f;
}
const STT = [
  { id: "groq", name: "Groq Whisper large-v3", free: true, env: ["GROQ_API_KEY"], link: "https://console.groq.com/keys", on: () => has("GROQ_API_KEY"),
    run: async (a) => String((await post("https://api.groq.com/openai/v1/audio/transcriptions", { Authorization: "Bearer " + env("GROQ_API_KEY") }, null, whisperForm(a, env("GROQ_STT_MODEL") || "whisper-large-v3-turbo"))).text || "").trim() },
  { id: "openai", name: "OpenAI Whisper", free: false, env: ["OPENAI_API_KEY"], link: "https://platform.openai.com/api-keys", on: () => has("OPENAI_API_KEY"),
    run: async (a) => String((await post("https://api.openai.com/v1/audio/transcriptions", { Authorization: "Bearer " + env("OPENAI_API_KEY") }, null, whisperForm(a, env("OPENAI_STT_MODEL") || "whisper-1"))).text || "").trim() },
  { id: "assemblyai", name: "AssemblyAI", free: true, env: ["ASSEMBLYAI_API_KEY"], link: "https://www.assemblyai.com/dashboard/signup", on: () => has("ASSEMBLYAI_API_KEY"),
    run: async (a) => {
      const H = { authorization: env("ASSEMBLYAI_API_KEY") };
      const up = await fetch("https://api.assemblyai.com/v2/upload", { method: "POST", headers: { ...H, "content-type": "application/octet-stream" }, body: a.buf });
      if (!up.ok) throw new Error("assemblyai upload " + up.status);
      const { upload_url } = await up.json();
      const t = await post("https://api.assemblyai.com/v2/transcript", H, { audio_url: upload_url, language_code: a.lang === "pt" ? "pt" : a.lang, speech_model: "best" });
      for (let i = 0; i < 40; i++) {
        await sleep(1200);
        const g = await (await fetch("https://api.assemblyai.com/v2/transcript/" + t.id, { headers: H })).json();
        if (g.status === "completed") return String(g.text || "").trim();
        if (g.status === "error") throw new Error("assemblyai " + g.error);
      }
      throw new Error("assemblyai timeout");
    } },
  { id: "mistral", name: "Mistral Voxtral", free: true, env: ["MISTRAL_API_KEY"], link: "https://console.mistral.ai/api-keys", on: () => has("MISTRAL_API_KEY"),
    run: async (a) => String((await post("https://api.mistral.ai/v1/audio/transcriptions", { Authorization: "Bearer " + env("MISTRAL_API_KEY") }, null, whisperForm(a, env("MISTRAL_STT_MODEL") || "voxtral-mini-latest"))).text || "").trim() },
  { id: "cloudflare", name: "Cloudflare Workers AI (Whisper)", free: true, env: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"], link: "https://dash.cloudflare.com/profile/api-tokens", on: () => has("CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"),
    run: async (a) => { const j = await post(`https://api.cloudflare.com/client/v4/accounts/${env("CLOUDFLARE_ACCOUNT_ID")}/ai/run/@cf/openai/whisper-large-v3-turbo`, { Authorization: "Bearer " + env("CLOUDFLARE_API_TOKEN") }, { audio: a.buf.toString("base64"), language: a.lang }); return String((j.result && j.result.text) || "").trim(); } }
];

const KINDS = { text: TEXT, vision: VISION, stt: STT };

/** Tenta os provedores configurados, em ordem. Devolve { text, provider } ou lança erro com .code (501 = nenhum configurado, 502 = todos falharam). */
async function run(kind, args) {
  const q = KINDS[kind].filter((p) => p.on());
  if (!q.length) { const e = new Error("nenhum provedor configurado"); e.code = 501; throw e; }
  const tried = [];
  for (const p of q) {
    try {
      const text = await p.run(args);
      if (kind === "text" && !text) throw new Error("resposta vazia");
      if (args.validate) args.validate(text);
      return { text, provider: p.id, name: p.name };
    } catch (err) { tried.push(p.id + ": " + String(err.message || err).slice(0, 80)); }
  }
  const e = new Error("todos os provedores falharam: " + tried.join(" | ")); e.code = 502; e.tried = tried;
  throw e;
}

/** Fila de cada recurso, em ordem de qualidade, com o estado de configuração (sem expor chaves). */
function status() {
  const view = (L) => L.map((p) => ({ id: p.id, name: p.name, free: p.free, env: p.env, link: p.link, configured: p.on() }));
  return { text: view(TEXT), vision: view(VISION), stt: view(STT) };
}
const configured = (kind) => KINDS[kind].some((p) => p.on());

module.exports = { run, status, configured };
