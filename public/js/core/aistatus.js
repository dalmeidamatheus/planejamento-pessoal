"use strict";
/* Bloco "Recursos de IA" dos Ajustes: mostra, para cada recurso, a fila de provedores do melhor ao pior
   (o app usa o primeiro configurado e, se ele falhar ou a cota acabar, passa para o próximo)
   e o caminho para ativar cada um. Sempre termina em uma reserva gratuita que roda no navegador. */
const AiStatus = (() => {
  const KINDS = [
    ["vision", "Foto → texto", [["Tesseract (OCR no navegador)", true]]],
    ["stt", "Transcrição de voz", [["Whisper local no navegador", true], ["Reconhecimento de voz do navegador", true]]],
    ["text", "Resumo de reuniões", [["Resumo local por palavras-chave", true]]]
  ];
  const chip = (c, t) => `<span class="aichip ${c}">${t}</span>`;
  const row = (n, p) => p.configured
    ? `<li class="on"><b>${esc(p.name)}</b> ${chip("ok", "ativo")} ${chip("", p.free ? "gratuito" : "pago")}</li>`
    : `<li><span>${esc(p.name)}</span> ${chip("", p.free ? "gratuito" : "pago")} <small>variável <code>${p.env.join("</code> + <code>")}</code> · <a href="${esc(p.link)}" target="_blank" rel="noopener">obter chave</a></small></li>`;
  const draw = (s) => `<div id="aiBox" class="aibox"><h3>Recursos de IA</h3>
    <p class="aiintro">Cada recurso usa o primeiro provedor ativo, do melhor para o pior. Se um falhar ou a cota acabar, passa para o próximo; no fim sempre há uma reserva gratuita no navegador. Nenhuma chave é obrigatória.</p>
    ${KINDS.map(([k, title, tail]) => `<details class="aik" ${(s[k] || []).some((p) => p.configured) ? "" : ""}><summary>${title} <small>${(s[k] || []).filter((p) => p.configured).length} de ${(s[k] || []).length} ativos</small></summary><ol>${(s[k] || []).map((p, i) => row(i, p)).join("")}${tail.map(([n]) => `<li class="on"><b>${n}</b> ${chip("ok", "sempre disponível")} ${chip("", "gratuito")}</li>`).join("")}</ol></details>`).join("")}
    <p class="aihow">Para ativar: crie a chave no site do provedor e adicione a variável em Vercel → Projeto → Settings → Environment Variables → Deployments → Redeploy. Planos gratuitos têm limites de uso e podem mudar; em alguns, o provedor pode usar o conteúdo enviado.</p></div>`;
  const html = () => '<div id="aiBox" class="aibox"><h3>Recursos de IA</h3><div class="muted sm">Verificando…</div></div>';
  async function load() {
    if (!document.getElementById("aiBox")) return;
    let s = { text: [], vision: [], stt: [] };
    try {
      const tk = typeof sb !== "undefined" && sb ? ((await sb.auth.getSession()).data.session || {}).access_token : "";
      const r = await fetch("/api/ai-status", { headers: tk ? { Authorization: "Bearer " + tk } : {} });
      if (r.ok) s = await r.json();
    } catch {}
    const b = document.getElementById("aiBox");
    if (b) b.outerHTML = draw(s);
  }
  return { html, load };
})();
