"use strict";
/* Notas: lista, editor rico em tela cheia, gravação/transcrição de reunião e resumo */
const nById = (id) => S.notes.find((x) => x.id === id);
const nIcon = (n) => ic(NoteDoc.isMeeting(n) ? "mic" : "notes", 20);
function noteItems(q) {
  q = norm(q);
  const L = [...S.notes].filter((n) => !q || norm(n.title + " " + n.body).includes(q)).sort((a, b) => b.updated - a.updated);
  return L.length ? L.map((n) => `<div class="row-it big" data-act="noteOpen" data-id="${n.id}"><span class="emo">${nIcon(n)}</span><div class="grow"><b class="ell">${esc(n.title || "Sem título")}</b><div class="sm muted ell">${new Date(n.updated).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · ${prevText(n.body) || "vazia"}</div></div></div>`).join("") : '<div class="empty">Nenhuma nota. Toque em “Nova nota”.</div>';
}
MV.notes = () => `<div class="tkhead"><input type="search" class="sbox" placeholder="Buscar notas…" value="${esc(ui.m.nq)}" data-in="nQ"></div>
  <div class="nactions"><button class="btn primary grow" data-act="noteNew">${mIc("plus", 16)} Nova nota</button><button class="btn grow" data-act="meetNew">${mIc("mic", 16)} Nova reunião</button></div>
  <div id="nlist">${noteItems(ui.m.nq)}</div>`;
