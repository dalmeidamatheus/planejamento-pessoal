"use strict";
/* Resumo da reunião: IA (se configurada) ou resumo local; escreve um bloco "Resumo automático" na nota. */
ACT.noteSummary = async () => {
  const n = curNote();
  if (!n) return;
  NoteDoc.ensure(n);
  const live = NED && NED.el.isConnected && NED.noteId === n.id;
  let text;
  if (live) text = NoteDoc.sourceText(NED.el);
  else { const d = document.createElement("div"); d.innerHTML = n.html; text = NoteDoc.sourceText(d); }
  if (text.trim().length < 60) { toast("Grave ou escreva mais conteúdo para resumir", true); return; }
  const r = await Summarizer.run(text);
  NoteDoc.mutate(n, (root) => NoteDoc.setSummary(root, r), live ? NED : null);
  if (!live) render();
  toast(r.source === "ai" ? "Resumo gerado com IA ✓" : "Resumo gerado (modo local — configure ANTHROPIC_API_KEY para usar IA)");
  if (r.actions.length) modal(`<h2>Criar tarefas das ações?</h2><form data-form="actions">${r.actions.map((a, k) => `<label class="row" style="align-items:flex-start;margin-bottom:8px"><input type="checkbox" name="a" value="${k}" checked style="margin-top:3px"><span>${esc(a)}</span></label>`).join("")}<div class="foot"><button type="button" class="btn" data-act="close">Agora não</button><button class="btn primary">Criar tarefas</button></div></form>`, { onMount: () => { window._acts = r.actions; } });
};
SUBMIT.actions = (f, fd) => {
  const L = fd.getAll("a").map((k) => window._acts[+k]);
  L.forEach((a) => TaskOps.insert({ id: uid(), title: a.length > 90 ? a.slice(0, 88) + "…" : a, col: "todo", prio: "media", tag: "trabalho", due: "", notes: "Origem: nota de reunião" }));
  save();
  closeModal();
  toast(L.length + " tarefa(s) criada(s)");
};
