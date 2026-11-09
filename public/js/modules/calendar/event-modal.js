"use strict";
let dEv = null;
function tzOptions(sel) {
  const base = ["America/Sao_Paulo", "America/Manaus", "America/New_York", "America/Los_Angeles", "Europe/Lisbon", "Europe/London", "Europe/Paris", "Asia/Tokyo", "UTC"];
  const set = [...new Set([dtz(), ...S.settings.clocks || [], sel, ...base].filter(Boolean))];
  return set.map((z) => `<option ${z === sel ? "selected" : ""}>${esc(z)}</option>`).join("");
}
function openEvent(id, key, pre) {
  if (id && String(id).startsWith("bd:")) {
    openBirthday(id.slice(3));
    return;
  }
  const ex = id && S.events.find((x) => x.id === id);
  dEv = ex ? clone(ex) : Object.assign({ id: uid(), title: "", start: "", end: "", tz: dtz(), tag: "trabalho", prio: "media", allDay: false, rec: { freq: "none", interval: 1, days: [], until: "" }, ex: [], subtasks: [], links: [], notes: "", remind: 15 }, pre || {});
  dEv._key = key;
  dEv._new = !ex;
  const e = dEv, r = e.rec || { freq: "none" }, sd = e.start.slice(0, 10), st = e.start.slice(11, 16), ed = e.end.slice(0, 10), et = e.end.slice(11, 16);
  const allDay = e.allDay, edDisp = allDay ? ymd(addDays(wd(e.end), -1)) : ed;
  modal(`<form data-form="event"><h2>${ex ? "Editar compromisso" : "Novo compromisso"}</h2>
  <label class="field"><span>Título</span><input type="text" name="title" value="${esc(e.title)}" required placeholder="Ex.: Reunião de alinhamento"></label>
  <div class="grid3"><label class="field"><span>Categoria</span><select name="tag">${Object.entries(TAGS).map(([k, v]) => `<option value="${k}" ${e.tag === k ? "selected" : ""}>${v.n}</option>`).join("")}</select></label>
   <label class="field"><span>Prioridade</span><select name="prio">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${e.prio === k ? "selected" : ""}>${v.n}</option>`).join("")}</select></label>
   <label class="field"><span>Lembrete</span><select name="remind">${[["", "Nenhum"], [0, "No horário"], [5, "5 min antes"], [10, "10 min antes"], [15, "15 min antes"], [30, "30 min antes"], [60, "1 hora antes"], [1440, "1 dia antes"]].map(([v, n]) => `<option value="${v}" ${String(e.remind ?? "") === String(v) ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
  <label class="row sm" style="margin-bottom:8px"><input type="checkbox" name="allDay" data-ch="evAllDay" ${allDay ? "checked" : ""}> Dia inteiro</label>
  <div class="grid2"><label class="field"><span>Início</span><div class="row"><input type="date" name="sd" value="${sd}" data-in="evChk" required><input type="time" name="st" value="${st || "09:00"}" data-in="evChk" class="tm ${allDay ? "hidden" : ""}"></div></label>
   <label class="field"><span>Término</span><div class="row"><input type="date" name="ed" value="${edDisp}" data-in="evChk" required><input type="time" name="et" value="${et || "10:00"}" data-in="evChk" class="tm ${allDay ? "hidden" : ""}"></div></label></div>
  <label class="field tm ${allDay ? "hidden" : ""}"><span>Fuso horário do compromisso</span><select name="tz" data-ch="evChk">${tzOptions(e.tz || dtz())}</select></label>
  <div id="evConf"></div>
  ${recFields(r)}
  ${(e.ex || []).length ? `<div class="sm muted" style="margin-bottom:8px">Exceções: ${e.ex.map((x) => `<span class="pill">${fmtDay(x)} <a href="#" data-act="exDel" data-k="${x}" style="color:inherit">×</a></span>`).join(" ")}</div>` : ""}
  <div class="field"><span>Subtarefas</span><ul class="subs" id="subs"></ul><div class="row"><input type="text" id="subIn" placeholder="Adicionar subtarefa e Enter"><button type="button" class="btn" data-act="subAdd">${ic("plus")}</button></div></div>
  <label class="field"><span>Links e anexos (um por linha; “nome | url”)</span><textarea name="links" rows="2" placeholder="Pauta | https://docs.google.com/...">${esc((e.links || []).map((l) => l.label ? l.label + " | " + l.url : l.url).join("\n"))}</textarea></label>
  <label class="field"><span>Notas</span><textarea name="notes" rows="2">${esc(e.notes || "")}</textarea></label>
  <div class="foot">${ex ? `<button type="button" class="btn danger" data-act="evDelete">${ic("trash")}Excluir${r.freq !== "none" ? " série" : ""}</button>` : ""}${ex && r.freq !== "none" && key ? `<button type="button" class="btn" data-act="evDelOne">Excluir só esta</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`, { wide: true, onMount: () => {
    renderSubs();
    INP.evChk();
  } });
}
function renderSubs() {
  const u = $("#subs");
  if (!u) return;
  u.innerHTML = (dEv.subtasks || []).map((s, i) => `<li><input type="checkbox" data-ch="subChk" data-i="${i}" ${s.d ? "checked" : ""}><span class="grow ${s.d ? "muted" : ""}">${esc(s.t)}</span><button type="button" class="icon-btn" data-act="subDel" data-i="${i}">${ic("x", 13)}</button></li>`).join("");
}
ACT.subAdd = () => {
  const i = $("#subIn");
  if (!i || !i.value.trim()) return;
  dEv.subtasks.push({ t: i.value.trim(), d: false });
  i.value = "";
  renderSubs();
  i.focus();
};
ACT.subDel = (el) => {
  dEv.subtasks.splice(+el.dataset.i, 1);
  renderSubs();
};
INP.subChk = (el) => {
  dEv.subtasks[+el.dataset.i].d = el.checked;
  renderSubs();
};
ACT.exDel = (el, e) => {
  e.preventDefault();
  dEv.ex = dEv.ex.filter((x) => x !== el.dataset.k);
  el.closest(".pill").remove();
};
INP.evAllDay = (el) => {
  $$(".tm", el.closest("form")).forEach((x) => x.classList.toggle("hidden", el.checked));
  INP.evChk();
};
function evTimes(f) {
  const fd = new FormData(f), ad = fd.get("allDay");
  let tz = ad ? dtz() : fd.get("tz") || dtz();
  const s = fd.get("sd") + "T" + (ad ? "00:00" : fd.get("st")), en = ad ? ymd(addDays(wd(fd.get("ed")), 1)) + "T00:00" : fd.get("ed") + "T" + fd.get("et");
  return { s, en, tz, ad };
}
INP.evChk = () => {
  const f = $("form[data-form=event]");
  if (!f) return;
  const box = $("#evConf");
  try {
    const { s, en, tz, ad } = evTimes(f);
    if (!s.slice(0, 10) || !en.slice(0, 10) || ad) {
      box.innerHTML = "";
      return;
    }
    const sMs = fromWall(wd(s), tz), eMs = fromWall(wd(en), tz);
    if (eMs <= sMs) {
      box.innerHTML = '<div class="warnbox">O término precisa ser depois do início.</div>';
      return;
    }
    const c = findConflicts(sMs, eMs, dEv.id);
    box.innerHTML = c.length ? `<div class="infobox">⇄ Acontece ao mesmo tempo que (pode salvar normalmente): ${c.map((o) => `<b>${esc(o.e.title)}</b> (${hm(o.ds)}–${hm(o.de)})`).join(", ")}</div>` : "";
  } catch {
    box.innerHTML = "";
  }
};
SUBMIT.event = (f, fd) => {
  const { s, en, tz, ad } = evTimes(f);
  if (fromWall(wd(en), tz) <= fromWall(wd(s), tz)) {
    toast("O término precisa ser depois do início", true);
    return;
  }
  const e = dEv;
  Object.assign(e, {
    title: fd.get("title").trim(),
    tag: fd.get("tag"),
    prio: fd.get("prio"),
    allDay: !!ad,
    start: s,
    end: en,
    tz,
    remind: fd.get("remind") === "" ? null : +fd.get("remind"),
    notes: fd.get("notes"),
    links: fd.get("links").split("\n").map((x) => x.trim()).filter(Boolean).map((x) => {
      const p = x.split("|").map((y) => y.trim());
      return p.length > 1 ? { label: p[0], url: p.slice(1).join("|").trim() } : { label: "", url: p[0] };
    }),
    rec: recFromForm(fd)
  });
  const isNew = e._new;
  delete e._key;
  delete e._new;
  const i = S.events.findIndex((x) => x.id === e.id);
  if (i < 0) S.events.push(e);
  else S.events[i] = e;
  if (e.taskId) {
    const t = S.tasks.find((x) => x.id === e.taskId);
    if (t) {
      t.due = e.start.slice(0, 10);
    }
  }
  save();
  closeModal();
  render();
  const o = occurrences(e, fromWall(wd(s), tz) - 1, fromWall(wd(s), tz) + 864e5 * 370)[0];
  if (o && !ad) {
    const c = findConflicts(o.sMs, o.eMs, e.id);
    if (c.length) toast((isNew ? "Compromisso criado" : "Compromisso salvo") + ". Acontece ao mesmo tempo que: " + c.map((x) => x.e.title).join(", "));
    else toast(isNew ? "Compromisso criado" : "Compromisso salvo");
  } else toast("Salvo");
};
ACT.evDelete = () => {
  if (!confirmDlg("Excluir este compromisso" + (dEv.rec?.freq !== "none" ? " e toda a série" : "") + "?")) return;
  S.events = S.events.filter((x) => x.id !== dEv.id);
  if (dEv.taskId) {
    const t = S.tasks.find((x) => x.id === dEv.taskId);
    if (t) delete t.eventId;
  }
  save();
  closeModal();
  render();
  toast("Excluído");
};
ACT.evDelOne = () => {
  const e = S.events.find((x) => x.id === dEv.id);
  if (e) {
    e.ex = [...dEv.ex || [], dEv._key];
  }
  save();
  closeModal();
  render();
  toast("Ocorrência removida");
};