INP.nQ = (el) => { ui.m.nq = el.value; $("#nlist").innerHTML = noteItems(el.value); };
ACT.noteNew = () => { const n = NoteDoc.create({ html: "<p><br></p>" }); save(); openNote(n.id, true); };
function newMeetingNote() {
  const d = new Date(), html = NoteDoc.meetingHtml();
  const n = NoteDoc.create({ title: "Reunião — " + d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), html, body: RT.text(html) });
  const t = todayWall(), now = Date.now();
  const o = occs(addDays(dayStart(t), -1), addDays(dayStart(t), 2)).find((x) => !x.allDay && !x.e.birthday && x.sMs - 15 * 6e4 <= now && x.eMs > now);
  if (o) { n.link = { type: "event", id: o.e.id }; n.title = "Reunião — " + o.e.title; }
  save();
  return n;
}
ACT.meetNew = () => { const n = newMeetingNote(); openNote(n.id); setTimeout(() => recStart(n), 250); };
ACT.noteOpen = (el) => openNote(el.dataset.id);
function linkLabel(l) {
  const e = l && l.type === "event" && S.events.find((x) => x.id === l.id);
  return e ? "" + e.title : "";
}
function openNote(id, focus) {
  const n = nById(id);
  if (!n) return;
  NoteDoc.ensure(n);
  M.cur = n;
  const recHere = M.rec && M.rec.noteId === id;
  openLayer(`<div class="ned"><div class="nhead"><button class="icon-btn" data-act="layerClose" aria-label="Voltar">${mIc("left")}</button><input class="ntitle" type="text" value="${esc(n.title)}" placeholder="Sem título" data-in="nTitle" enterkeyhint="done"><button class="icon-btn ${recHere ? "recon" : ""}" id="recbtn" data-act="recToggle" aria-label="Gravar reunião">${mIc(recHere ? "stop" : "mic")}</button><button class="icon-btn" data-act="noteMenu" aria-label="Mais">${mIc("more")}</button></div>
   <div class="recbar ${recHere ? "" : "hidden"}" id="recbar"><span class="pulse"></span><b id="recT">${recHere ? NoteDoc.mmss(Date.now() - M.rec.t0) : "00:00"}</b><span class="live ell" id="recLive">Ouvindo…</span></div>
   <div class="nlink ${n.link && linkLabel(n.link) ? "" : "hidden"}" id="nlink" data-act="noteLinkMenu">${esc(linkLabel(n.link))}</div>
   <div id="nedHost" class="m-edhost"></div></div>`, {
    full: true, cls: "m-ed",
    onMount: (el) => {
      const ed = RT.mount($("#nedHost", el), { html: n.html, placeholder: "Escreva aqui…  # título · - lista · [] checklist", onChange: (html, text) => { n.html = html; n.body = text; n.updated = Date.now(); save(); } });
      ed.noteId = id;
      M.ed = ed;
      if (recHere) NoteDoc.setInterim(ed.el, "");
      if (focus) setTimeout(() => $(".ntitle", el).focus(), 60);
    },
    onClose: () => { if (M.ed && M.ed.noteId === id) { M.ed.flush(); M.ed = null; } M.cur = null; render(); }
  });
}
INP.nTitle = (el) => { const n = M.cur; if (!n) return; n.title = el.value; n.updated = Date.now(); save(); };
ACT.noteMenu = () => {
  const n = M.cur, eng = ui.m.engine;
  openLayer(`<h2>Nota</h2><div class="stack tight">
   <button class="listbtn" data-act="nSummary"><span>${mIc("sparkle", 18)}</span>Resumir reunião / nota</button>
   <button class="listbtn" data-act="noteLinkMenu"><span>${mIc("link", 18)}</span>${n.link && linkLabel(n.link) ? "Vínculo: " + esc(linkLabel(n.link)) : "Vincular a um compromisso"}</button>
   <button class="listbtn" data-act="nEngine"><span>${mIc("mic", 18)}</span>Transcrição: ${eng === "whisper" ? "IA precisa (Whisper)" : "Navegador (ao vivo)"} — trocar</button>
   <button class="listbtn" data-act="nMath"><span>∑</span>Inserir fórmula / calcular</button>
   <button class="listbtn neg" data-act="nDel"><span>${mIc("trash", 18)}</span>Excluir nota</button></div>`, { cls: "menu" });
};
ACT.nMath = () => { closeModal(); M.ed && M.ed.cmd("math"); };
ACT.nEngine = () => {
  ui.m.engine = ui.m.engine === "whisper" ? "browser" : "whisper";
  try { LS.setItem("norte:engine", ui.m.engine); } catch {}
  closeModal();
  toast(ui.m.engine === "whisper" ? "Modo IA precisa: o texto final chega a cada ~12 s (requer servidor configurado)" : "Modo navegador: texto ao vivo, mais rápido");
};
ACT.nDel = () => { const n = M.cur; closeModal(); setTimeout(() => mConfirm("Excluir a nota “" + (n.title || "Sem título") + "”?", "Excluir", () => { if (M.rec && M.rec.noteId === n.id) recStop(true); S.notes = S.notes.filter((x) => x.id !== n.id); save(); const t = topLayer(); M.ed = null; t && closeLayer(t); toast("Nota excluída"); }), 0); };
ACT.noteLinkMenu = () => {
  if (topLayer() && topLayer().o.cls === "menu") closeModal();
  const n = M.cur, evs = [...S.events].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 40);
  setTimeout(() => openLayer(`<h2>Vincular a compromisso</h2><div class="stack tight scroll">${n.link ? '<button class="listbtn neg" data-act="nLink" data-id=""><span>${mIc("x", 18)}</span>Remover vínculo</button>' : ""}${evs.map((e) => `<button class="listbtn" data-act="nLink" data-id="${e.id}"><span>${mIc("calendar", 18)}</span><span class="ell">${esc(e.title)} · ${fmtDay(e.start.slice(0, 10))}</span></button>`).join("") || '<div class="empty">Sem compromissos.</div>'}</div>`, { cls: "menu" }), 0);
};
ACT.nLink = (el) => {
  const n = M.cur;
  if (el.dataset.id) n.link = { type: "event", id: el.dataset.id }; else delete n.link;
  save(); closeModal();
  const l = $("#nlink"); if (l) { l.textContent = linkLabel(n.link); l.classList.toggle("hidden", !linkLabel(n.link)); }
};

