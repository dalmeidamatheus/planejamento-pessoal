"use strict";
const STOP = new Set("de a o que e do da em um para é com não uma os no se na por mais as dos como mas foi ao ele das tem seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você tinha foram essa num nem suas meu às minha têm numa pelos elas havia seja qual será nós tenho lhe deles essas esses pelas este fosse dele te vocês lhes meus minhas nosso nossa dela delas esta estes estas aquele aquela isto aquilo então aí né tá pra tipo assim ali aqui vai vou vamos".split(" "));
function localSummary(text) {
  const sents = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 25), freq = {};
  sents.forEach((s) => norm(s).split(/\W+/).filter((w) => w.length > 3 && !STOP.has(w)).forEach((w) => freq[w] = (freq[w] || 0) + 1));
  const score = (s) => {
    const w = norm(s).split(/\W+/).filter((w2) => w2.length > 3 && !STOP.has(w2));
    return w.reduce((a, x) => a + (freq[x] || 0), 0) / Math.sqrt(w.length || 1);
  };
  const top = sents.map((s, i) => ({ s, i, v: score(s) })).sort((a, b) => b.v - a.v).slice(0, 5).sort((a, b) => a.i - b.i).map((x) => x.s);
  const act = sents.filter((s) => /\b(vamos|precisa(mos)?|preciso|tem que|temos que|ficou (combinado|definido)|fica (a cargo|com)|respons[aá]vel|prazo|at[eé] (segunda|ter[cç]a|quarta|quinta|sexta|amanh[aã]|dia)|enviar|mandar|agendar|marcar|revisar|ligar|entregar|verificar)\b/i.test(s)).slice(0, 8);
  const dec = sents.filter((s) => /\b(decidimos|decidiu|definimos|definido|aprovado|aprovamos|ficou decidido|combinamos|combinado)\b/i.test(s)).slice(0, 5);
  return { summary: top, actions: act, decisions: dec };
}
ACT.noteSummary = async () => {
  const n = curNote();
  if (!n) return;
  const i = n.body.indexOf("## Transcrição");
  const text = (i >= 0 ? n.body.slice(i) : n.body).replace(/^## Transcrição\s*/, "").replace(/^- \[\d\d:\d\d\]\s*/gm, "");
  if (text.trim().length < 60) {
    toast("Grave ou escreva mais conteúdo para resumir", true);
    return;
  }
  let r = null;
  if (CONFIG.AI_ENDPOINT) {
    try {
      const tk = sb ? (await sb.auth.getSession()).data.session?.access_token : "";
      const res = await fetch(CONFIG.AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", ...tk ? { Authorization: "Bearer " + tk } : {} }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error(res.status);
      const j = await res.json();
      r = { summary: String(j.summary || "").split("\n").filter(Boolean), actions: j.actions || [], decisions: j.decisions || [] };
    } catch (e) {
      if (!/^(401|404|501)$/.test(e.message)) toast("IA indisponível — usando resumo local", true);
    }
  }
  if (!r) r = localSummary(text);
  const li = (a) => a.length ? a.map((x) => "- " + x).join("\n") : "- _nada identificado_";
  const block = `

## Resumo automático
${li(r.summary)}

### Decisões
${li(r.decisions)}

### Ações
${r.actions.length ? r.actions.map((x) => "- [ ] " + x).join("\n") : "- _nada identificado_"}`;
  let body = n.body.replace(/\n\n## Resumo automático[\s\S]*?(?=\n\n## Transcrição|$)/, "");
  body = i >= 0 && body.includes("\n\n## Transcrição") ? body.replace("\n\n## Transcrição", block + "\n\n## Transcrição") : body + block;
  n.body = body;
  n.updated = Date.now();
  save();
  render();
  if (r.actions.length) modal(`<h2>Criar tarefas das ações?</h2><form data-form="actions">${r.actions.map((a, k) => `<label class="row" style="align-items:flex-start;margin-bottom:8px"><input type="checkbox" name="a" value="${k}" checked style="margin-top:3px"><span>${esc(a)}</span></label>`).join("")}<div class="foot"><button type="button" class="btn" data-act="close">Agora não</button><button class="btn primary">Criar tarefas</button></div></form>`, { onMount: () => {
    window._acts = r.actions;
  } });
};
SUBMIT.actions = (f, fd) => {
  const L = fd.getAll("a").map((k) => window._acts[+k]);
  L.forEach((a) => S.tasks.push({ id: uid(), title: a.length > 90 ? a.slice(0, 88) + "…" : a, col: "todo", prio: "media", tag: "trabalho", due: "", notes: "Origem: nota de reunião" }));
  save();
  closeModal();
  toast(L.length + " tarefa(s) criada(s)");
};
