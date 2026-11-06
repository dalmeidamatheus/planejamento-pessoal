"use strict";
const NAV = [["home", "Início", "home"], ["calendar", "Calendário", "calendar"], ["tasks", "Tarefas", "tasks"], ["finance", "Finanças", "wallet"], ["habits", "Hábitos", "habits"], ["notes", "Notas", "notes"], ["wishlist", "Desejos", "gift"], ["trips", "Viagens", "plane"]];
function shell() {
  $("#app").innerHTML = `<div class="shell"><aside class="side">
   <div class="brand"><span class="logo"></span><span>Norte</span></div>
   <button class="search-btn" data-act="palette">${ic("search")}<span>Buscar ou criar…</span><kbd>Ctrl K</kbd></button>
   <nav class="nav">${NAV.map(([k, n, i], x) => `<a href="#/${k}" data-v="${k}" title="Alt+${x + 1}">${ic(i)}<span>${n}</span></a>`).join("")}</nav>
   <div class="clocks" id="clocks"></div>
   <div class="side-foot"><div class="who"><span class="av">${esc(user.email[0])}</span><span>${esc(user.email)}</span></div>
    <div class="row"><button class="btn ghost sm" data-act="settings">${ic("settings")}Ajustes</button><button class="btn ghost sm" data-act="logout" title="Sair">${ic("logout")}</button></div><div id="sync"></div></div>
  </aside><main><header class="top"><h1 id="title"></h1><div class="grow"></div>
   <button class="icon-btn" data-act="notifs" title="Notificações">${ic("bell", 18)}<i id="bellN" class="hidden"></i></button>
   <button class="btn primary" data-act="quick">${ic("plus")}Novo</button></header><section id="main"></section></main></div>
  <div id="overlay"></div><div id="toasts"></div><div id="tip"></div>`;
  setSync(sb ? "saved" : "local");
}
function render() {
  if (!user || !S) return;
  if (!$("#main")) shell();
  const v = VIEWS[view] ? view : "home";
  $("#title").textContent = TITLES[v];
  $$(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.v === v));
  const sc = $(".tg-scroll")?.scrollTop, ms = $("#main").scrollTop;
  $("#main").innerHTML = VIEWS[v]();
  AFTER[v]?.(sc);
  $("#main").scrollTop = ms;
  updateBell();
  renderClocks();
}
function route() {
  view = location.hash.replace(/^#\//, "") || "home";
  render();
}
window.addEventListener("hashchange", route);
const go = (v) => {
  if (location.hash === "#/" + v) render();
  else location.hash = "#/" + v;
};
function renderClocks() {
  const el = $("#clocks");
  if (!el) return;
  el.innerHTML = [S.settings.tz, ...S.settings.clocks || []].slice(0, 4).map((z, i) => {
    let t = "--";
    try {
      t = new Intl.DateTimeFormat("pt-BR", { timeZone: z, hour: "2-digit", minute: "2-digit" }).format(new Date());
    } catch {
    }
    return `<div><span>${esc(z.split("/").pop().replace(/_/g, " "))}${i ? "" : " ·  você"}</span><b>${t}</b></div>`;
  }).join("");
}
function toast(msg, warn) {
  const t = document.createElement("div");
  t.className = "toast" + (warn ? " warn" : "");
  t.textContent = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => {
    t.style.opacity = 0;
    t.style.transition = "opacity .3s";
    setTimeout(() => t.remove(), 300);
  }, 3600);
}
function modal(html, { wide = false, onMount } = {}) {
  $("#overlay").innerHTML = `<div class="scrim" data-act="scrim"><div class="modal ${wide ? "wide" : ""}">${html}</div></div>`;
  onMount?.($("#overlay .modal"));
  const f = $("#overlay input:not([type=hidden]):not([type=checkbox])");
}
const closeModal = () => {
  $("#overlay").innerHTML = "";
};
ACT.scrim = (el, e) => {
  if (e.target === el && !$("#overlay .pal")) closeModal();
};
ACT.close = () => closeModal();
function confirmDlg(msg) {
  return window.confirm(msg);
}
document.addEventListener("mouseover", (e) => {
  const t = e.target.closest("[data-tip]"), tip = $("#tip");
  if (!tip) return;
  if (t) {
    tip.innerHTML = t.dataset.tip;
    tip.style.opacity = 1;
  } else tip.style.opacity = 0;
});
document.addEventListener("mousemove", (e) => {
  const tip = $("#tip");
  if (tip && tip.style.opacity == 1) {
    tip.style.left = Math.min(e.clientX + 12, innerWidth - 270) + "px";
    tip.style.top = e.clientY + 14 + "px";
  }
});
let justDragged = false;
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (el) {
    const a = el.dataset.act;
    if (ACT[a]) ACT[a](el, e);
    return;
  }
  if (!e.target.closest("#notifPop")) $("#notifPop")?.remove();
});
document.addEventListener("submit", (e) => {
  const f = e.target.closest("form[data-form]");
  if (!f) return;
  e.preventDefault();
  SUBMIT[f.dataset.form]?.(f, new FormData(f));
});
document.addEventListener("input", (e) => {
  const el = e.target.closest("[data-in]");
  if (el) INP[el.dataset.in]?.(el, e);
});
document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-ch]");
  if (el) INP[el.dataset.ch]?.(el, e);
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (user) openPalette();
    return;
  }
  if (e.key === "Escape") {
    if ($("#overlay .scrim")) {
      closeModal();
    } else $("#notifPop")?.remove();
  }
  if (e.altKey && /^[1-8]$/.test(e.key) && user) {
    e.preventDefault();
    go(NAV[+e.key - 1][0]);
  }
  if (e.key === "Enter" && e.target.id === "subIn") {
    e.preventDefault();
    ACT.subAdd();
  }
});
function renderKeep(el) {
  const pos = el.selectionStart, sel = `[data-in="${el.dataset.in}"]` + (el.dataset.k ? `[data-k="${el.dataset.k}"]` : "");
  render();
  const n = $(sel);
  if (n) {
    n.focus();
    try {
      n.setSelectionRange(pos, pos);
    } catch {
    }
  }
}
