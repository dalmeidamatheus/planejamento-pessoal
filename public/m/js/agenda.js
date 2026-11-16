"use strict";
/* Agenda: faixa de dias + lista do dia + compromisso em sheet */
const REMINDS = [["", "Sem lembrete"], ["0", "Na hora"], ["5", "5 min antes"], ["15", "15 min antes"], ["30", "30 min antes"], ["60", "1 hora antes"], ["1440", "1 dia antes"]];
const REPS = [["none", "Não repete"], ["daily", "Todo dia"], ["weekly", "Toda semana"], ["monthly", "Todo mês"], ["yearly", "Todo ano"]];
let dEvM = null;
const selDay = () => ui.m.day || (ui.m.day = todayStr());
MV.agenda = () => {
  const d = selDay(), base = wd(d), from = addDays(base, -10), to = addDays(base, 21);
  const dots = {};
  occs(from, to).forEach((o) => { dots[ymd(o.ds)] = (dots[ymd(o.ds)] || 0) + 1; });
  const days = Array.from({ length: 31 }, (_, i) => addDays(from, i));
  const L = dayOccs(d);
  const ts = todayStr();
  return `<div class="agbar"><button class="icon-btn" data-act="agShift" data-n="-7" aria-label="Semana anterior">${mIc("left")}</button><label class="agtitle"><b>${MES[base.getUTCMonth()]} ${base.getUTCFullYear()}</b><input type="date" value="${d}" data-ch="agDate" aria-label="Escolher data"></label><button class="icon-btn" data-act="agShift" data-n="7" aria-label="Próxima semana">${mIc("right")}</button><button class="btn sm" data-act="agToday">Hoje</button></div>
  <div class="strip" id="strip">${days.map((x) => { const k = ymd(x); return `<button class="dchip ${k === d ? "on" : ""} ${k === ts ? "today" : ""}" data-act="agPick" data-d="${k}"><small>${DSEM[x.getUTCDay()]}</small><b>${x.getUTCDate()}</b><i class="${dots[k] ? "has" : ""}"></i></button>`; }).join("")}</div>
  <div class="agday"><h3>${fmtDayL(d)}${d === ts ? " · hoje" : ""}</h3>${L.length ? L.map(occRow).join("") : '<div class="empty">Dia livre. Toque em + para marcar algo.</div>'}</div>
  <button class="fab" data-act="evNew" aria-label="Novo compromisso">${mIc("plus", 26)}</button>`;
};
MA.agenda = () => { const on = $("#strip .on"); on && on.scrollIntoView({ inline: "center", block: "nearest" }); };
ACT.agPick = (el) => { ui.m.day = el.dataset.d; render(); };
ACT.agToday = () => { ui.m.day = todayStr(); render(); };
ACT.agShift = (el) => { ui.m.day = ymd(addDays(wd(selDay()), +el.dataset.n)); render(); };
INP.agDate = (el) => { if (el.value) { ui.m.day = el.value; render(); } };
ACT.evNew = () => openEvent(null);
ACT.evOpen = (el) => openEvent(el.dataset.id, el.dataset.key);
function repValue(r) {
  if (!r || !r.freq || r.freq === "none") return "none";
  return (r.interval || 1) === 1 && (!r.days || r.days.length <= 1) && !r.until && ["daily", "weekly", "monthly", "yearly"].includes(r.freq) ? r.freq : "keep";
}
function openEvent(id, key) {
  const old = id && S.events.find((x) => x.id === id);
  const d0 = selDay();
  const e = old ? clone(old) : { id: uid(), title: "", tag: "pessoal", prio: "media", allDay: false, start: d0 + "T09:00", end: d0 + "T10:00", tz: dtz(), rec: { freq: "none" }, ex: [], subtasks: [], links: [], notes: "", remind: 15, _new: true };
  dEvM = e;
  e._key = key || "";
  const ad = !!e.allDay, sd = e.start.slice(0, 10), st = e.start.slice(11, 16), ed = ad ? ymd(addDays(wd(e.end), -1)) : e.end.slice(0, 10), et = e.end.slice(11, 16);
  const rv = repValue(e.rec);
  formSheet(old ? "Editar compromisso" : "Novo compromisso", "mEvent", `
   <label class="field"><span>Título</span><input type="text" name="title" value="${esc(e.title)}" required placeholder="O que vai acontecer?" ${old ? "" : "autofocus"}></label>
   <label class="swrow"><span>Dia inteiro</span><input type="checkbox" name="allDay" ${ad ? "checked" : ""} data-ch="evAD"></label>
   <div class="grid2"><label class="field"><span>Início</span><input type="date" name="sd" value="${sd}" required></label><label class="field tm-f ${ad ? "hidden" : ""}"><span>Hora</span><input type="time" name="st" value="${st || "09:00"}"></label></div>
   <div class="grid2"><label class="field"><span>Fim</span><input type="date" name="ed" value="${ed}" required></label><label class="field tm-f ${ad ? "hidden" : ""}"><span>Hora</span><input type="time" name="et" value="${et || "10:00"}"></label></div>
   <div class="grid2"><label class="field"><span>Categoria</span><select name="tag">${opts(Object.entries(TAGS).map(([k, v]) => [k, v.n]), e.tag)}</select></label><label class="field"><span>Prioridade</span><select name="prio">${opts(Object.entries(PRIO).map(([k, v]) => [k, v.n]), e.prio)}</select></label></div>
   <div class="grid2"><label class="field"><span>Lembrete</span><select name="remind">${opts(REMINDS, e.remind == null ? "" : e.remind)}</select></label><label class="field"><span>Repetir</span><select name="rep">${rv === "keep" ? `<option value="keep" selected>${esc(recLabel(e.rec))} (atual)</option>` : ""}${opts(REPS, rv)}</select></label></div>
   <label class="field"><span>Notas</span><textarea name="notes" rows="3">${esc(e.notes || "")}</textarea></label>
   ${old && old.rec && old.rec.freq !== "none" ? '<p class="sm muted">Evento recorrente: ao salvar você escolhe se vale só para este evento ou para todos.</p>' : ""}`, { del: old ? "evDel" : "", layer: { full: false } });
}
INP.evAD = (el) => $$(".tm-f", el.closest("form")).forEach((x) => x.classList.toggle("hidden", el.checked));
let evScopeM = null;
ACT.evScope = (el) => {
  evScopeM = el.dataset.s;
  const [f, fd] = window._evForm || [];
  closeModal();
  f && SUBMIT.mEvent(f, fd);
};
SUBMIT.mEvent = (f, fd) => {
  const ad = !!fd.get("allDay"), sd = fd.get("sd"), ed = fd.get("ed");
  const s = sd + "T" + (ad ? "00:00" : fd.get("st") || "09:00"), en = ad ? ymd(addDays(wd(ed), 1)) + "T00:00" : ed + "T" + (fd.get("et") || "10:00");
  if (fromWall(wd(en), dtz()) <= fromWall(wd(s), dtz())) { toast("O término precisa ser depois do início", true); return; }
  const e = dEvM, rep = fd.get("rep");
  const orig = !e._new && S.events.find((x) => x.id === e.id);
  const recurring = orig && orig.rec && orig.rec.freq && orig.rec.freq !== "none";
  if (recurring && e._key && !evScopeM) {
    window._evForm = [f, fd];
    openLayer(`<h2>Evento recorrente</h2><p class="muted">Aplicar as alterações a qual(is) evento(s)?</p><div class="stack"><button class="btn primary big" data-act="evScope" data-s="one">Só este evento</button><button class="btn big" data-act="evScope" data-s="all">Todos os eventos</button><button class="btn big" data-act="layerClose">Cancelar</button></div>`, { cls: "ask" });
    return;
  }
  const scope = evScopeM;
  evScopeM = null;
  const rec = rep === "keep" ? e.rec : rep === "none" ? { freq: "none" } : { freq: rep, interval: 1, days: [], until: (e.rec && e.rec.until) || "" };
  Object.assign(e, { title: fd.get("title").trim(), tag: fd.get("tag"), prio: fd.get("prio"), allDay: ad, start: s, end: en, tz: ad ? dtz() : e.tz || dtz(), remind: fd.get("remind") === "" ? null : +fd.get("remind"), notes: fd.get("notes"), rec });
  const isNew = e._new, key = e._key;
  delete e._new;
  delete e._key;
  if (scope === "one" && orig) {
    orig.ex = [...(orig.ex || []), key];
    e.id = uid();
    e.rec = { freq: "none" };
    e.ex = [];
    delete e.taskId;
    S.events.push(e);
  } else {
    const i = S.events.findIndex((x) => x.id === e.id);
    if (i < 0) S.events.push(e); else S.events[i] = e;
  }
  if (e.taskId) { const t = S.tasks.find((x) => x.id === e.taskId); if (t) { t.title = e.title; t.due = sd; } }
  save();
  closeModal();
  ui.m.day = sd;
  render();
  const c = findConflicts(fromWall(wd(s), dtz()), fromWall(wd(en), dtz()), e.id);
  toast(c.length ? "Salvo. Acontece junto com: " + c.map((x) => x.e.title).join(", ") : isNew ? "Compromisso criado" : "Compromisso salvo");
};
ACT.evDel = () => {
  const e = dEvM;
  mConfirm((e.rec && e.rec.freq !== "none" ? "Isso exclui toda a série de “" : "Excluir “") + e.title + "”?", "Excluir", () => {
    S.events = S.events.filter((x) => x.id !== e.id);
    if (e.taskId) { const t = S.tasks.find((x) => x.id === e.taskId); if (t) delete t.eventId; }
    save();
    LAYERS.slice().forEach(removeLayer);
    syncHistory();
    render();
  });
};
