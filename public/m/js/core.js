"use strict";
/* Norte mobile — núcleo: camadas (sheets/páginas), roteador, toasts, delegação de eventos.
   Reusa S/save()/ACT/SUBMIT/INP/ui dos módulos compartilhados; telas ficam em MV[nome]() e ganham MA[nome]() após o render. */
const MV = {}, MA = {};
const MTABS = [["home", "Início", "home"], ["agenda", "Agenda", "calendar"], ["tasks", "Tarefas", "tasks"], ["notes", "Notas", "notes"], ["more", "Mais", "menu"]];
const MORE_VIEWS = ["more", "finance", "habits", "diet", "wish", "trips"];
const MTITLES = { home: "Início", agenda: "Agenda", tasks: "Tarefas", notes: "Notas", more: "Mais", finance: "Finanças", habits: "Hábitos", diet: "Dieta", wish: "Desejos", trips: "Viagens" };
Object.assign(I, { menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', pin: '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3zM12 14v7"/>', more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', clip: '<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>', up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', send: '<path d="m4 12 16-8-6 16-3-7z"/>' });
ui.cl = ui.cl || { sel: new Set() };
ui.m = { day: null, tcol: "todo", tsel: new Set(), tselMode: false, tq: "", nq: "", ym: null, fin: "mov", ftype: "all", wst: "want", tripSt: "next", habitsOpen: false, engine: (() => { try { return LS.getItem("norte:engine") || "browser"; } catch { return "browser"; } })() };
const HCOL = ["#16a34a", "#2563eb", "#f59e0b", "#8b5cf6", "#e5484d", "#06b6d4"];

/* ---------- utilitários ---------- */
const mIc = (n, s = 20) => ic(n, s);
const fmtMoney = (n) => brl(n);
const tagDot = (t) => (TAGS[t] ? `<span class="dot" style="--c:${TAGS[t].c}"></span>` : "");
const prioPill = (p) => (PRIO[p] ? `<span class="pill ${PRIO[p].c}">${PRIO[p].n}</span>` : "");
const opts = (arr, sel) => arr.map(([k, n]) => `<option value="${esc(k)}" ${String(sel) === String(k) ? "selected" : ""}>${esc(n)}</option>`).join("");
const prevText = (s) => esc(String(s || "").replace(/\s+/g, " ").slice(0, 90));

function toast(msg, warn) {
  const t = document.createElement("div");
  t.className = "toast" + (warn ? " warn" : "");
  t.textContent = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 3200);
}

/* ---------- camadas: sheets e páginas cheias, com botão Voltar do celular ---------- */
const LAYERS = [];
let histDepth = 0, popSuppress = 0;
function formState(el) {
  return [...el.querySelectorAll("input,textarea,select")].filter((x) => !x.closest("[data-notrack]")).map((x) => (x.type === "checkbox" || x.type === "radio" ? +x.checked : x.type === "file" ? "" : x.value)).join("\u0001") + "\u0002" + [...el.querySelectorAll("[data-track]")].map((x) => x.innerHTML).join("");
}
function openLayer(html, o = {}) {
  const el = document.createElement("div");
  el.className = "layer " + (o.full ? "full " : "") + (o.cls || "");
  el.innerHTML = o.full ? `<div class="page">${html}</div>` : `<div class="scrim" data-act="layerScrim"></div><div class="sheet ${o.tall ? "tall" : ""}"><div class="grab"></div>${html}</div>`;
  $("#layers").appendChild(el);
  const lay = { el, o };
  LAYERS.push(lay);
  histDepth++;
  history.pushState({ m: histDepth }, "");
  o.onMount && o.onMount(el, lay);
  lay.snap = formState(el);
  document.body.classList.add("noscroll");
  return lay;
}
const topLayer = () => LAYERS[LAYERS.length - 1];
function removeLayer(lay) {
  const i = LAYERS.indexOf(lay);
  if (i < 0) return;
  LAYERS.splice(i, 1);
  lay.el.remove();
  lay.o.onClose && lay.o.onClose(lay);
  if (!LAYERS.length) document.body.classList.remove("noscroll");
}
function syncHistory() {
  setTimeout(() => {
    if (histDepth > LAYERS.length) {
      const n = histDepth - LAYERS.length;
      histDepth = LAYERS.length;
      popSuppress++;
      history.go(-n);
    }
  }, 0);
}
function closeLayer(lay) {
  removeLayer(lay);
  syncHistory();
}
const closeModal = () => { const t = topLayer(); t && closeLayer(t); };
const layerDirty = (lay) => (lay.o.dirty ? lay.o.dirty(lay) : lay.o.track ? formState(lay.el) !== lay.snap : false);
/** Fecha respeitando alterações não salvas (sheet interna Salvar/Descartar/Continuar). */
function tryClose(lay) {
  if (layerDirty(lay)) { askUnsaved(lay); return false; }
  closeLayer(lay);
  return true;
}
function askUnsaved(lay) {
  openLayer(`<h2>Alterações não salvas</h2><p class="muted">Você mexeu em alguns campos. O que fazer com as alterações?</p>
   <div class="stack"><button class="btn primary big" data-act="unsSave">Salvar e fechar</button><button class="btn danger big" data-act="unsDiscard">Descartar alterações</button><button class="btn big" data-act="unsKeep">Continuar editando</button></div>`, { cls: "ask", onMount: (el, a) => { a.target = lay; } });
}
ACT.unsKeep = () => closeModal();
ACT.unsSave = () => {
  const ask = topLayer(), lay = ask && ask.target;
  closeLayer(ask);
  const f = lay && lay.el.querySelector("form[data-form]");
  if (f) f.requestSubmit(); else if (lay && lay.o.onSave) lay.o.onSave(lay);
};
ACT.unsDiscard = () => {
  const ask = topLayer(), lay = ask && ask.target;
  removeLayer(ask);
  if (lay) { lay.o.onDiscard && lay.o.onDiscard(lay); removeLayer(lay); }
  syncHistory();
};
ACT.layerScrim = () => { const t = topLayer(); t && tryClose(t); };
ACT.layerClose = () => { const t = topLayer(); t && tryClose(t); };
window.addEventListener("popstate", () => {
  if (popSuppress > 0) { popSuppress--; return; }
  histDepth = Math.max(0, histDepth - 1);
  const t = topLayer();
  if (t) tryClose(t) && 0;
  while (histDepth < LAYERS.length) { histDepth++; history.pushState({ m: histDepth }, ""); }
});

/** Pergunta de confirmação em sheet interna (nunca window.confirm). */
function mConfirm(msg, label, onOk, o = {}) {
  window._cfOk = onOk;
  openLayer(`<h2>${esc(o.title || "Confirmar")}</h2><p class="muted">${esc(msg)}</p><div class="stack"><button class="btn ${o.danger === false ? "primary" : "danger-fill"} big" data-act="cfOk">${esc(label || "Confirmar")}</button><button class="btn big" data-act="layerClose">Cancelar</button></div>`, { cls: "ask" });
}
ACT.cfOk = () => { const f = window._cfOk; window._cfOk = null; closeModal(); f && f(); };

/** Sheet com formulário padrão: título, corpo, Salvar e (opcional) Excluir. */
function formSheet(title, name, body, o = {}) {
  return openLayer(`<form data-form="${name}" class="fsheet"><div class="shead"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-act="layerClose" aria-label="Fechar">${mIc("x")}</button></div><div class="sbody">${body}</div><div class="sfoot">${o.del ? `<button type="button" class="btn danger big-ic" data-act="${o.del}" aria-label="Excluir">${mIc("trash")}</button>` : ""}<button class="btn primary big grow">${esc(o.label || "Salvar")}</button></div></form>`, { track: true, full: !!o.full, tall: !o.full, ...o.layer });
}

/* ---------- roteamento e shell ---------- */
function shell() {
  $("#app").innerHTML = `<div class="mshell"><header class="mtop"><button class="icon-btn hidden" id="mback" data-act="goMore" aria-label="Voltar">${mIc("left")}</button><h1 id="mtitle"></h1><span class="grow"></span><button class="icon-btn" data-act="voiceOpen" aria-label="Comando por voz">${mIc("mic")}</button><span id="recpill" class="recpill hidden" data-act="recGo"></span><span id="sync"></span></header>
   <main id="main"></main>
   <nav class="tabs">${MTABS.map(([k, n, i]) => `<a href="#/${k}" data-v="${k}">${mIc(i, 22)}<span>${n}</span></a>`).join("")}</nav></div>`;
  setSync(sb ? "saved" : "local");
}
function render() {
  if (!user || !S) return;
  if (!$("#main")) shell();
  const v = MV[view] ? view : "home";
  $("#mtitle").textContent = MTITLES[v];
  const sub = MORE_VIEWS.includes(v) && v !== "more";
  $("#mback").classList.toggle("hidden", !sub);
  $$(".tabs a").forEach((a) => a.classList.toggle("on", a.dataset.v === (MORE_VIEWS.includes(v) ? "more" : v)));
  const main = $("#main"), sc = main.scrollTop;
  main.innerHTML = MV[v]();
  MA[v] && MA[v]();
  main.scrollTop = M.keepScroll ? sc : 0;
  M.keepScroll = true;
  recPillUpdate();
}
const M = { keepScroll: true };
function route() {
  const nv = location.hash.replace(/^#\//, "").split("/")[0] || "home";
  if (nv !== view) M.keepScroll = false;
  view = nv;
  render();
}
window.addEventListener("hashchange", route);
function go(v) {
  if (view === v) { render(); return; }
  history.replaceState(history.state, "", "#/" + v);
  route();
}
ACT.goMore = () => go("more");
function startApp() {
  try { NoteDoc.migrateAll(); } catch (e) { console.error(e); }
  if (!location.hash || location.hash === "#/") history.replaceState(history.state, "", "#/home");
  $("#app").innerHTML = "";
  route();
}

/* ---------- delegação de eventos ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (el && ACT[el.dataset.act]) { ACT[el.dataset.act](el, e); return; }
});
document.addEventListener("submit", (e) => {
  const f = e.target.closest("form[data-form]");
  if (!f) return;
  e.preventDefault();
  SUBMIT[f.dataset.form] && SUBMIT[f.dataset.form](f, new FormData(f));
});
document.addEventListener("input", (e) => { const el = e.target.closest("[data-in]"); if (el && INP[el.dataset.in]) INP[el.dataset.in](el, e); });
document.addEventListener("change", (e) => { const el = e.target.closest("[data-ch]"); if (el && INP[el.dataset.ch]) INP[el.dataset.ch](el, e); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { const t = topLayer(); t && !t.o.full && tryClose(t); } });
/* teclado virtual: a página cheia acompanha a área visível */
if (window.visualViewport) {
  const fit = () => { const vv = visualViewport; document.documentElement.style.setProperty("--vh", vv.height + "px"); document.documentElement.style.setProperty("--vt", vv.offsetTop + "px"); };
  visualViewport.addEventListener("resize", fit);
  visualViewport.addEventListener("scroll", fit);
  fit();
}

/* sincroniza com a nuvem quando o app volta ao primeiro plano */
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && S && user) { try { LS.setItem("fox:data:" + user.id, JSON.stringify(S)); } catch {} } });
