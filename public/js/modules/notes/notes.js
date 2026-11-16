"use strict";
ui.notes = Object.assign({ sort: "recent", filter: "all" }, ui.notes);
if (ui.notes.mode !== "view") ui.notes.mode = "edit";
let NED = null; // editor rico montado agora (ou null)
const COVERS = { none: "", azul: "linear-gradient(120deg,#dbe7ff,#b9ccff)", verde: "linear-gradient(120deg,#d4f5dd,#a9e5bd)", ambar: "linear-gradient(120deg,#ffeccb,#ffd491)", rosa: "linear-gradient(120deg,#ffdfe6,#ffb8c8)", roxo: "linear-gradient(120deg,#e6dcff,#c7b4ff)", grafite: "linear-gradient(120deg,#e4e8ee,#c3cad6)" };
const FONTS = { sans: "Sans", serif: "Serifada", mono: "Mono" };
function noteQuery() {
  const q = norm(ui.notes.q), f = ui.notes.filter, s = ui.notes.sort;
  const sorters = { recent: (a, b) => b.updated - a.updated, old: (a, b) => a.created - b.created, az: (a, b) => (a.title || "").localeCompare(b.title || "", "pt-BR") };
  return [...S.notes].filter((n) => (!q || norm(n.title + " " + n.body).includes(q)) && (f === "all" || f === "linked" && n.link || f === "meeting" && NoteDoc.isMeeting(n))).sort(sorters[s] || sorters.recent);
}
INP.noteSort = (el) => { ui.notes.sort = el.value; render(); };
INP.noteFilter = (el) => { ui.notes.filter = el.value; render(); };
const curNote = () => S.notes.find((n) => n.id === ui.notes.sel);
const fmtTs = (ts) => new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
function linkLabel(l) {
  if (!l) return "";
  if (l.type === "event") {
    const e = S.events.find((x) => x.id === l.id);
    return e ? "" + e.title : "";
  }
  const t = S.tx.find((x) => x.id === l.id);
  return t ? "" + t.desc + " (" + brl(t.amount) + ")" : "";
}
VIEWS.notes = () => {
  const L = noteQuery();
  if (!ui.notes.sel || !S.notes.some((n2) => n2.id === ui.notes.sel)) ui.notes.sel = L[0]?.id || null;
  const n = curNote(), mode = ui.notes.mode, recHere = REC.on && n && REC.noteId === n.id;
  const evs = [...S.events].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 60), txs = [...S.tx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
  return `<div class="notes"><div class="card nlist"><div class="row nnew"><button class="btn primary sm grow" data-act="newNote">${ic("plus")}Nova nota</button><button class="btn sm" data-act="newMeeting" title="Cria uma nota de reunião e já começa a transcrever">${ic("mic")}Reunião</button></div>
  <div class="row" style="padding:0 4px 8px"><input type="text" placeholder="Buscar notas…" value="${esc(ui.notes.q)}" data-in="noteQ"></div><div class="row" style="padding:0 4px 8px;gap:6px;flex-wrap:wrap"><select style="flex:1 1 110px" data-ch="noteSort"><option value="recent" ${ui.notes.sort === "recent" ? "selected" : ""}>Mais recentes</option><option value="old" ${ui.notes.sort === "old" ? "selected" : ""}>Mais antigas</option><option value="az" ${ui.notes.sort === "az" ? "selected" : ""}>Título A–Z</option></select><select style="flex:1 1 110px" data-ch="noteFilter"><option value="all" ${ui.notes.filter === "all" ? "selected" : ""}>Todas</option><option value="linked" ${ui.notes.filter === "linked" ? "selected" : ""}>Com vínculo</option><option value="meeting" ${ui.notes.filter === "meeting" ? "selected" : ""}>Reuniões gravadas</option></select></div><div id="nl">${noteList(L)}</div></div>
  <div class="card editor ${n && n.font ? "f-" + n.font : ""}">${n ? `
   <div class="ebar"><div class="seg">${[["edit", "Editar"], ["view", "Ler"]].map(([k, t]) => `<button class="${mode === k ? "on" : ""}" data-act="noteMode" data-m="${k}">${t}</button>`).join("")}</div>
    ${recHere ? `<button class="btn danger" data-act="recStop">${ic("stop")}Parar gravação</button>` : `<button class="btn" data-act="recStart">${ic("mic")}Gravar reunião</button>`}
    <select style="width:170px" data-ch="noteEngine" title="Motor de transcrição" ${REC.on ? "disabled" : ""}><option value="browser" ${ui.notes.engine !== "whisper" ? "selected" : ""}>Voz: ao vivo (navegador)</option><option value="whisper" ${ui.notes.engine === "whisper" ? "selected" : ""}>Voz: precisa (IA + reserva)</option></select>
    <select style="width:170px" data-ch="noteLink" title="Vincular"><option value="">Vincular a…</option><optgroup label="Eventos">${evs.map((e) => `<option value="event:${e.id}" ${n.link?.id === e.id ? "selected" : ""}>${esc(e.title)} · ${fmtDay(e.start.slice(0, 10))}</option>`).join("")}</optgroup><optgroup label="Transações">${txs.map((t) => `<option value="tx:${t.id}" ${n.link?.id === t.id ? "selected" : ""}>${esc(t.desc)} · ${brl(t.amount)}</option>`).join("")}</optgroup></select>
    ${n.link && linkLabel(n.link) ? `<a href="#" class="sm" data-act="noteGoLink">${esc(linkLabel(n.link))}</a>` : ""}<span class="grow"></span>
    <button class="btn sm" data-act="noteStyle" title="Ícone, capa e fonte">Estilo</button><button class="btn sm" data-act="noteSummary" title="Resumir a transcrição (ou a nota inteira)">Resumir</button><button class="btn sm ghost danger" data-act="noteDel">${ic("trash", 14)}</button></div>
   ${recHere ? `<div class="recbox"><span class="pulse"></span><b id="recT">${NoteDoc.mmss(Date.now() - REC.start)}</b><span class="live" id="recLive">Ouvindo… pode continuar digitando</span></div>` : ""}
   ${n.cover && COVERS[n.cover] ? `<div class="ncover" style="background:${COVERS[n.cover]}"></div>` : ""}
   <div class="thead"><input class="tt" type="text" value="${esc(n.title)}" placeholder="Sem título" data-in="noteTitle"></div>
   <div id="rt-host" class="rt-wrap"></div>` : `<div class="empty" style="margin:auto">Selecione ou crie uma nota.<br><br><button class="btn primary" data-act="newNote">${ic("plus")}Nova nota</button> <button class="btn" data-act="newMeeting">${ic("mic")}Nova reunião</button></div>`}</div></div>`;
};
AFTER.notes = () => {
  NED = null;
  const n = curNote(), host = $("#rt-host");
  if (!n || !host) return;
  NoteDoc.ensure(n);
  const ed = RT.mount(host, {
    html: n.html,
    readonly: ui.notes.mode === "view",
    placeholder: "Escreva aqui…",
    onChange: (h, t) => {
      if (h === n.html) return;
      n.html = h; n.body = t; n.updated = Date.now();
      save();
      const nl = $("#nl");
      if (nl && !ui.notes.q) nl.innerHTML = noteList(noteQuery());
    }
  });
  ed.noteId = n.id;
  NED = ed;
};
function noteList(L) {
  return L.map((n) => `<div class="nitem ${n.id === ui.notes.sel ? "on" : ""}" data-act="noteSel" data-id="${n.id}"><b>${esc((n.title || "Sem título"))}</b><small>${fmtTs(n.updated)} · ${esc((n.body || "").replace(/\s+/g, " ").slice(0, 50))}</small></div>`).join("") || '<div class="empty">Sem notas</div>';
}
ACT.noteSel = (el) => { ui.notes.sel = el.dataset.id; render(); };
ACT.noteMode = (el) => { ui.notes.mode = el.dataset.m; render(); };
INP.noteEngine = (el) => { ui.notes.engine = el.value; try { LS.setItem("norte:engine", el.value); } catch {} };
try { ui.notes.engine = LS.getItem("norte:engine") || "browser"; } catch {}
ACT.newNote = () => {
  const n = NoteDoc.create();
  ui.notes.sel = n.id;
  ui.notes.mode = "edit";
  ui.notes.q = "";
  save();
  go("notes");
  render();
  setTimeout(() => $(".editor .tt")?.focus(), 30);
};
function newMeetingNote() {
  const d = new Date(), n = NoteDoc.create({ title: "Reunião — " + d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), html: NoteDoc.meetingHtml() });
  const t = todayWall(), now = Date.now();
  const o = occs(addDays(dayStart(t), -1), addDays(dayStart(t), 2)).find((o2) => !o2.allDay && o2.sMs - 15 * 6e4 <= now && o2.eMs > now);
  if (o) n.link = { type: "event", id: o.e.id }, n.title = "Reunião — " + o.e.title;
  n.body = RT.text(n.html);
  ui.notes.sel = n.id;
  ui.notes.mode = "edit";
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
  const id = ui.notes.sel;
  confirmAsk("Excluir esta nota? Esta ação não pode ser desfeita.", () => {
    if (REC.on && REC.noteId === id) stopRec();
    NED = null;
    S.notes = S.notes.filter((n) => n.id !== id);
    ui.notes.sel = null;
    save();
    render();
  }, { yes: "Excluir" });
};
INP.noteQ = (el) => {
  ui.notes.q = el.value;
  $("#nl").innerHTML = noteList(noteQuery());
};
INP.noteTitle = (el) => {
  const n = curNote();
  n.title = el.value;
  n.updated = Date.now();
  save();
  $(".nitem.on b") && ($(".nitem.on b").textContent = (n.icon ? n.icon + " " : "") + (n.title || "Sem título"));
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
/* ---- estilo da nota: ícone, capa e fonte ---- */
ACT.noteStyle = () => {
  const n = curNote();
  if (!n) return;
  modal(`<form data-form="noteStyle"><h2>Estilo da nota</h2>
   <div class="field"><span>Capa</span><div class="covers">${Object.entries(COVERS).map(([k, v]) => `<label class="cv" style="background:${v || "#fff"}" title="${k}"><input type="radio" name="cover" value="${k}" ${(n.cover || "none") === k ? "checked" : ""}>${k === "none" ? "—" : ""}</label>`).join("")}</div></div>
   <label class="field"><span>Fonte do texto</span><select name="font">${Object.entries(FONTS).map(([k, v]) => `<option value="${k}" ${(n.font || "sans") === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
   <div class="foot"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Aplicar</button></div></form>`);
};
SUBMIT.noteStyle = (f, fd) => {
  const n = curNote();
  n.cover = fd.get("cover") === "none" ? "" : fd.get("cover");
  n.font = fd.get("font") === "sans" ? "" : fd.get("font");
  n.updated = Date.now();
  save();
  closeModal();
  render();
};
