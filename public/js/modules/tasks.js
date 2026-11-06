"use strict";
const KCOLS = [["todo", "A fazer"], ["doing", "Em andamento"], ["done", "Concluído"]];
function setTaskCol(id, col) {
  const t = S.tasks.find((x) => x.id === id);
  if (!t) return;
  t.col = col;
  if (t.eventId) {
    const e = S.events.find((x) => x.id === t.eventId);
    if (e) e.done = col === "done";
  }
}
function taskCard(t) {
  const ts = todayStr(), late = t.due && t.due < ts && t.col !== "done";
  return `<div class="kcard ${t.col === "done" ? "done" : ""}" draggable="true" data-id="${t.id}" data-act="openTask"><div class="tt">${esc(t.title)}</div><div class="m">
   ${t.prio ? `<span class="pill ${PRIO[t.prio].c}">${PRIO[t.prio].n}</span>` : ""}${t.tag ? `<span class="pill"><span class="dot" style="--c:${TAGS[t.tag].c}"></span>${TAGS[t.tag].n}</span>` : ""}
   ${t.due ? `<span class="pill ${late ? "bad" : ""}">${ic("calendar", 11)} ${t.due === ts ? "hoje" : fmtDay(t.due)}</span>` : ""}${t.eventId ? `<span class="pill blue">${ic("clock", 11)} no calendário</span>` : ""}</div></div>`;
}
VIEWS.tasks = () => {
  const f = ui.tasks.filter, ts = todayStr();
  const L = S.tasks.filter((t) => f === "all" || f === "today" && t.col !== "done" && t.due && t.due <= ts || f === "late" && t.col !== "done" && t.due && t.due < ts);
  return `<div class="toolbar"><div class="seg">${[["all", "Todas"], ["today", "Hoje"], ["late", "Atrasadas"]].map(([k, n]) => `<button class="${f === k ? "on" : ""}" data-act="taskFilter" data-f="${k}">${n}</button>`).join("")}</div><div class="grow"></div><button class="btn primary" data-act="newTask">${ic("plus")}Tarefa</button></div>
  <div class="kanban">${KCOLS.map(([k, n]) => {
    const C = L.filter((t) => t.col === k);
    return `<div class="kcol" data-col="${k}"><div class="kh"><span>${n}</span><span class="muted">${C.length}</span></div>${C.map(taskCard).join("")}
   <form data-form="taskQuick" data-col="${k}" class="kadd"><input type="text" name="t" placeholder="+ Adicionar tarefa" autocomplete="off"></form></div>`;
  }).join("")}</div>
  <p class="muted sm" style="margin-top:12px">Arraste os cartões entre colunas. Abra uma tarefa para agendá-la como bloco de tempo no calendário — concluir a tarefa marca o bloco como feito.</p>`;
};
ACT.taskFilter = (el) => {
  ui.tasks.filter = el.dataset.f;
  render();
};
SUBMIT.taskQuick = (f, fd) => {
  const t = (fd.get("t") || "").trim();
  if (!t) return;
  S.tasks.push({ id: uid(), title: t, col: f.dataset.col, prio: "media", tag: "", due: "", notes: "" });
  save();
  render();
  setTimeout(() => $(`form[data-col=${f.dataset.col}] input`)?.focus(), 0);
};
document.addEventListener("dragstart", (e) => {
  const c = e.target.closest?.(".kcard");
  if (c) {
    e.dataTransfer.setData("text/plain", c.dataset.id);
    e.dataTransfer.effectAllowed = "move";
    c.classList.add("dg");
  }
});
document.addEventListener("dragend", () => {
  $$(".dg").forEach((x) => x.classList.remove("dg"));
  $$(".kcol.drop").forEach((x) => x.classList.remove("drop"));
});
document.addEventListener("dragover", (e) => {
  const c = e.target.closest?.(".kcol");
  if (c) {
    e.preventDefault();
    $$(".kcol.drop").forEach((x) => x !== c && x.classList.remove("drop"));
    c.classList.add("drop");
  }
});
document.addEventListener("drop", (e) => {
  const c = e.target.closest?.(".kcol");
  if (!c) return;
  e.preventDefault();
  const id = e.dataTransfer.getData("text/plain");
  if (id) {
    setTaskCol(id, c.dataset.col);
    save();
    render();
  }
});
let dTask = null;
ACT.newTask = () => openTask(null);
ACT.openTask = (el) => openTask(el.dataset.id);
function openTask(id) {
  const t = id ? S.tasks.find((x) => x.id === id) : { title: "", col: "todo", prio: "media", tag: "", due: "", notes: "" };
  dTask = id;
  const ev = t.eventId && S.events.find((x) => x.id === t.eventId), sd = ev ? ev.start.slice(0, 10) : t.due || todayStr(), st = ev ? ev.start.slice(11, 16) : "09:00", dur = ev ? Math.round((wd(ev.end) - wd(ev.start)) / 6e4) : 60;
  modal(`<form data-form="task"><h2>${id ? "Editar tarefa" : "Nova tarefa"}</h2><label class="field"><span>Título</span><input type="text" name="title" value="${esc(t.title)}" required></label>
  <div class="grid3"><label class="field"><span>Coluna</span><select name="col">${KCOLS.map(([k, n]) => `<option value="${k}" ${t.col === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
   <label class="field"><span>Prioridade</span><select name="prio">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${t.prio === k ? "selected" : ""}>${v.n}</option>`).join("")}</select></label>
   <label class="field"><span>Categoria</span><select name="tag"><option value="">—</option>${Object.entries(TAGS).map(([k, v]) => `<option value="${k}" ${t.tag === k ? "selected" : ""}>${v.n}</option>`).join("")}</select></label></div>
  <label class="field"><span>Prazo</span><input type="date" name="due" value="${t.due || ""}"></label>
  <label class="field"><span>Notas</span><textarea name="notes" rows="2">${esc(t.notes || "")}</textarea></label>
  <div class="card flat" style="padding:12px"><div class="row" style="margin-bottom:8px"><b>${ic("calendar", 15)} Bloco no calendário</b>${ev ? '<span class="pill blue">agendado</span>' : ""}</div>
   <div class="grid3"><label class="field"><span>Data</span><input type="date" name="sd" value="${sd}"></label><label class="field"><span>Hora</span><input type="time" name="st" value="${st}"></label><label class="field"><span>Duração (min)</span><input type="number" name="sdur" min="15" step="15" value="${dur}"></label></div>
   <div class="row"><button type="button" class="btn" data-act="taskSchedule">${ev ? "Reagendar bloco" : "Agendar bloco"}</button>${ev ? `<button type="button" class="btn ghost danger" data-act="taskUnschedule">Remover bloco</button>` : ""}</div></div>
  <div class="foot">${id ? `<button type="button" class="btn danger" data-act="taskDel">${ic("trash")}Excluir</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
}
function taskFromForm(f) {
  const fd = new FormData(f);
  return { title: fd.get("title").trim(), col: fd.get("col"), prio: fd.get("prio"), tag: fd.get("tag"), due: fd.get("due"), notes: fd.get("notes") };
}
SUBMIT.task = (f, fd) => {
  const o = taskFromForm(f);
  if (dTask) {
    const t = S.tasks.find((x) => x.id === dTask);
    Object.assign(t, o);
    setTaskCol(t.id, o.col);
    const e = t.eventId && S.events.find((x) => x.id === t.eventId);
    if (e) e.title = o.title;
  } else S.tasks.push({ id: uid(), ...o });
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
    S.tasks.push(t);
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
  toast(c.length ? "⚠ Agendado, mas conflita com: " + c.map((x) => x.e.title).join(", ") : "Bloco agendado no calendário", !!c.length);
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
  const t = S.tasks.find((x) => x.id === dTask);
  if (t?.eventId) S.events = S.events.filter((x) => x.id !== t.eventId);
  S.tasks = S.tasks.filter((x) => x.id !== dTask);
  save();
  closeModal();
  render();
};
