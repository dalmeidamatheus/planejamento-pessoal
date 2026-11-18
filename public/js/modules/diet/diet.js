"use strict";
/* Dieta (desktop): importar plano, cardápio do dia, registrar o que comeu e conferir com o plano. */
ui.diet = Object.assign({ date: null, meal: null, last: null }, ui.diet);
const dDate = () => ui.diet.date || todayStr();
const mealLog = (date, id) => (Diet.D().log[date] || []).filter((x) => x.meal === id);
const bestVerdict = (L) => (L.some((x) => x.verdict === "fora") ? "fora" : L.some((x) => x.verdict === "parcial") ? "parcial" : L.length ? "dentro" : "");

function dietImportCard() {
  return `<div class="card diet-import"><h2>Importar sua dieta</h2>
   <p class="muted">Cole o texto do plano alimentar ou envie um arquivo (PDF, texto ou foto da dieta). O sistema identifica as refeições, as opções e o cardápio por dia.</p>
   <textarea id="dietText" rows="12" placeholder="Cole aqui o texto da dieta…"></textarea>
   <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><label class="btn fpick">${ic("clip", 14)} Enviar PDF, texto ou foto<input type="file" accept=".txt,.md,.csv,.tsv,.pdf,image/*" hidden data-ch="dietFile"></label><span class="grow"></span><span id="dietMsg" class="muted sm"></span><button class="btn primary" data-act="dietAnalyze">Analisar dieta</button></div></div>`;
}
INP.dietFile = async (el) => {
  const f = el.files[0], msg = $("#dietMsg");
  el.value = "";
  if (!f) return;
  try {
    const t = await Diet.readFile(f, (s) => { msg.textContent = s; });
    $("#dietText").value = t;
    msg.textContent = t.trim() ? "Texto lido. Confira e clique em Analisar dieta." : "Não encontrei texto no arquivo.";
  } catch (e) { msg.textContent = ""; toast(e.message || "Não consegui ler o arquivo", true); }
};
let dietPending = null;
ACT.dietAnalyze = async () => {
  const text = ($("#dietText") || {}).value || "", btn = $('[data-act="dietAnalyze"]');
  if (text.trim().length < 20) { toast("Cole o texto da dieta ou envie um arquivo", true); return; }
  btn.disabled = true; btn.textContent = "Analisando…";
  try { dietPending = await Diet.importText(text); } catch (e) { toast(e.message || "Não consegui analisar", true); return; } finally { btn.disabled = false; btn.textContent = "Analisar dieta"; }
  const p = dietPending.plan, ok = Diet.planOk(p);
  modal(`<form data-form="dietConfirm"><h2>Confira o que foi entendido</h2>
   <p class="muted sm">${dietPending.source === "ai" ? "Lido por IA" + (dietPending.provider ? " (" + esc(dietPending.provider) + ")" : "") : "Leitura local simples (sem IA)"}</p>
   ${ok ? "" : `<div class="infobox">Não consegui identificar refeições neste texto. Use títulos como “Almoço:” com opções embaixo, ou uma tabela “Dia | Café da manhã | Almoço…”. Para textos livres, ative uma IA em Ajustes → Recursos de IA.</div>`}
   <div class="dsum"><div><b>${p.meals.length}</b><span>refeições</span></div><div><b>${p.days.length}</b><span>dias no ciclo</span></div><div><b>${Object.values(p.options).reduce((a, v) => a + v.length, 0)}</b><span>opções</span></div><div><b>${p.add.length + p.avoid.length}</b><span>regras</span></div></div>
   <ul class="dml">${p.meals.map((m) => `<li><b>${esc(m.name)}</b> <span class="muted">${m.time}</span><div class="sm muted">${esc(((p.days[0] && p.days[0].m[m.id]) || (p.options[m.id] || [])[0] || "—").slice(0, 110))}</div></li>`).join("")}</ul>
   <label class="field"><span>O dia 1 do cardápio é</span><input type="date" name="start" value="${todayStr()}"></label>
   <div class="foot"><button type="button" class="btn" data-act="close">Voltar</button>${ok ? `<button class="btn primary">Usar esta dieta</button>` : ""}</div></form>`);
};
SUBMIT.dietConfirm = (f, fd) => {
  Diet.setPlan(dietPending.plan, dietPending.source, fd.get("start") || todayStr());
  ui.diet.date = null; ui.diet.last = null;
  closeModal(); render(); toast("Dieta importada");
};

