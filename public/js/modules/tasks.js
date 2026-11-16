"use strict";
ui.tasks = Object.assign({ prio: "", tag: "", q: "" }, ui.tasks);
const taskMatch = (t) => {
  const f = ui.tasks, q = norm(f.q);
  return (!f.prio || t.prio === f.prio) && (!f.tag || t.tag === f.tag) && (!q || norm(t.title + " " + (t.notes || "") + " " + (t.subs || []).map((x) => x.t).join(" ")).includes(q));
};
function taskFilters() {
  const f = ui.tasks;
  return `<select style="width:170px" data-ch="taskPrio"><option value="">Toda prioridade</option>${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${f.prio === k ? "selected" : ""}>${v.n}</option>`).join("")}</select><select style="width:150px" data-ch="taskTag"><option value="">Toda categoria</option>${Object.entries(TAGS).map(([k, v]) => `<option value="${k}" ${f.tag === k ? "selected" : ""}>${v.n}</option>`).join("")}</select><input type="text" style="width:190px" placeholder="Buscar tarefas…" value="${esc(f.q)}" data-in="taskQ">${f.prio || f.tag || f.q ? `<button class="btn sm ghost" data-act="taskClear">Limpar</button>` : ""}`;
}
INP.taskPrio = (el) => {
  ui.tasks.prio = el.value;
  render();
};
INP.taskTag = (el) => {
  ui.tasks.tag = el.value;
  render();
};
INP.taskQ = (el) => {
  ui.tasks.q = el.value;
  renderKeep(el);
};
ACT.taskClear = () => {
  Object.assign(ui.tasks, { prio: "", tag: "", q: "" });
  render();
};
const KCOLS = [["todo", "A fazer"], ["doing", "Em andamento"], ["done", "Concluído"]];
const spawnNext = TaskOps.spawnNext, setTaskCol = TaskOps.setCol, subAuto = TaskOps.subAuto, subCount = TaskOps.subCount;
I.pin = '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3zM12 14v7"/>';
I.clip = '<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7L9.2 17.2a1.7 1.7 0 0 1-2.4-2.4L14 7.6"/>';
ui.tasks.sel = ui.tasks.sel || new Set();
const selN = () => ui.tasks.sel.size;
function taskCard(t) {
  const ts = todayStr(), late = t.due && t.due < ts && t.col !== "done", sel = ui.tasks.sel.has(TaskOps.keyT(t.id)), nf = (t.files || []).length;
  return `<div class="kcard ${t.col === "done" ? "done" : ""} ${t.pin ? "pinned" : ""} ${sel ? "sel" : ""}" draggable="true" data-id="${t.id}" data-act="openTask"><button class="ksel" data-act="taskSel" data-id="${t.id}" title="Selecionar" aria-pressed="${sel}">${sel ? "✓" : ""}</button><div class="kact"><button class="icon-btn pinb ${t.pin ? "on" : ""}" data-act="taskPin" data-id="${t.id}" title="${t.pin ? "Desafixar" : "Fixar no topo"}">${ic("pin", 13)}</button><button class="icon-btn ced" data-act="openTask" data-id="${t.id}" title="Editar tarefa">${ic("edit", 13)}</button></div><div class="tt">${esc(t.title)}</div>${subsHtml(t)}<div class="m">
   ${t.prio ? `<span class="pill ${PRIO[t.prio].c}">${PRIO[t.prio].n}</span>` : ""}${t.tag ? `<span class="pill"><span class="dot" style="--c:${TAGS[t.tag].c}"></span>${TAGS[t.tag].n}</span>` : ""}
   ${t.due ? `<span class="pill ${late ? "bad" : ""}">${ic("calendar", 11)} ${t.due === ts ? "hoje" : fmtDay(t.due)}</span>` : ""}${t.rec && t.rec.freq !== "none" ? `<span class="pill">↻ ${recLabel(t.rec)}</span>` : ""}${t.eventId ? `<span class="pill blue">${ic("clock", 11)} no calendário</span>` : ""}${nf ? `<span class="pill">${ic("clip", 11)} ${nf}</span>` : ""}</div></div>`;
}
VIEWS.tasks = () => {
  const f = ui.tasks.filter, ts = todayStr();
  ui.tasks.sel = new Set(TaskOps.validKeys(ui.tasks.sel));
  const pred = (t) => (f === "all" || f === "today" && t.col !== "done" && t.due && t.due <= ts || f === "late" && t.col !== "done" && t.due && t.due < ts) && taskMatch(t);
  const n = selN();
  return `<div class="toolbar"><div class="seg">${[["all", "Todas"], ["today", "Hoje"], ["late", "Atrasadas"]].map(([k, nm]) => `<button class="${f === k ? "on" : ""}" data-act="taskFilter" data-f="${k}">${nm}</button>`).join("")}</div>${taskFilters()}<div class="grow"></div><button class="btn primary" data-act="newTask">${ic("plus")}Tarefa</button></div>
  <div class="kanban ${n ? "selecting" : ""}">${KCOLS.map(([k, nm]) => {
    const C = TaskOps.colList(k, pred), allSel = C.length && C.every((t) => ui.tasks.sel.has(TaskOps.keyT(t.id)));
    return `<div class="kcol" data-col="${k}"><div class="kh"><span class="khl"><button class="ksel kall ${allSel ? "on" : ""}" data-act="colSel" data-col="${k}" title="Selecionar toda a coluna">${allSel ? "✓" : ""}</button>${nm}</span><span class="muted">${C.length}</span></div>${C.map(taskCard).join("")}
   <form data-form="taskQuick" data-col="${k}" class="kadd"><input type="text" name="t" placeholder="+ Adicionar tarefa" autocomplete="off"></form></div>`;
  }).join("")}</div>
  <p class="muted sm" style="margin-top:12px">Arraste os cartões para reordenar ou mudar de coluna · 📌 fixa no topo · marque a caixinha de cartões e subtarefas para concluir ou excluir vários de uma vez (Esc limpa a seleção).</p>
  ${n ? `<div class="bulkbar"><b>${n} selecionada${n > 1 ? "s" : ""}</b><button class="btn primary" data-act="bulkDone">${ic("check")}Concluir (${n})</button><button class="btn danger" data-act="bulkDel">${ic("trash")}Excluir (${n})</button><button class="btn ghost" data-act="selClear">Cancelar</button></div>` : ""}`;
};
ACT.taskFilter = (el) => {
  ui.tasks.filter = el.dataset.f;
  render();
};
SUBMIT.taskQuick = (f, fd) => {
  const t = (fd.get("t") || "").trim();
  if (!t) return;
  TaskOps.insert({ id: uid(), title: t, col: f.dataset.col, prio: "media", tag: "", due: "", notes: "" });
  save();
  render();
  setTimeout(() => $(`form[data-col=${f.dataset.col}] input`)?.focus(), 0);
};
/* ---- fixar, selecionar, ações em massa ---- */
ACT.taskPin = (el, e) => {
  e.stopPropagation();
  const on = TaskOps.togglePin(el.dataset.id);
  save();
  render();
  toast(on ? "📌 Tarefa fixada no topo" : "Tarefa desafixada");
};
const toggleSel = (k) => (ui.tasks.sel.has(k) ? ui.tasks.sel.delete(k) : ui.tasks.sel.add(k));
ACT.taskSel = (el, e) => { e.stopPropagation(); toggleSel(TaskOps.keyT(el.dataset.id)); render(); };
ACT.subSel = (el, e) => { e.stopPropagation(); toggleSel(TaskOps.keyS(el.dataset.t, el.dataset.s)); render(); };
ACT.colSel = (el, e) => {
  e.stopPropagation();
  const ids = $$(`.kcol[data-col=${el.dataset.col}] .kcard`).map((c) => c.dataset.id), keys = ids.map((id) => TaskOps.keyT(id));
  const all = keys.length && keys.every((k) => ui.tasks.sel.has(k));
  keys.forEach((k) => (all ? ui.tasks.sel.delete(k) : ui.tasks.sel.add(k)));
  render();
};
ACT.selClear = () => { ui.tasks.sel.clear(); render(); };
ACT.bulkDone = () => {
  const n = TaskOps.bulkDone([...ui.tasks.sel]);
  ui.tasks.sel.clear();
  save();
  render();
  toast(n + " item(ns) concluído(s) ✓");
};
ACT.bulkDel = () => {
  const keys = [...ui.tasks.sel], nt = keys.filter((k) => k[0] === "t").length, ns = keys.length - nt;
  const parts = [nt && nt + " tarefa" + (nt > 1 ? "s" : ""), ns && ns + " subtarefa" + (ns > 1 ? "s" : "")].filter(Boolean).join(" e ");
  confirmAsk(`Excluir ${parts}? Esta ação não pode ser desfeita.`, () => {
    TaskOps.bulkDelete(keys);
    ui.tasks.sel.clear();
    save();
    render();
    toast("Itens excluídos");
  }, { yes: "Excluir (" + keys.length + ")" });
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && view === "tasks" && selN() && !$("#overlay .scrim") && !$("#dlg .dlg")) { ui.tasks.sel.clear(); render(); }
});
let dragSub = null, dragModal = null, dragTask = null;
const clearSubOver = () => $$(".sover").forEach((x) => x.classList.remove("sover"));
function moveItem(arr, from, to) {
  if (from < 0 || to < 0 || from === to) return;
  arr.splice(to, 0, arr.splice(from, 1)[0]);
}
document.addEventListener("dragstart", (e) => {
  const row = e.target.closest?.(".tsr"), grip = e.target.closest?.(".grip");
  if (row || grip) {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", "sub");
    e.dataTransfer.effectAllowed = "move";
    if (row) {
      dragSub = { t: row.dataset.t, s: row.dataset.s };
      row.classList.add("dg");
    } else {
      dragModal = +grip.dataset.i;
      e.dataTransfer.setDragImage(grip.closest("li"), 12, 12);
    }
    return;
  }
  const c = e.target.closest?.(".kcard");
  if (c) {
    dragTask = c.dataset.id;
    e.dataTransfer.setData("text/plain", c.dataset.id);
    e.dataTransfer.effectAllowed = "move";
    c.classList.add("dg");
  }
});
/* Para onde o cartão cai: dentro da coluna, antes do primeiro cartão cujo meio está abaixo do cursor. */
function dropSpot(e) {
  const col = e.target.closest?.(".kcol");
  if (!col) return null;
  const cards = $$(".kcard", col).filter((c) => c.dataset.id !== dragTask);
  const before = cards.find((c) => { const r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
  return { col, before: before || null };
}
const clearIns = () => $$(".ins-b,.ins-end").forEach((x) => x.classList.remove("ins-b", "ins-end"));
document.addEventListener("dragend", () => {
  dragSub = null;
  dragModal = null;
  dragTask = null;
  clearIns();
  clearSubOver();
  $$(".dg").forEach((x) => x.classList.remove("dg"));
  $$(".kcol.drop").forEach((x) => x.classList.remove("drop"));
});
document.addEventListener("dragover", (e) => {
  if (dragSub || dragModal != null) {
    const r = dragSub ? e.target.closest?.(".tsr") : e.target.closest?.("#tsubs li");
    clearSubOver();
    if (r && (dragModal != null || r.dataset.t === dragSub.t)) {
      e.preventDefault();
      r.classList.add("sover");
    }
    return;
  }
  const sp = dragTask && dropSpot(e);
  if (sp) {
    e.preventDefault();
    clearIns();
    $$(".kcol.drop").forEach((x) => x !== sp.col && x.classList.remove("drop"));
    sp.col.classList.add("drop");
    (sp.before ? sp.before : sp.col.querySelector(".kadd")).classList.add(sp.before ? "ins-b" : "ins-end");
  }
});
document.addEventListener("drop", (e) => {
  if (dragSub || dragModal != null) {
    const r = dragSub ? e.target.closest?.(".tsr") : e.target.closest?.("#tsubs li");
    if (r) {
      e.preventDefault();
      if (dragModal != null) {
        moveItem(dTaskSubs, dragModal, +r.dataset.i);
        renderTSubs();
      } else if (r.dataset.t === dragSub.t) {
        const t = S.tasks.find((x) => x.id === dragSub.t);
        if (t) {
          moveItem(t.subs, t.subs.findIndex((x) => x.id === dragSub.s), t.subs.findIndex((x) => x.id === r.dataset.s));
          save();
          render();
        }
      }
    }
    dragSub = null;
    dragModal = null;
    clearSubOver();
    return;
  }
  const sp = dragTask && dropSpot(e);
  if (!sp) return;
  e.preventDefault();
  const id = dragTask;
  dragTask = null;
  clearIns();
  TaskOps.move(id, sp.before ? sp.before.dataset.id : "", false, sp.col.dataset.col);
  save();
  render();
});
let dTask = null;
ACT.newTask = () => openTask(null);
ACT.openTask = (el, e) => {
  if (selN() || e.ctrlKey || e.metaKey || e.shiftKey) return ACT.taskSel(el, e);
  openTask(el.dataset.id);
};
function openTask(id) {
  const t = id ? S.tasks.find((x) => x.id === id) : { title: "", col: "todo", prio: "media", tag: "", due: "", notes: "" };
  dTask = id;
  dTaskSubs = clone(t.subs || []);
  dTaskFiles = clone(t.files || []);
  dTaskFilesOrig = clone(t.files || []);
  const ev = t.eventId && S.events.find((x) => x.id === t.eventId), sd = ev ? ev.start.slice(0, 10) : t.due || todayStr(), st = ev ? ev.start.slice(11, 16) : "09:00", dur = ev ? Math.round((wd(ev.end) - wd(ev.start)) / 6e4) : 60;
  modal(`<form data-form="task"><h2>${id ? "Editar tarefa" : "Nova tarefa"}</h2><label class="field"><span>Título</span><input type="text" name="title" value="${esc(t.title)}" required></label>
  <div class="grid3 wide1"><label class="field"><span>Coluna</span><select name="col">${KCOLS.map(([k, n]) => `<option value="${k}" ${t.col === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
   <label class="field"><span>Prioridade</span><select name="prio">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${t.prio === k ? "selected" : ""}>${v.n}</option>`).join("")}</select></label>
   <label class="field"><span>Categoria</span><select name="tag"><option value="">—</option>${Object.entries(TAGS).map(([k, v]) => `<option value="${k}" ${t.tag === k ? "selected" : ""}>${v.n}</option>`).join("")}</select></label></div>
  <div class="row" style="gap:16px;align-items:flex-end;flex-wrap:wrap"><label class="field grow"><span>Prazo</span><input type="date" name="due" value="${t.due || ""}"></label><label class="row" style="margin-bottom:12px;gap:6px"><input type="checkbox" name="pin" ${t.pin ? "checked" : ""}> ${ic("pin", 14)} Fixar no topo da coluna</label></div>
  <div class="field"><span>Subtarefas <b id="tprog" class="muted"></b></span><ul class="subs" id="tsubs"></ul><div class="row"><input type="text" id="tsubIn" placeholder="Adicionar subtarefa e Enter"><button type="button" class="btn" data-act="tsubAdd">${ic("plus")}</button></div></div>
  ${recFields(t.rec)}
  <label class="field"><span>Notas</span><textarea name="notes" rows="2">${esc(t.notes || "")}</textarea></label>
  <div class="field"><span>Anexos <small class="muted">(imagens, PDFs, qualquer arquivo até 50 MB)</small></span><div id="tfiles" data-track></div><label class="btn sm fpick">${ic("clip", 14)} Anexar arquivos<input type="file" multiple hidden data-ch="tfileAdd"></label></div>
  <div class="card flat" style="padding:12px"><div class="row" style="margin-bottom:8px"><b>${ic("calendar", 15)} Bloco no calendário</b>${ev ? '<span class="pill blue">agendado</span>' : ""}</div>
   <div class="grid3"><label class="field"><span>Data</span><input type="date" name="sd" value="${sd}"></label><label class="field"><span>Hora</span><input type="time" name="st" value="${st}"></label><label class="field"><span>Duração (min)</span><input type="number" name="sdur" min="15" step="15" value="${dur}"></label></div>
   <div class="row"><button type="button" class="btn" data-act="taskSchedule">${ev ? "Reagendar bloco" : "Agendar bloco"}</button>${ev ? `<button type="button" class="btn ghost danger" data-act="taskUnschedule">Remover bloco</button>` : ""}</div></div>
  <div class="foot">${id ? `<button type="button" class="btn danger" data-act="taskDel">${ic("trash")}Excluir</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`, { onMount: () => { renderTSubs(); renderTFiles(); } });
}
function taskFromForm(f) {
  const fd = new FormData(f);
  return { title: fd.get("title").trim(), col: fd.get("col"), prio: fd.get("prio"), tag: fd.get("tag"), due: fd.get("due"), notes: fd.get("notes"), rec: recFromForm(fd), subs: clone(dTaskSubs).filter((x) => x.t.trim()), pin: fd.get("pin") === "on", files: clone(dTaskFiles) };
}
SUBMIT.task = (f, fd) => {
  const o = taskFromForm(f);
  if (dTask) {
    const t = S.tasks.find((x) => x.id === dTask);
    const was = t.col, subsBefore = JSON.stringify(t.subs || []);
    Object.assign(t, o);
    setTaskCol(t.id, o.col, was);
    if (JSON.stringify(t.subs) !== subsBefore) subAuto(t);
    const e = t.eventId && S.events.find((x) => x.id === t.eventId);
    if (e) e.title = o.title;
  } else {
    const n = { id: uid(), ...o };
    TaskOps.insert(n);
    subAuto(n);
  }
  dTaskFilesOrig.filter((f) => !dTaskFiles.some((x) => x.id === f.id)).forEach((f) => Files.remove(f.id));
  save();
  closeModal();
  render();
};
ACT.taskSchedule = (el) => {
  const f = el.closest("form"), fd = new FormData(f);
  if (!fd.get("title").trim() || !fd.get("sd")) {
    toast("Preencha título e data", true);
    return;
  }
  let t = dTask && S.tasks.find((x) => x.id === dTask);
  const o = taskFromForm(f);
  if (!t) {
    t = { id: uid(), ...o };
    TaskOps.insert(t);
    dTask = t.id;
  } else Object.assign(t, o);
  const s = fd.get("sd") + "T" + fd.get("st"), en = fmtDT(new Date(wd(s).getTime() + (+fd.get("sdur") || 60) * 6e4));
  let e = t.eventId && S.events.find((x) => x.id === t.eventId);
  if (e) {
    Object.assign(e, { title: t.title, start: s, end: en, tz: dtz(), allDay: false });
  } else {
    e = { id: uid(), title: t.title, start: s, end: en, tz: dtz(), tag: t.tag || "pessoal", prio: t.prio, allDay: false, rec: { freq: "none" }, ex: [], subtasks: [], links: [], notes: "", remind: 15, taskId: t.id };
    S.events.push(e);
    t.eventId = e.id;
  }
  t.due = fd.get("sd");
  e.done = t.col === "done";
  save();
  closeModal();
  render();
  const c = findConflicts(fromWall(wd(s), dtz()), fromWall(wd(en), dtz()), e.id);
  toast(c.length ? "Bloco agendado. Acontece ao mesmo tempo que: " + c.map((x) => x.e.title).join(", ") : "Bloco agendado no calendário");
};
ACT.taskUnschedule = () => {
  const t = S.tasks.find((x) => x.id === dTask);
  if (t?.eventId) {
    S.events = S.events.filter((x) => x.id !== t.eventId);
    delete t.eventId;
  }
  save();
  closeModal();
  render();
};
ACT.taskDel = () => {
  const id = dTask;
  confirmAsk("Excluir esta tarefa (e o bloco do calendário, se houver)?", () => {
    TaskOps.removeTask(id);
    save();
    closeModal();
    render();
  }, { yes: "Excluir" });
};
let dTaskSubs = [], dTaskFiles = [], dTaskFilesOrig = [];
function subsHtml(t) {
  const { n, d } = subCount(t);
  if (!n) return "";
  const row = (x) => { const on = ui.tasks.sel.has(TaskOps.keyS(t.id, x.id)); return `<div class="tsr ${on ? "son" : ""}" draggable="true" data-act="subToggle" data-t="${t.id}" data-s="${x.id}"><input type="checkbox" tabindex="-1" ${x.d ? "checked" : ""}><span class="${x.d ? "x" : ""}">${esc(x.t)}</span><button class="ksel ssel" data-act="subSel" data-t="${t.id}" data-s="${x.id}" title="Selecionar subtarefa">${on ? "✓" : ""}</button></div>`; };
  const open = t.subs.filter((x) => !x.d), done = t.subs.filter((x) => x.d);
  return `<div class="tsub"><div class="bar-t ${d === n ? "" : "w"}"><i style="width:${d / n * 100}%"></i></div><span class="sm muted">${d}/${n}</span></div>
   <div class="tsub-list">${open.slice(0, 5).map(row).join("")}${open.length > 5 ? `<div class="sm muted">+${open.length - 5} pendente${open.length - 5 > 1 ? "s" : ""}</div>` : ""}${done.length ? `<details class="tdone" data-act="nop" ${ui.tasks.openDone?.[t.id] ? "open" : ""} data-id="${t.id}"><summary>${done.length} concluída${done.length > 1 ? "s" : ""}</summary>${done.map(row).join("")}</details>` : ""}</div>`;
}
ACT.subToggle = (el, e) => {
  if (selN() || e.ctrlKey || e.metaKey || e.shiftKey) return ACT.subSel(el, e);
  const t = S.tasks.find((x) => x.id === el.dataset.t), s = t && t.subs.find((x) => x.id === el.dataset.s);
  if (!s) return;
  s.d = !s.d;
  subAuto(t);
  save();
  render();
};
function renderTSubs() {
  const u = $("#tsubs");
  if (!u) return;
  u.innerHTML = dTaskSubs.map((s, i) => `<li data-i="${i}"><span class="grip" draggable="true" data-i="${i}" title="Arraste para reordenar">⋮⋮</span><input type="checkbox" data-ch="tsubChk" data-i="${i}" ${s.d ? "checked" : ""}><input type="text" class="grow sub-edit ${s.d ? "muted" : ""}" value="${esc(s.t)}" data-in="tsubTxt" data-i="${i}" title="Editar subtarefa"><button type="button" class="icon-btn" data-act="tsubDel" data-i="${i}">${ic("x", 13)}</button></li>`).join("");
  const d = dTaskSubs.filter((s) => s.d).length;
  $("#tprog").textContent = dTaskSubs.length ? `(${d}/${dTaskSubs.length})` : "";
}
ACT.tsubAdd = () => {
  const i = $("#tsubIn");
  if (!i || !i.value.trim()) return;
  dTaskSubs.push({ id: uid(), t: i.value.trim(), d: false });
  i.value = "";
  renderTSubs();
  i.focus();
};
ACT.tsubDel = (el) => {
  dTaskSubs.splice(+el.dataset.i, 1);
  renderTSubs();
};
INP.tsubTxt = (el) => {
  dTaskSubs[+el.dataset.i].t = el.value;
};
INP.tsubChk = (el) => {
  dTaskSubs[+el.dataset.i].d = el.checked;
  renderTSubs();
};
document.addEventListener("toggle", (e) => {
  const d = e.target;
  if (d.classList?.contains("tdone")) (ui.tasks.openDone || (ui.tasks.openDone = {}))[d.dataset.id] = d.open;
}, true);
ACT.nop = () => {};

function renderTFiles() {
  const b = $("#tfiles");
  if (!b) return;
  b.innerHTML = dTaskFiles.map((f, i) => `<div class="frow">${f.type.startsWith("image/") ? `<img class="fthumb" data-fid="${f.id}" alt="">` : `<span class="ficon">${Files.icon(f.type)}</span>`}<a href="#" class="grow" data-act="fileOpen" data-fid="${f.id}" data-name="${esc(f.name)}">${esc(f.name)} <small class="muted">${Files.size(f.size)}</small></a><button type="button" class="icon-btn" data-act="tfileDel" data-i="${i}" title="Remover anexo">${ic("x", 13)}</button></div>`).join("");
  Files.resolve(b);
}
ACT.fileOpen = (el, e) => { e.preventDefault(); e.stopPropagation(); Files.open(el.dataset.fid, el.dataset.name); };
ACT.tfileDel = (el) => { dTaskFiles.splice(+el.dataset.i, 1); renderTFiles(); };
INP.tfileAdd = async (el) => {
  const L = [...el.files];
  el.value = "";
  for (const f of L) {
    try { const m = await Files.put(f); dTaskFiles.push(m); renderTFiles(); }
    catch (x) { toast(x.message || "Não foi possível anexar", true); }
  }
};
