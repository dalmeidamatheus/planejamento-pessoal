"use strict";
/* Bloco "Recursos de IA" dos Ajustes: mostra o que está ativo e o caminho para ativar (opções gratuitas). */
const AiStatus = (() => {
  const NAMES = { gemini: "Google Gemini", claude: "Claude", groq: "Groq Whisper", openai: "OpenAI Whisper" };
  const rows = (s) => [
    ["Resumo de reuniões", s.text ? "IA ativa · " + NAMES[s.text] : "Resumo local gratuito (palavras-chave)"],
    ["Foto → texto", s.vision ? "IA ativa · " + NAMES[s.vision] : "OCR gratuito no navegador (Tesseract)"],
    ["Transcrição de voz", s.stt ? "Whisper ativo · " + NAMES[s.stt] : "Reconhecimento de voz do navegador (gratuito)"]
  ];
  const draw = (s) => `<div class="aibox"><h3>Recursos de IA</h3>${rows(s).map(([a, b]) => `<div class="airow"><span>${a}</span><b>${b}</b></div>`).join("")}
    ${s.text && s.vision && s.stt ? "" : `<details class="aihow"><summary>Como ativar (gratuito)</summary><ol>
      <li>Crie uma chave grátis no <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> (resumo e foto → texto).</li>
      <li>Opcional, para voz mais precisa: chave grátis no <a href="https://console.groq.com/keys" target="_blank" rel="noopener">Groq</a>.</li>
      <li>Na Vercel: Projeto → Settings → Environment Variables → adicione <code>GEMINI_API_KEY</code> e, se quiser, <code>GROQ_API_KEY</code> → Deployments → Redeploy.</li></ol>
      <p>Os planos gratuitos têm limite de uso, e o Google pode usar o conteúdo enviado no plano gratuito. Sem chaves, tudo continua funcionando nos modos gratuitos acima.</p></details>`}</div>`;
  const html = () => '<div id="aiBox" class="aibox"><h3>Recursos de IA</h3><div class="muted sm">Verificando…</div></div>';
  async function load() {
    const box = document.getElementById("aiBox");
    if (!box) return;
    let s = { text: null, vision: null, stt: null };
    try {
      const tk = typeof sb !== "undefined" && sb ? ((await sb.auth.getSession()).data.session || {}).access_token : "";
      const r = await fetch("/api/ai-status", { headers: tk ? { Authorization: "Bearer " + tk } : {} });
      if (r.ok) s = await r.json();
    } catch {}
    const b = document.getElementById("aiBox");
    if (b) b.outerHTML = draw(s).replace('<div class="aibox">', '<div id="aiBox" class="aibox">');
  }
  return { html, load };
})();
