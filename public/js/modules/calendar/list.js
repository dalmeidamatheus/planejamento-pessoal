"use strict";
ui.cl = { sel: new Set(), sort: "next", scope: "all" };
const CL_SCOPES = [["all", "Todos"], ["next", "Próximos"], ["past", "Passados"], ["rec", "Que se repetem"], ["done", "Concluídos"]];
const CL_SORTS = [["next", "Por data"], ["title", "Título A–Z"], ["tag", "Categoria"], ["prio", "Prioridade"]];
const CL_REMIND = [["", "Lembrete…"], ["none", "Sem lembrete"], ["0", "No horário"], ["5", "5 min antes"], ["10", "10 min antes"], ["15", "15 min antes"], ["30", "30 min antes"], ["60", "1 hora antes"], ["1440", "1 dia antes"]];
const remindLabel = (v) => v == null ? "—" : v === 0 ? "No horário" : v >= 1440 ? v / 1440 + " dia antes" : v >= 60 ? v / 60 + " h antes" : v + " min antes";
function clNext(e) {
  const now = Date.now(), up = occurrences(e, now, now + 800 * 864e5)[0];
  if (up) return { o: up, past: false };
  const all = occurrences(e, now - 3650 * 864e5, now);
  return { o: all[all.length - 1] || null, past: true };
}
function clRows() {
  const f = ui.cal.f, q = norm(f.q), sc = ui.cl.scope;
  const rows = S.events.map((e) => ({ e, ...clNext(e) })).filter(({ e, past }) => {
    const rec = e.rec && e.rec.freq !== "none";
    return (!f.tags.length || f.tags.includes(e.tag)) && (!f.prio || e.prio === f.prio) && (!f.hideDone || !e.done) && (!q || norm(e.title + " " + (e.notes || "")).includes(q)) && (sc === "all" || sc === "next" && !past || sc === "past" && past || sc === "rec" && rec || sc === "done" && e.done);
  });
  const po = { alta: 0, media: 1, baixa: 2 }, tags = Object.keys(TAGS);
  const by = { title: (a, b) => a.e.title.localeCompare(b.e.title, "pt-BR"), tag: (a, b) => tags.indexOf(a.e.tag) - tags.indexOf(b.e.tag) || a.e.title.localeCompare(b.e.title, "pt-BR"), prio: (a, b) => (po[a.e.prio] ?? 1) - (po[b.e.prio] ?? 1) };
  return rows.sort(by[ui.cl.sort] || ((a, b) => a.past - b.past || (!a.o) - (!b.o) || (a.o && b.o ? a.past ? b.o.sMs - a.o.sMs : a.o.sMs - b.o.sMs : 0)));
}
function clRow(r) {
  const e = r.e, o = r.o, rec = e.rec && e.rec.freq !== "none", on = ui.cl.sel.has(e.id);
  let when = "—";
  if (o) {
    const ds = toWall(o.sMs, dtz()), de = toWall(o.eMs, dtz());
    when = `${r.past ? "terminou " : rec ? "próx. " : ""}${fmtDay(ymd(ds))}/${ymd(ds).slice(2, 4)} · ${e.allDay ? "dia todo" : hm(ds) + "–" + hm(de)}`;
  }
  return `<tr class="cl ${on ? "sel" : ""}" data-act="clOpen" data-id="${e.id}"><td><input type="checkbox" data-act="clSel" data-id="${e.id}" ${on ? "checked" : ""}></td>
   <td><span class="dot" style="--c:${tagC(e)}"></span> <span style="${e.done ? "text-decoration:line-through;color:var(--ink3)" : ""}">${esc(e.title)}</span></td><td class="muted">${when}</td>
   <td>${rec ? `<span class="pill">↻ ${recLabel(e.rec)}</span>` : '<span class="muted">—</span>'}</td><td>${esc((TAGS[e.tag] || TAGS.pessoal).n)}</td>
   <td><span class="pill ${PRIO[e.prio]?.c || ""}">${PRIO[e.prio]?.n || "—"}</span></td><td class="muted">${remindLabel(e.remind)}</td></tr>`;
}
function clBar() {
  const n = ui.cl.sel.size;
  if (!n) return `<div class="muted sm" style="margin-bottom:10px">Marque compromissos na lista para alterar vários de uma vez: categoria, prioridade, lembrete, repetição, concluir ou excluir.</div>`;
  return `<div class="selbar"><b>${n} selecionado${n > 1 ? "s" : ""}</b>
   <select style="width:150px" data-ch="clTag"><option value="">Categoria…</option>${Object.entries(TAGS).map(([k, v]) => `<option value="${k}">${v.n}</option>`).join("")}</select>
   <select style="width:140px" data-ch="clPrio"><option value="">Prioridade…</option>${Object.entries(PRIO).map(([k, v]) => `<option value="${k}">${v.n}</option>`).join("")}</select>
   <select style="width:150px" data-ch="clRemind">${CL_REMIND.map(([k, n2]) => `<option value="${k}">${n2}</option>`).join("")}</select>
   <button class="btn sm" data-act="clRepeat">${ic("repeat", 14)}Repetir…</button><button class="btn sm" data-act="clDone">${ic("check", 14)}Concluir</button><button class="btn sm" data-act="clReopen">Reabrir</button>
   <button class="btn sm danger" data-act="clDel">${ic("trash", 14)}Excluir</button><span class="grow"></span><button class="btn sm ghost" data-act="clClear">Limpar seleção</button></div>`;
}
function calList() {
  for (const id of [...ui.cl.sel]) if (!S.events.some((e) => e.id === id)) ui.cl.sel.delete(id);
  const rows = clRows(), all = rows.length && rows.every((r) => ui.cl.sel.has(r.e.id));
  return `<div class="toolbar"><select style="width:180px" data-ch="clScope">${CL_SCOPES.map(([k, n]) => `<option value="${k}" ${ui.cl.scope === k ? "selected" : ""}>${n}</option>`).join("")}</select>
   <select style="width:160px" data-ch="clSort">${CL_SORTS.map(([k, n]) => `<option value="${k}" ${ui.cl.sort === k ? "selected" : ""}>${n}</option>`).join("")}</select>
   <span class="muted sm">${rows.length} compromisso${rows.length === 1 ? "" : "s"} · cada linha é um compromisso (as repetições contam como um só)</span></div>
  <div id="clBar">${clBar()}</div>
  ${rows.length ? `<div class="card" style="padding:6px 10px"><table class="tb"><thead><tr><th style="width:34px"><input type="checkbox" data-act="clAll" ${all ? "checked" : ""} title="Selecionar todos os listados"></th><th>Título</th><th>Quando</th><th>Repete</th><th>Categoria</th><th>Prioridade</th><th>Lembrete</th></tr></thead><tbody>${rows.map(clRow).join("")}</tbody></table></div>` : `<div class="card"><div class="empty">Nenhum compromisso neste filtro.</div></div>`}`;
}
INP.clScope = (el) => {
  ui.cl.scope = el.value;
  render();
};
INP.clSort = (el) => {
  ui.cl.sort = el.value;
  render();
};
ACT.clOpen = (el) => openEvent(el.dataset.id, null);
ACT.clSel = (el) => {
  if (el.checked) ui.cl.sel.add(el.dataset.id);
  else ui.cl.sel.delete(el.dataset.id);
  el.closest("tr").classList.toggle("sel", el.checked);
  $("#clBar").innerHTML = clBar();
  const rows = clRows(), h = $('input[data-act="clAll"]');
  if (h) h.checked = rows.length > 0 && rows.every((r) => ui.cl.sel.has(r.e.id));
};
ACT.clAll = (el) => {
  const rows = clRows();
  rows.forEach((r) => el.checked ? ui.cl.sel.add(r.e.id) : ui.cl.sel.delete(r.e.id));
  render();
};
ACT.clClear = () => {
  ui.cl.sel.clear();
  render();
};
const clApply = (fn, msg) => {
  const ids = [...ui.cl.sel], evs = S.events.filter((e) => ids.includes(e.id));
  evs.forEach(fn);
  save();
  render();
  toast(`${msg} em ${evs.length} compromisso${evs.length === 1 ? "" : "s"}`);
};
INP.clTag = (el) => {
  if (el.value) clApply((e) => {
    e.tag = el.value;
  }, "Categoria alterada para " + TAGS[el.value].n);
};
INP.clPrio = (el) => {
  if (el.value) clApply((e) => {
    e.prio = el.value;
  }, "Prioridade alterada para " + PRIO[el.value].n);
};
INP.clRemind = (el) => {
  if (el.value) clApply((e) => {
    e.remind = el.value === "none" ? null : +el.value;
  }, "Lembrete alterado");
};
ACT.clRepeat = () => {
  const n = ui.cl.sel.size, evs = S.events.filter((e) => ui.cl.sel.has(e.id)), same = evs.length && evs.every((e) => recLabel(e.rec) === recLabel(evs[0].rec));
  modal(`<form data-form="clRec"><h2>Repetição de ${n} compromisso${n > 1 ? "s" : ""}</h2>
   <p class="muted sm">A repetição escolhida vale para a série inteira de cada compromisso selecionado e substitui a que existia. Para parar de repetir, escolha “Não repete”.</p>
   ${recFields(same ? evs[0].rec : { freq: "none" })}
   <div class="foot"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Aplicar</button></div></form>`);
};
SUBMIT.clRec = (f, fd) => {
  const rec = recFromForm(fd);
  closeModal();
  clApply((e) => {
    e.rec = { ...rec, days: [...rec.days || []] };
  }, rec.freq === "none" ? "Repetição removida" : "Repetição definida (" + recLabel(rec).toLowerCase() + ")");
};
const clDoneSet = (done) => {
  clApply((e) => {
    const t = e.taskId && S.tasks.find((x) => x.id === e.taskId);
    if (t) setTaskCol(t.id, done ? "done" : "todo");
    else e.done = done;
  }, done ? "Marcado como concluído" : "Reaberto");
};
ACT.clDone = () => clDoneSet(true);
ACT.clReopen = () => clDoneSet(false);
ACT.clDel = () => {
  const n = ui.cl.sel.size;
  if (!confirmDlg(`Excluir ${n} compromisso${n > 1 ? "s" : ""}? Compromissos que se repetem são excluídos com toda a série.`)) return;
  const ids = new Set(ui.cl.sel);
  S.tasks.forEach((t) => {
    if (ids.has(t.eventId)) delete t.eventId;
  });
  S.events = S.events.filter((e) => !ids.has(e.id));
  ui.cl.sel.clear();
  save();
  render();
  toast(`${n} compromisso${n > 1 ? "s excluídos" : " excluído"}`);
};
