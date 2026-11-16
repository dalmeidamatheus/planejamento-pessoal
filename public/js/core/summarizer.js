"use strict";
/* Resumo de reuniões: IA (/api/summarize, se configurada) com fallback extrativo local. */
const Summarizer = (() => {
  const STOP = new Set("de a o que e do da em um para é com não uma os no se na por mais as dos como mas foi ao ele das tem seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você tinha foram essa num nem suas meu às minha têm numa pelos elas havia seja qual será nós tenho lhe deles essas esses pelas este fosse dele te vocês lhes meus minhas nosso nossa dela delas esta estes estas aquele aquela isto aquilo então aí né tá pra tipo assim ali aqui vai vou vamos".split(" "));
  function local(text) {
    const sents = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 25), freq = {};
    const words = (s) => norm(s).split(/\W+/).filter((w) => w.length > 3 && !STOP.has(w));
    sents.forEach((s) => words(s).forEach((w) => (freq[w] = (freq[w] || 0) + 1)));
    const score = (s) => { const w = words(s); return w.reduce((a, x) => a + (freq[x] || 0), 0) / Math.sqrt(w.length || 1); };
    const top = sents.map((s, i) => ({ s, i, v: score(s) })).sort((a, b) => b.v - a.v).slice(0, 5).sort((a, b) => a.i - b.i).map((x) => x.s);
    const act = sents.filter((s) => /\b(vamos|precisa(mos)?|preciso|tem que|temos que|ficou (combinado|definido)|fica (a cargo|com)|respons[aá]vel|prazo|at[eé] (segunda|ter[cç]a|quarta|quinta|sexta|amanh[aã]|dia)|enviar|mandar|agendar|marcar|revisar|ligar|entregar|verificar)\b/i.test(s)).slice(0, 8);
    const dec = sents.filter((s) => /\b(decidimos|decidiu|definimos|definido|aprovado|aprovamos|ficou decidido|combinamos|combinado)\b/i.test(s)).slice(0, 5);
    return { summary: top, actions: act, decisions: dec, source: "local" };
  }
  async function run(text) {
    text = String(text || "").trim();
    if (typeof CONFIG !== "undefined" && CONFIG.AI_ENDPOINT) {
      try {
        const tk = sb ? ((await sb.auth.getSession()).data.session || {}).access_token : "";
        const res = await fetch(CONFIG.AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", ...(tk ? { Authorization: "Bearer " + tk } : {}) }, body: JSON.stringify({ text }) });
        if (!res.ok) throw new Error(res.status);
        const j = await res.json();
        return { summary: String(j.summary || "").split("\n").filter(Boolean), actions: j.actions || [], decisions: j.decisions || [], source: "ai", provider: j.provider || "IA" };
      } catch (e) {
        if (!/^(401|404|501)$/.test(e.message) && typeof toast === "function") toast("IA indisponível — usando resumo local", true);
      }
    }
    return local(text);
  }
  return { run, local };
})();