VIEWS.diet = () => {
  const P = Diet.D().plan;
  if (!P) return dietImportCard();
  const date = dDate(), m = Diet.menu(date), L = Diet.D().log[date] || [], wk = Diet.week(), isToday = date === todayStr();
  if (!ui.diet.meal || !P.meals.some((x) => x.id === ui.diet.meal)) ui.diet.meal = Diet.nextMeal(date);
  const lbl = isToday ? "Hoje" : fmtDayL(date);
  const rules = (t, a) => (a.length ? `<details class="drule"><summary>${t} <small>${a.length}</small></summary><ul>${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : "");
  return `<div class="toolbar"><div class="row" style="gap:6px"><button class="icon-btn" data-act="dietShift" data-n="-1" aria-label="Dia anterior">${ic("left")}</button><b style="min-width:150px;text-align:center">${esc(lbl)} <span class="muted sm">${fmtDay(date)}</span></b><button class="icon-btn" data-act="dietShift" data-n="1" aria-label="Próximo dia">${ic("right")}</button>${isToday ? "" : `<button class="btn sm" data-act="dietToday">Hoje</button>`}</div><div class="grow"></div><button class="btn sm" data-act="dietRestart" title="Marca o dia exibido como o dia 1 do cardápio">Começar o ciclo neste dia</button><button class="btn sm ghost" data-act="dietReplace">Trocar dieta</button></div>
  <div class="cols c2">
   <div class="card"><div class="hd"><h2>O que comer ${isToday ? "hoje" : "neste dia"}</h2><span class="muted sm">${m.dayNo ? "Dia " + m.dayNo + " de " + m.total + " do ciclo" : esc(P.name)}</span></div>
    <div class="dmeals">${m.items.map(({ meal, text, src }) => { const lg = mealLog(date, meal.id), v = bestVerdict(lg); return `<div class="dmeal ${ui.diet.meal === meal.id ? "sel" : ""}"><div class="dm-h"><span class="dm-t">${meal.time}</span><b>${esc(meal.name)}</b>${v ? Diet.chip(v) : ""}<span class="grow"></span>${Diet.alternatives(meal.id).length > 1 ? `<button class="icon-btn" data-act="dietSwap" data-m="${meal.id}" title="Sugerir outra opção">${ic("repeat", 14)}</button>` : ""}<button class="btn sm" data-act="dietPick" data-m="${meal.id}">Registrar</button></div><div class="dm-x">${esc(text) || '<span class="muted">Sem sugestão no plano</span>'}${src === "troca" ? ` <span class="muted sm">(trocado)</span>` : ""}</div></div>`; }).join("")}</div></div>
   <div class="card"><div class="hd"><h2>Registrar o que comi</h2></div>
    <label class="field"><span>Refeição</span><select id="dMeal" data-ch="dietMealSel">${P.meals.map((x) => `<option value="${x.id}" ${ui.diet.meal === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
    <label class="field"><span>O que você comeu</span><textarea id="dText" rows="3" placeholder="Ex.: 2 ovos mexidos, pão integral e uma banana"></textarea></label>
    <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn fpick">${ic("camera", 14)} Foto da refeição<input type="file" id="dFile" accept="image/*" hidden data-ch="dietPhoto"></label><span id="dPhoto" class="muted sm"></span><span class="grow"></span><button class="btn primary" id="dGo" data-act="dietCheck">Conferir com a dieta</button></div>
    <div id="dRes">${ui.diet.last ? Diet.resultHtml(ui.diet.last) : ""}</div></div></div>
  <div class="cols c2" style="margin-top:14px">
   <div class="card"><div class="hd"><h2>Registrado ${isToday ? "hoje" : "neste dia"}</h2></div>${L.length ? `<div class="list">${L.slice().sort((a, b) => a.ts - b.ts).map((x) => `<div class="dlog"><div class="row"><b>${esc((P.meals.find((q) => q.id === x.meal) || {}).name || x.meal)}</b>${Diet.chip(x.verdict)}<span class="grow"></span><button class="icon-btn" data-act="dietDel" data-id="${x.id}" title="Remover registro">${ic("trash", 13)}</button></div><div class="sm">${esc(x.text)}</div>${x.items && x.items.some((i) => i.status !== "dentro") ? `<div class="sm muted">${x.items.filter((i) => i.status !== "dentro").map((i) => esc(i.food) + " (" + (i.status === "fora" ? "fora" : "não consta") + ")").join(" · ")}</div>` : ""}</div>`).join("")}</div>` : `<div class="empty">Nada registrado ainda.</div>`}</div>
   <div class="card"><div class="hd"><h2>Aderência nos últimos 7 dias</h2><b>${wk.pct === null ? "—" : wk.pct + "%"}</b></div><div class="dweek">${wk.days.map((d) => `<div class="dw" title="${fmtDay(d.d)}: ${d.ok} dentro, ${d.bad} fora"><i style="height:${d.n ? Math.max(8, Math.round(d.ok / d.n * 100)) : 4}%" class="${d.n ? (d.bad ? "bad" : "ok") : ""}"></i><small>${DSEM[wd(d.d).getUTCDay()][0]}</small></div>`).join("")}</div>
    ${rules("Adicionar", P.add)}${rules("Evitar", P.avoid)}${rules("Dicas do plano", P.tips)}</div></div>`;
};
ACT.dietShift = (el) => { ui.diet.date = ymd(addDays(wd(dDate()), +el.dataset.n)); ui.diet.meal = null; ui.diet.last = null; render(); };
ACT.dietToday = () => { ui.diet.date = null; ui.diet.meal = null; ui.diet.last = null; render(); };
ACT.dietSwap = (el) => { Diet.swap(dDate(), el.dataset.m); render(); };
ACT.dietPick = (el) => { ui.diet.meal = el.dataset.m; ui.diet.last = null; render(); setTimeout(() => $("#dText") && $("#dText").focus(), 30); };
INP.dietMealSel = (el) => { ui.diet.meal = el.value; };
INP.dietPhoto = (el) => { $("#dPhoto").textContent = el.files[0] ? el.files[0].name : ""; };
ACT.dietRestart = () => { Diet.D().plan.start = dDate(); Diet.D().over = {}; save(); render(); toast("O ciclo recomeça neste dia"); };
ACT.dietReplace = () => confirmAsk("Importar uma nova dieta substitui a atual. O histórico do que você registrou é mantido.", () => { Diet.D().plan = null; save(); render(); }, { yes: "Trocar dieta", danger: false, title: "Trocar a dieta?" });
ACT.dietDel = (el) => { Diet.delLog(dDate(), el.dataset.id); render(); };
ACT.dietCheck = async () => {
  const text = ($("#dText").value || "").trim(), file = $("#dFile").files[0], meal = $("#dMeal").value, btn = $("#dGo");
  if (!text && !file) { toast("Descreva o que comeu ou envie uma foto", true); return; }
  btn.disabled = true; btn.textContent = "Conferindo…";
  try {
    const r = await Diet.check({ meal, text, file, date: dDate() });
    ui.diet.last = r; ui.diet.meal = meal;
    Diet.addLog(dDate(), { meal, text: text || (r.items || []).map((i) => i.food).join(", ") || "(foto)", verdict: r.verdict, items: r.items, summary: r.summary, tip: r.tip, source: r.source });
    render();
  } catch (e) { toast(e.message || "Não consegui conferir", true); btn.disabled = false; btn.textContent = "Conferir com a dieta"; }
};
/* cartão da página inicial */
function dietCard() {
  const P = Diet.D && S.diet && S.diet.plan;
  if (!P) return "";
  const m = Diet.menu(todayStr());
  return `<div class="card"><div class="hd"><h2>Dieta de hoje</h2><button class="btn sm ghost" data-act="goDiet">Abrir</button></div><div class="list">${m.items.map(({ meal, text }) => { const v = bestVerdict(mealLog(todayStr(), meal.id)); return `<div class="it" data-act="goDiet" style="align-items:flex-start"><span class="muted sm" style="width:44px">${meal.time}</span><div class="grow"><b>${esc(meal.name)}</b><div class="sm muted">${esc(text).slice(0, 90)}</div></div>${v ? Diet.chip(v) : ""}</div>`; }).join("")}</div></div>`;
}
ACT.goDiet = () => go("diet");
