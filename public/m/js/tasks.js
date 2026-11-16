"use strict";
/* Tarefas: abas por coluna, cartões, fixar, reordenar por toque, seleção múltipla, anexos */
const MCOLS = [["todo", "A fazer"], ["doing", "Fazendo"], ["done", "Feito"]];
const tkFind = (id) => S.tasks.find((x) => x.id === id);
function tkMatch(t) {
  const q = norm(ui.m.tq);
  return !q || norm(t.title + " " + (t.notes || "") + " " + (t.subs || []).map((x) => x.t).join(" ")).includes(q);
}
const selMode = () => ui.m.tselMode || ui.m.tsel.size > 0;
function tkSubRow(t, s) {
  const k = TaskOps.keyS(t.id, s.id), on = ui.m.tsel.has(k);
  return `<div class="sub ${s.d ? "done" : ""} ${on ? "sel" : ""}"><button class="${selMode() ? "selbox sm " + (on ? "on" : "") : "chk-sm " + (s.d ? "on" : "")}" data-act="${selMode() ? "subSel" : "subTap"}" data-t="${t.id}" data-s="${s.id}" aria-label="${selMode() ? "Selecionar" : "Marcar"}">${selMode() || s.d ? ic("check", 12) : ""}</button><span class="stx" data-act="${selMode() ? "subSel" : "subTap"}" data-t="${t.id}" data-s="${s.id}">${esc(s.t)}</span></div>`;
}
function tkCard(t) {
  const ts = todayStr(), late = t.due && t.due < ts && t.col !== "done", sm = selMode(), k = TaskOps.keyT(t.id), on = ui.m.tsel.has(k);
  const { n, d } = TaskOps.subCount(t), subs = t.subs || [], open = subs.filter((x) => !x.d), done = subs.filter((x) => x.d);
  const shown = ui.m.tsubs && ui.m.tsubs[t.id] ? subs : open.slice(0, 4);
  return `<div class="tk ${t.col === "done" ? "done" : ""} ${t.pin ? "pinned" : ""} ${on ? "sel" : ""}" data-id="${t.id}">
   <div class="tk-top">${sm ? `<button class="selbox ${on ? "on" : ""}" data-act="tkSel" data-id="${t.id}" aria-label="Selecionar">${ic("check", 14)}</button>` : `<button class="tk-chk ${t.col === "done" ? "on" : ""}" data-act="tkToggle" data-id="${t.id}" aria-label="${t.col === "done" ? "Reabrir" : "Concluir"}">${t.col === "done" ? ic("check", 14) : ""}</button>`}
    <div class="tk-main" data-lp="${t.id}" data-act="tkTap" data-id="${t.id}"><div class="tk-t">${t.pin ? '<span class="pinic">${ic("pin", 12)}</span> ' : ""}${esc(t.title)}</div>
     <div class="m">${prioPill(t.prio)}${t.tag && TAGS[t.tag] ? `<span class="pill">${tagDot(t.tag)} ${TAGS[t.tag].n}</span>` : ""}${t.due ? `<span class="pill ${late ? "bad" : ""}">${mIc("calendar", 11)} ${t.due === ts ? "hoje" : fmtDay(t.due)}</span>` : ""}${t.rec && t.rec.freq !== "none" ? `<span class="pill"></span>` : ""}${(t.files || []).length ? `<span class="pill">${ic("clip", 12)} ${t.files.length}</span>` : ""}${t.eventId ? `<span class="pill blue">no calendário</span>` : ""}</div></div>
    <button class="icon-btn" data-act="tkMenu" data-id="${t.id}" aria-label="Mais ações">${mIc("more")}</button>${sm ? "" : `<span class="grip" data-grip="${t.id}" aria-label="Arraste para reordenar">⠿</span>`}</div>
   ${n ? `<div class="tk-subs"><div class="subprog"><div class="bar-t ${d === n ? "" : "w"}"><i style="width:${d / n * 100}%"></i></div><span class="sm muted">${d}/${n}</span></div>${shown.map((s) => tkSubRow(t, s)).join("")}${open.length > 4 && !(ui.m.tsubs && ui.m.tsubs[t.id]) ? `<button class="linkbtn" data-act="tkSubsAll" data-id="${t.id}">+${open.length - 4} pendentes · ver todas</button>` : ""}${ui.m.tsubs && ui.m.tsubs[t.id] ? `<button class="linkbtn" data-act="tkSubsAll" data-id="${t.id}">recolher</button>` : done.length && !(ui.m.tsubs && ui.m.tsubs[t.id]) ? `<button class="linkbtn" data-act="tkSubsAll" data-id="${t.id}">${done.length} concluída${done.length > 1 ? "s" : ""} · mostrar</button>` : ""}</div>` : ""}</div>`;
}
MV.tasks = () => {
  const col = ui.m.tcol, all = S.tasks.filter(tkMatch);
  const cnt = (k) => all.filter((t) => t.col === k).length;
  const L = TaskOps.colList(col, tkMatch);
  ui.m.tsel = new Set(TaskOps.validKeys(ui.m.tsel));
  const n = ui.m.tsel.size;
  return `<div class="tkhead"><input type="search" class="sbox" placeholder="Buscar tarefas…" value="${esc(ui.m.tq)}" data-in="tkQ"><button class="btn ${selMode() ? "primary" : ""}" data-act="tkSelMode">${selMode() ? "Cancelar" : "Selecionar"}</button></div>
  <div class="segbar">${MCOLS.map(([k, nm]) => `<button class="${col === k ? "on" : ""}" data-act="tkCol" data-c="${k}">${nm}<b>${cnt(k)}</b></button>`).join("")}</div>
  <form data-form="mTkQuick" class="quick"><input type="text" name="t" placeholder="+ Adicionar tarefa em “${MCOLS.find((c) => c[0] === col)[1]}”" autocomplete="off" enterkeyhint="done"></form>
  <div id="tklist">${L.length ? L.map(tkCard).join("") : `<div class="empty">${ui.m.tq ? "Nada encontrado." : "Nenhuma tarefa aqui."}</div>`}</div>
  ${n ? `<div class="bulk"><span>${n} selecionada${n > 1 ? "s" : ""}</span><button class="btn primary" data-act="bulkDone">Concluir (${n})</button><button class="btn danger-fill" data-act="bulkDel">Excluir (${n})</button></div>` : ""}
  ${selMode() ? "" : `<button class="fab" data-act="tkNew" aria-label="Nova tarefa">${mIc("plus", 26)}</button>`}`;
};
INP.tkQ = (el) => { ui.m.tq = el.value; const p = el.selectionStart; render(); const n = $(".tkhead input"); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch {} } };
ACT.tkCol = (el) => { ui.m.tcol = el.dataset.c; render(); };
SUBMIT.mTkQuick = (f, fd) => {
  const t = (fd.get("t") || "").trim();
  if (!t) return;
  TaskOps.insert({ id: uid(), title: t, col: ui.m.tcol, prio: "media", tag: "", due: "", notes: "" });
  save();
  render();
  setTimeout(() => { const i = $(".quick input"); i && i.focus(); }, 0);
};
ACT.tkToggle = (el) => { const t = tkFind(el.dataset.id); if (!t) return; TaskOps.setCol(t.id, t.col === "done" ? "todo" : "done"); save(); render(); };
ACT.tkSubsAll = (el) => { ui.m.tsubs = ui.m.tsubs || {}; ui.m.tsubs[el.dataset.id] = !ui.m.tsubs[el.dataset.id]; render(); };
ACT.subTap = (el) => {
  const t = tkFind(el.dataset.t), s = t && t.subs.find((x) => x.id === el.dataset.s);
  if (!s) return;
  s.d = !s.d;
  TaskOps.subAuto(t);
  save();
  render();
};
/* ----- seleção ----- */
const toggleSel = (k) => { const s = ui.m.tsel; s.has(k) ? s.delete(k) : s.add(k); if (!s.size && !ui.m.tselMode) ui.m.tselMode = false; render(); };
ACT.tkSel = (el) => toggleSel(TaskOps.keyT(el.dataset.id));
ACT.subSel = (el) => toggleSel(TaskOps.keyS(el.dataset.t, el.dataset.s));
ACT.tkSelMode = () => { if (selMode()) { ui.m.tsel.clear(); ui.m.tselMode = false; } else ui.m.tselMode = true; render(); };
ACT.tkTap = (el) => {
  if (M.justLong) { M.justLong = false; return; }
  if (selMode()) toggleSel(TaskOps.keyT(el.dataset.id)); else openTask(el.dataset.id);
};
ACT.tkOpen = (el) => openTask(el.dataset.id);
ACT.bulkDone = () => {
  const n = TaskOps.bulkDone(TaskOps.validKeys(ui.m.tsel));
  ui.m.tsel.clear(); ui.m.tselMode = false;
  save(); render();
  toast(n + " item(ns) concluído(s)");
};
ACT.bulkDel = () => {
  const keys = TaskOps.validKeys(ui.m.tsel), nt = keys.filter((k) => k[0] === "t").length, ns = keys.length - nt;
  mConfirm(`Excluir ${nt ? nt + " tarefa" + (nt > 1 ? "s" : "") : ""}${nt && ns ? " e " : ""}${ns ? ns + " subtarefa" + (ns > 1 ? "s" : "") : ""}? Não dá para desfazer.`, "Excluir " + keys.length, () => {
    const n = TaskOps.bulkDelete(keys);
    ui.m.tsel.clear(); ui.m.tselMode = false;
    save(); render();
    toast(n + " item(ns) excluído(s)");
  });
};
/* segurar o cartão = entrar no modo seleção */
let lp = null;
document.addEventListener("pointerdown", (e) => {
  const el = e.target.closest("[data-lp]");
  if (!el || e.target.closest("button,.grip") || selMode()) return;
  const x0 = e.clientX, y0 = e.clientY, id = el.dataset.lp;
  clearTimeout(lp && lp.t);
  lp = { x0, y0, t: setTimeout(() => { M.justLong = true; ui.m.tselMode = true; ui.m.tsel.add(TaskOps.keyT(id)); if (navigator.vibrate) navigator.vibrate(15); render(); setTimeout(() => { M.justLong = false; }, 600); lp = null; }, 480) };
});
const lpCancel = () => { if (lp) { clearTimeout(lp.t); lp = null; } };
document.addEventListener("pointermove", (e) => { if (lp && Math.hypot(e.clientX - lp.x0, e.clientY - lp.y0) > 9) lpCancel(); });
["pointerup", "pointercancel", "scroll"].forEach((t) => document.addEventListener(t, lpCancel, true));
/* ----- menu de ações do cartão ----- */
ACT.tkMenu = (el) => {
  const t = tkFind(el.dataset.id);
  if (!t) return;
  const b = (d, ic2, txt, cls = "") => `<button class="listbtn ${cls}" data-act="tkDo" data-do="${d}" data-id="${t.id}"><span>${ic2}</span>${txt}</button>`;
  openLayer(`<h2 class="ell">${esc(t.title)}</h2><div class="stack tight">${b("edit", ic("edit", 18), "Editar")}${b("pin", ic("pin", 18), t.pin ? "Desafixar do topo" : "Fixar no topo")}${b("up", ic("up", 18), "Subir uma posição")}${b("down", ic("down", 18), "Descer uma posição")}${MCOLS.filter((c) => c[0] !== t.col).map((c) => b("col:" + c[0], ic("right", 18), "Mover para “" + c[1] + "”")).join("")}${b("sel", ic("check", 18), "Selecionar")}${b("del", ic("trash", 18), "Excluir", "neg")}</div>`, { cls: "menu" });
};
ACT.tkDo = (el) => {
  const id = el.dataset.id, a = el.dataset.do, t = tkFind(id);
  closeModal();
  if (!t) return;
  if (a === "edit") { setTimeout(() => openTask(id), 0); return; }
  if (a === "del") { setTimeout(() => mConfirm("Excluir a tarefa “" + t.title + "”?", "Excluir", () => { TaskOps.removeTask(id); save(); render(); toast("Tarefa excluída"); }), 0); return; }
  if (a === "pin") { toast(TaskOps.togglePin(id) ? "Fixada no topo" : "Desafixada"); }
  else if (a === "up") TaskOps.nudge(id, -1);
  else if (a === "down") TaskOps.nudge(id, 1);
  else if (a === "sel") { ui.m.tselMode = true; ui.m.tsel.add(TaskOps.keyT(id)); }
  else if (a.startsWith("col:")) { TaskOps.move(id, "", false, a.slice(4)); ui.m.tcol = a.slice(4); }
  save();
  render();
};
/* ----- arrastar pelo ⠿ com o dedo ----- */
document.addEventListener("pointerdown", (e) => {
  const grip = e.target.closest("[data-grip]");
  if (!grip || e.button > 0) return;
  e.preventDefault();
  const card = grip.closest(".tk"), id = grip.dataset.grip, r = card.getBoundingClientRect(), offY = e.clientY - r.top;
  const ghost = card.cloneNode(true);
  ghost.classList.add("ghost");
  ghost.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;z-index:400;pointer-events:none`;
  document.body.appendChild(ghost);
  card.classList.add("dragging");
  try { grip.setPointerCapture(e.pointerId); } catch {}
  let y = e.clientY, target = null, after = false, atEnd = false;
  const main = $("#main");
  const probe = () => {
    $$(".ins-a,.ins-b").forEach((x) => x.classList.remove("ins-a", "ins-b"));
    const el = document.elementFromPoint(r.left + r.width / 2, y), c = el && el.closest(".tk:not(.dragging)");
    target = null; atEnd = false;
    if (c) { const cr = c.getBoundingClientRect(); after = y > cr.top + cr.height / 2; target = c.dataset.id; c.classList.add(after ? "ins-a" : "ins-b"); }
    else { const cs = $$("#tklist .tk:not(.dragging)"), last = cs[cs.length - 1]; if (last && y > last.getBoundingClientRect().bottom) { atEnd = true; last.classList.add("ins-a"); } }
  };
  const tick = setInterval(() => {
    const top = main.getBoundingClientRect().top + 40, bot = innerHeight - 140;
    if (y < top) main.scrollTop -= 10; else if (y > bot) main.scrollTop += 10;
    ghost.style.top = y - offY + "px";
    probe();
  }, 30);
  const mv = (ev) => { y = ev.clientY; ghost.style.top = y - offY + "px"; };
  const up = () => {
    clearInterval(tick);
    grip.removeEventListener("pointermove", mv);
    grip.removeEventListener("pointerup", up);
    grip.removeEventListener("pointercancel", cancel);
    ghost.remove();
    $$(".ins-a,.ins-b").forEach((x) => x.classList.remove("ins-a", "ins-b"));
    card.classList.remove("dragging");
    const t = tkFind(id);
    if (t && target) { TaskOps.move(id, target, after, ui.m.tcol); save(); render(); }
    else if (t && atEnd) { TaskOps.move(id, "", false, ui.m.tcol); save(); render(); }
  };
  const cancel = () => { target = null; atEnd = false; up(); };
  grip.addEventListener("pointermove", mv);
  grip.addEventListener("pointerup", up);
  grip.addEventListener("pointercancel", cancel);
});
/* ----- editor de tarefa (página cheia, com anexos) ----- */
let dTk = null;
ACT.tkNew = () => openTask(null);
function tkSubsHtml() {
  const li = (s, i) => `<li data-i="${i}"><input type="checkbox" data-ch="tkSubChk" data-i="${i}" ${s.d ? "checked" : ""}><input type="text" class="grow ${s.d ? "muted" : ""}" value="${esc(s.t)}" data-in="tkSubTxt" data-i="${i}" placeholder="Subtarefa">${s.d ? "" : `<button type="button" class="icon-btn" data-act="tkSubMove" data-i="${i}" data-n="-1" aria-label="Subir">${mIc("up", 16)}</button><button type="button" class="icon-btn" data-act="tkSubMove" data-i="${i}" data-n="1" aria-label="Descer">${mIc("down", 16)}</button>`}<button type="button" class="icon-btn" data-act="tkSubDel" data-i="${i}" aria-label="Remover">${mIc("x", 16)}</button></li>`;
  const idx = dTk.subs.map((s, i) => [s, i]), done = idx.filter(([s]) => s.d), open = idx.filter(([s]) => !s.d);
  return (done.length ? `<li class="donegrp"><details ${window._tkDoneOpen ? "open" : ""} ontoggle="window._tkDoneOpen=this.open"><summary>${done.length} concluída${done.length > 1 ? "s" : ""}</summary><ul class="subsm">${done.map(([s, i]) => li(s, i)).join("")}</ul></details></li>` : "") + open.map(([s, i]) => li(s, i)).join("");
}
function tkFilesHtml() {
  return dTk.files.length ? dTk.files.map((f) => `<div class="fitem"><span>${Files.icon(f.type)}</span><a href="#" class="grow ell" data-act="fileOpen" data-fid="${f.id}" data-name="${esc(f.name)}">${esc(f.name)} <small class="muted">${Files.size(f.size)}</small></a><button type="button" class="icon-btn" data-act="tkFileDel" data-fid="${f.id}" aria-label="Remover anexo">${mIc("x", 16)}</button></div>`).join("") : '<p class="sm muted">Nenhum anexo.</p>';
}
function openTask(id) {
  const old = id && tkFind(id);
  const t = old || { title: "", col: ui.m.tcol, prio: "media", tag: "", due: "", notes: "", pin: false };
  dTk = { id: old ? id : null, subs: clone(t.subs || []), files: clone(t.files || []), orig: (t.files || []).map((f) => f.id), added: [] };
  const rv = repValue(t.rec);
  formSheet(old ? "Editar tarefa" : "Nova tarefa", "mTask", `
   <label class="field"><span>Título</span><input type="text" name="title" value="${esc(t.title)}" required placeholder="O que precisa ser feito?"></label>
   <div class="grid2"><label class="field"><span>Coluna</span><select name="col">${opts(MCOLS, t.col)}</select></label><label class="field"><span>Prioridade</span><select name="prio">${opts(Object.entries(PRIO).map(([k, v]) => [k, v.n]), t.prio)}</select></label></div>
   <div class="grid2"><label class="field"><span>Categoria</span><select name="tag"><option value="">—</option>${opts(Object.entries(TAGS).map(([k, v]) => [k, v.n]), t.tag)}</select></label><label class="field"><span>Prazo</span><input type="date" name="due" value="${t.due || ""}"></label></div>
   <label class="swrow"><span>Fixar no topo da coluna</span><input type="checkbox" name="pin" ${t.pin ? "checked" : ""}></label>
   <div class="field"><span>Subtarefas <b id="tkprog" class="muted"></b></span><ul class="subsm" id="tk-subs" data-track="1">${tkSubsHtml()}</ul><div class="row"><input type="text" id="tkSubIn" placeholder="Adicionar subtarefa" enterkeyhint="done" data-notrack="1"><button type="button" class="btn" data-act="tkSubAdd">${mIc("plus", 16)}</button></div></div>
   <label class="field"><span>Repetir</span><select name="rep">${rv === "keep" ? `<option value="keep" selected>${esc(recLabel(t.rec))} (atual)</option>` : ""}${opts(REPS, rv)}</select></label>
   <label class="field"><span>Notas</span><textarea name="notes" rows="3">${esc(t.notes || "")}</textarea></label>
   <div class="field"><span>Anexos</span><div id="tk-files" data-track="1">${tkFilesHtml()}</div><label class="btn attach">${mIc("clip", 16)} Anexar arquivo<input type="file" multiple hidden data-ch="tkFileAdd" data-notrack="1"></label></div>`, { del: old ? "tkDelOpen" : "", full: true, layer: { onDiscard: () => dTk.added.forEach((fid) => Files.remove(fid)) } });
  tkProg();
}
function tkProg() { const p = $("#tkprog"); if (p) { const d = dTk.subs.filter((s) => s.d).length; p.textContent = dTk.subs.length ? `(${d}/${dTk.subs.length})` : ""; } }
const tkSubsRender = () => { $("#tk-subs").innerHTML = tkSubsHtml(); tkProg(); };
ACT.tkSubAdd = () => { const i = $("#tkSubIn"); if (!i || !i.value.trim()) return; dTk.subs.push({ id: uid(), t: i.value.trim(), d: false }); i.value = ""; tkSubsRender(); i.focus(); };
document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "tkSubIn") { e.preventDefault(); ACT.tkSubAdd(); } });
ACT.tkSubDel = (el) => { dTk.subs.splice(+el.dataset.i, 1); tkSubsRender(); };
ACT.tkSubMove = (el) => { const i = +el.dataset.i, j = i + +el.dataset.n; if (j < 0 || j >= dTk.subs.length) return; dTk.subs.splice(j, 0, dTk.subs.splice(i, 1)[0]); tkSubsRender(); };
INP.tkSubTxt = (el) => { dTk.subs[+el.dataset.i].t = el.value; };
INP.tkSubChk = (el) => { dTk.subs[+el.dataset.i].d = el.checked; tkSubsRender(); };
INP.tkFileAdd = async (el) => {
  const fs = [...el.files];
  el.value = "";
  for (const f of fs) {
    try { const m = await Files.put(f); dTk.files.push(m); dTk.added.push(m.id); } catch (e) { toast(e.message || "Não foi possível anexar", true); }
  }
  $("#tk-files").innerHTML = tkFilesHtml();
};
ACT.tkFileDel = (el) => { dTk.files = dTk.files.filter((f) => f.id !== el.dataset.fid); $("#tk-files").innerHTML = tkFilesHtml(); };
ACT.fileOpen = (el, e) => { e.preventDefault(); Files.open(el.dataset.fid, el.dataset.name); };
SUBMIT.mTask = (f, fd) => {
  const rep = fd.get("rep"), old = dTk.id && tkFind(dTk.id);
  const rec = rep === "keep" && old ? old.rec : rep === "none" || rep === "keep" ? { freq: "none" } : { freq: rep, interval: 1, days: [], until: "" };
  const o = { title: fd.get("title").trim(), col: fd.get("col"), prio: fd.get("prio"), tag: fd.get("tag"), due: fd.get("due"), notes: fd.get("notes"), pin: !!fd.get("pin"), rec, subs: dTk.subs.filter((x) => x.t.trim()), files: dTk.files };
  if (old) {
    const was = old.col, before = JSON.stringify(old.subs || []);
    Object.assign(old, o);
    TaskOps.setCol(old.id, o.col, was);
    if (JSON.stringify(old.subs) !== before) TaskOps.subAuto(old);
    const e = old.eventId && S.events.find((x) => x.id === old.eventId);
    if (e) e.title = o.title;
    dTk.orig.filter((fid) => !o.files.some((x) => x.id === fid)).forEach((fid) => Files.remove(fid));
  } else {
    const n = { id: uid(), ...o };
    TaskOps.insert(n);
    TaskOps.subAuto(n);
  }
  ui.m.tcol = o.col;
  save();
  closeModal();
  render();
  toast(old ? "Tarefa salva" : "Tarefa criada");
};
ACT.tkDelOpen = () => {
  const id = dTk.id, t = tkFind(id);
  mConfirm("Excluir a tarefa “" + (t ? t.title : "") + "”?", "Excluir", () => { TaskOps.removeTask(id); save(); LAYERS.slice().forEach(removeLayer); syncHistory(); render(); toast("Tarefa excluída"); });
};