/* ---------- gravação de reunião ---------- */
function recUi() {
  const rec = M.rec, here = rec && M.cur && rec.noteId === M.cur.id;
  const b = $("#recbtn"), bar = $("#recbar");
  if (b) { b.classList.toggle("recon", !!here); b.innerHTML = mIc(here ? "stop" : "mic"); }
  if (bar) bar.classList.toggle("hidden", !here);
  recPillUpdate();
}
function recPillUpdate() {
  const p = $("#recpill");
  if (!p) return;
  p.classList.toggle("hidden", !(M.rec && !(M.cur && M.cur.id === M.rec.noteId)));
  if (M.rec) p.textContent = "● " + NoteDoc.mmss(Date.now() - M.rec.t0);
}
ACT.recGo = () => { if (M.rec) openNote(M.rec.noteId); };
ACT.recToggle = () => { if (M.rec) recStop(); else recStart(M.cur); };
function recErr(code) {
  const msg = { mic: "Permita o acesso ao microfone para gravar.", unsupported: "Este navegador não suporta reconhecimento de voz. Use o Chrome (Android) ou o Safari (iOS 14.5+).", network: "Sem conexão com o serviço de voz — tentando de novo…", "whisper-unavailable": "Transcrição por IA não configurada no servidor — voltando ao modo navegador.", "whisper-error": "Falha ao enviar um trecho para a IA." }[code] || "Erro na gravação";
  if (code === "network" && Date.now() - (M.lastNet || 0) < 20000) return;
  if (code === "network") M.lastNet = Date.now();
  toast(msg, true);
  if (code === "whisper-unavailable") ui.m.engine = "browser";
  if ((code === "mic" || code === "unsupported") && M.rec && !M.rec.h) { M.rec = null; recUi(); }
}
async function recStart(n) {
  if (!n) return;
  if (M.rec) { toast("Já há uma gravação em andamento"); return; }
  if (!Transcriber.supported() && ui.m.engine !== "whisper") { recErr("unsupported"); return; }
  const rec = M.rec = { noteId: n.id, t0: Date.now(), h: null, nFinals: 0, timer: null, wl: null };
  recUi();
  const h = await Transcriber.start({
    engine: ui.m.engine, lang: "pt-BR",
    onInterim: (t) => { if (M.ed && M.ed.noteId === n.id && M.ed.el.isConnected) NoteDoc.setInterim(M.ed.el, t); const l = $("#recLive"); if (l) l.textContent = t || "Ouvindo…"; },
    onFinal: (f) => { rec.nFinals++; const nn = nById(n.id); nn && NoteDoc.mutate(nn, (root) => NoteDoc.addFinal(root, f), M.ed); },
    onError: recErr
  });
  if (!h) { if (M.rec === rec) { M.rec = null; recUi(); } return; }
  rec.h = h;
  rec.timer = setInterval(() => { const t = $("#recT"); if (t) t.textContent = NoteDoc.mmss(Date.now() - rec.t0); recPillUpdate(); }, 500);
  try { rec.wl = await navigator.wakeLock.request("screen"); } catch {}
  toast("Gravando — fale normalmente. Você pode continuar digitando.");
}
async function recStop(skipSummary) {
  const rec = M.rec;
  if (!rec) return;
  M.rec = null;
  clearInterval(rec.timer);
  try { rec.wl && rec.wl.release(); } catch {}
  recUi();
  toast("Finalizando gravação…");
  try { rec.h && await rec.h.stop(); } catch {}
  if (M.ed && M.ed.noteId === rec.noteId && M.ed.el.isConnected) { NoteDoc.setInterim(M.ed.el, ""); M.ed.changed(); }
  const n = nById(rec.noteId);
  if (skipSummary === true || !n) return;
  if (rec.nFinals >= 2) await summarize(n); else toast("Gravação encerrada");
}
function noteSource(n) {
  if (M.ed && M.ed.noteId === n.id && M.ed.el.isConnected) return NoteDoc.sourceText(M.ed.el);
  const d = document.createElement("div");
  d.innerHTML = NoteDoc.ensure(n).html;
  return NoteDoc.sourceText(d);
}
async function summarize(n) {
  const text = noteSource(n);
  if (text.trim().length < 60) { toast("Grave ou escreva mais conteúdo para resumir", true); return; }
  toast("Gerando resumo…");
  const r = await Summarizer.run(text);
  NoteDoc.mutate(n, (root) => NoteDoc.setSummary(root, r), M.ed);
  toast(r.source === "ai" ? "Resumo gerado com IA" : "Resumo gerado");
  if (r.actions.length) {
    window._acts = r.actions;
    openLayer(`<h2>Criar tarefas das ações?</h2><form data-form="mActions"><div class="stack tight">${r.actions.map((a, k) => `<label class="swrow"><span>${esc(a)}</span><input type="checkbox" name="a" value="${k}" checked></label>`).join("")}</div><div class="stack"><button class="btn primary big">Criar tarefas</button><button type="button" class="btn big" data-act="layerClose">Agora não</button></div></form>`, { cls: "ask" });
  }
}
ACT.nSummary = () => { const n = M.cur; closeModal(); summarize(n); };
SUBMIT.mActions = (f, fd) => {
  const L = fd.getAll("a").map((k) => window._acts[+k]);
  L.forEach((a) => TaskOps.insert({ id: uid(), title: a.length > 90 ? a.slice(0, 88) + "…" : a, col: "todo", prio: "media", tag: "trabalho", due: "", notes: "Origem: nota de reunião" }));
  save();
  closeModal();
  toast(L.length + " tarefa(s) criada(s)");
};
