"use strict";
const curNote = () => S.notes.find((n) => n.id === ui.notes.sel);
const fmtTs = (ts) => new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
function linkLabel(l) {
  if (!l) return "";
  if (l.type === "event") {
    const e = S.events.find((x) => x.id === l.id);
    return e ? "📅 " + e.title : "";
  }
  const t = S.tx.find((x) => x.id === l.id);
  return t ? "💰 " + t.desc + " (" + brl(t.amount) + ")" : "";
}
VIEWS.notes = () => {
  const q = norm(ui.notes.q), L = [...S.notes].sort((a, b) => b.updated - a.updated).filter((n2) => !q || norm(n2.title + " " + n2.body).includes(q));
  if (!ui.notes.sel || !S.notes.some((n2) => n2.id === ui.notes.sel)) ui.notes.sel = L[0]?.id || null;
  const n = curNote(), mode = ui.notes.mode, recHere = REC.on && n && REC.noteId === n.id;
  const evs = [...S.events].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 60), txs = [...S.tx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
  return `<div class="notes"><div class="card nlist"><div class="row" style="padding:4px 4px 8px"><input type="text" placeholder="Buscar notas…" value="${esc(ui.notes.q)}" data-in="noteQ"></div><div id="nl">${noteList(L)}</div></div>
  <div class="card editor">${n ? `
   <div class="ebar"><div class="seg">${[["edit", "Editar"], ["both", "Dividir"], ["view", "Ler"]].map(([k, t]) => `<button class="${mode === k ? "on" : ""}" data-act="noteMode" data-m="${k}">${t}</button>`).join("")}</div>
    ${recHere ? `<button class="btn danger" data-act="recStop">${ic("stop")}Parar gravação</button>` : `<button class="btn" data-act="recStart">${ic("mic")}Gravar reunião</button>`}
    <select style="width:200px" data-ch="noteLink" title="Vincular"><option value="">🔗 Vincular a…</option><optgroup label="Eventos">${evs.map((e) => `<option value="event:${e.id}" ${n.link?.id === e.id ? "selected" : ""}>${esc(e.title)} · ${fmtDay(e.start.slice(0, 10))}</option>`).join("")}</optgroup><optgroup label="Transações">${txs.map((t) => `<option value="tx:${t.id}" ${n.link?.id === t.id ? "selected" : ""}>${esc(t.desc)} · ${brl(t.amount)}</option>`).join("")}</optgroup></select>
    ${n.link && linkLabel(n.link) ? `<a href="#" class="sm" data-act="noteGoLink">${esc(linkLabel(n.link))}</a>` : ""}<span class="grow"></span>
    <button class="btn sm" data-act="noteSummary" title="Resumir a transcrição">Resumir reunião</button><button class="btn sm ghost danger" data-act="noteDel">${ic("trash", 14)}</button></div>
   ${recHere ? `<div class="recbox"><span class="pulse"></span><b id="recT">00:00</b><span class="live" id="recLive">Ouvindo…</span></div>` : ""}
   <input class="tt" type="text" value="${esc(n.title)}" placeholder="Sem título" data-in="noteTitle">
   <div class="body ${mode === "both" ? "both" : ""}">${mode !== "view" ? `<textarea id="nb" data-in="noteBody" placeholder="Escreva em Markdown…  # título · **negrito** · - lista · - [ ] tarefa">${esc(n.body)}</textarea>` : ""}${mode !== "edit" ? `<div class="prev" id="prev" style="${mode === "view" ? "border:0" : ""}">${md(n.body) || '<span class="muted">Nada ainda.</span>'}</div>` : ""}</div>` : `<div class="empty" style="margin:auto">Selecione ou crie uma nota.<br><br><button class="btn primary" data-act="newNote">${ic("plus")}Nova nota</button> <button class="btn" data-act="newMeeting">${ic("mic")}Nova reunião</button></div>`}</div></div>`;
};
function noteList(L) {
  return L.map((n) => `<div class="nitem ${n.id === ui.notes.sel ? "on" : ""}" data-act="noteSel" data-id="${n.id}"><b>${esc(n.title || "Sem título")}</b><small>${fmtTs(n.updated)} · ${esc(n.body.replace(/[#*\-\[\]>]/g, "").replace(/\s+/g, " ").slice(0, 50))}</small></div>`).join("") || '<div class="empty">Sem notas</div>';
}
ACT.noteSel = (el) => {
  ui.notes.sel = el.dataset.id;
  render();
};
ACT.noteMode = (el) => {
  ui.notes.mode = el.dataset.m;
  render();
};
ACT.newNote = () => {
  const n = { id: uid(), title: "", body: "", created: Date.now(), updated: Date.now() };
  S.notes.push(n);
  ui.notes.sel = n.id;
  save();
  go("notes");
  render();
  setTimeout(() => $(".editor .tt")?.focus(), 30);
};
function newMeetingNote() {
  const d = new Date(), n = { id: uid(), title: "Reunião — " + d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), body: "## Pauta\n- \n\n## Notas\n- \n\n## Decisões\n- \n\n## Ações\n- [ ] ", created: Date.now(), updated: Date.now() };
  const t = todayWall(), now = Date.now();
  const o = occs(addDays(dayStart(t), -1), addDays(dayStart(t), 2)).find((o2) => !o2.allDay && o2.sMs - 15 * 6e4 <= now && o2.eMs > now);
  if (o) n.link = { type: "event", id: o.e.id }, n.title = "Reunião — " + o.e.title;
  S.notes.push(n);
  ui.notes.sel = n.id;
  save();
  return n;
}
ACT.newMeeting = () => {
  newMeetingNote();
  go("notes");
  render();
  ACT.recStart();
};
ACT.noteDel = () => {
  if (!confirmDlg("Excluir esta nota?")) return;
  if (REC.on && REC.noteId === ui.notes.sel) stopRec();
  S.notes = S.notes.filter((n) => n.id !== ui.notes.sel);
  ui.notes.sel = null;
  save();
  render();
};
INP.noteQ = (el) => {
  ui.notes.q = el.value;
  const q = norm(el.value);
  $("#nl").innerHTML = noteList([...S.notes].sort((a, b) => b.updated - a.updated).filter((n) => !q || norm(n.title + " " + n.body).includes(q)));
};
INP.noteTitle = (el) => {
  const n = curNote();
  n.title = el.value;
  n.updated = Date.now();
  save();
  $(".nitem.on b") && ($(".nitem.on b").textContent = n.title || "Sem título");
};
INP.noteBody = (el) => {
  const n = curNote();
  n.body = el.value;
  n.updated = Date.now();
  save();
  const p = $("#prev");
  if (p) p.innerHTML = md(n.body);
};
INP.noteLink = (el) => {
  const n = curNote();
  if (!el.value) delete n.link;
  else {
    const [t, id] = el.value.split(":");
    n.link = { type: t, id };
  }
  save();
  render();
};
ACT.noteGoLink = (el, e) => {
  e.preventDefault();
  const l = curNote().link;
  if (l.type === "event") {
    go("calendar");
    setTimeout(() => openEvent(l.id, null), 50);
  } else {
    ui.fin.tab = "tx";
    go("finance");
    setTimeout(() => openTx(l.id), 50);
  }
};
