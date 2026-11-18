"use strict";
/* Dieta (celular): importar plano, cardápio do dia, registrar o que comeu (texto ou foto) e conferir com o plano. */
ui.m.diet = { date: null, meal: null };
const mdDate = () => ui.m.diet.date || todayStr();
const mdLog = (date, id) => (Diet.D().log[date] || []).filter((x) => x.meal === id);
const mdBest = (L) => (L.some((x) => x.verdict === "fora") ? "fora" : L.some((x) => x.verdict === "parcial") ? "parcial" : L.length ? "dentro" : "");

MV.diet = () => {
  const P = Diet.D().plan;
  if (!P) return `<div class="mdiet"><h2>Importar sua dieta</h2><p class="muted">Cole o texto do plano ou envie um PDF, texto ou foto. Identifico as refeições, as opções e o cardápio por dia.</p>
   <textarea id="dietText" rows="9" placeholder="Cole aqui o texto da dieta…"></textarea>
   <div class="stack"><label class="btn big">${mIc("clip", 16)} Enviar PDF, texto ou foto<input type="file" accept=".txt,.md,.csv,.tsv,.pdf,image/*" hidden data-ch="mDietFile"></label><button class="btn primary big" data-act="mDietAnalyze">Analisar dieta</button><div id="dietMsg" class="sm muted"></div></div></div>`;
  const date = mdDate(), m = Diet.menu(date), L = Diet.D().log[date] || [], wk = Diet.week(), isToday = date === todayStr();
  const rules = (t, a) => (a.length ? `<details class="drule"><summary>${t} <small>${a.length}</small></summary><ul>${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : "");
  return `<div class="agbar"><button class="icon-btn" data-act="mDietShift" data-n="-1" aria-label="Dia anterior">${mIc("left")}</button><div class="agtitle"><b>${isToday ? "Hoje" : esc(fmtDayL(date))}</b> <span class="muted sm">${fmtDay(date)}${m.dayNo ? " · dia " + m.dayNo + "/" + m.total : ""}</span></div><button class="icon-btn" data-act="mDietShift" data-n="1" aria-label="Próximo dia">${mIc("right")}</button></div>
  <div class="mdiet">${m.items.map(({ meal, text, src }) => { const v = mdBest(mdLog(date, meal.id)); return `<div class="dmeal"><div class="dm-h"><span class="dm-t">${meal.time}</span><b class="grow">${esc(meal.name)}</b>${v ? Diet.chip(v) : ""}</div><div class="dm-x" style="padding-left:0">${esc(text) || '<span class="muted">Sem sugestão no plano</span>'}${src === "troca" ? ' <span class="muted sm">(trocado)</span>' : ""}</div><div class="row" style="gap:8px;margin-top:8px">${Diet.alternatives(meal.id).length > 1 ? `<button class="btn grow" data-act="mDietSwap" data-m="${meal.id}">${mIc("repeat", 15)} Outra opção</button>` : ""}<button class="btn primary grow" data-act="mDietLog" data-m="${meal.id}">Registrar</button></div></div>`; }).join("")}
  ${L.length ? `<h3 class="dh3">Registrado</h3>${L.slice().sort((a, b) => a.ts - b.ts).map((x) => `<div class="dlog"><div class="row"><b>${esc((P.meals.find((q) => q.id === x.meal) || {}).name || x.meal)}</b>${Diet.chip(x.verdict)}<span class="grow"></span><button class="icon-btn" data-act="mDietDel" data-id="${x.id}" aria-label="Remover">${mIc("trash", 16)}</button></div><div class="sm">${esc(x.text)}</div>${x.items && x.items.some((i) => i.status !== "dentro") ? `<div class="sm muted">${x.items.filter((i) => i.status !== "dentro").map((i) => esc(i.food) + " (" + (i.status === "fora" ? "fora" : "não consta") + ")").join(" · ")}</div>` : ""}</div>`).join("")}` : ""}
  <h3 class="dh3">Aderência (7 dias) <b>${wk.pct === null ? "" : wk.pct + "%"}</b></h3><div class="dweek">${wk.days.map((d) => `<div class="dw"><i style="height:${d.n ? Math.max(8, Math.round(d.ok / d.n * 100)) : 4}%" class="${d.n ? (d.bad ? "bad" : "ok") : ""}"></i><small>${DSEM[wd(d.d).getUTCDay()][0]}</small></div>`).join("")}</div>
  ${rules("Adicionar", P.add)}${rules("Evitar", P.avoid)}${rules("Dicas do plano", P.tips)}
  <div class="stack" style="margin-top:12px"><button class="btn" data-act="mDietRestart">Começar o ciclo neste dia</button><button class="btn" data-act="mDietReplace">Trocar dieta</button></div></div>`;
};
INP.mDietFile = async (el) => {
  const f = el.files[0], msg = $("#dietMsg");
  el.value = "";
  if (!f) return;
  try {
    const t = await Diet.readFile(f, (s) => { msg.textContent = s; });
    $("#dietText").value = t;
    msg.textContent = t.trim() ? "Texto lido. Confira e toque em Analisar dieta." : "Não encontrei texto no arquivo.";
  } catch (e) { msg.textContent = ""; toast(e.message || "Não consegui ler o arquivo", true); }
};
let mdPending = null;
ACT.mDietAnalyze = async () => {
  const text = ($("#dietText") || {}).value || "", btn = $('[data-act="mDietAnalyze"]');
  if (text.trim().length < 20) { toast("Cole o texto da dieta ou envie um arquivo", true); return; }
  btn.disabled = true; btn.textContent = "Analisando…";
  try { mdPending = await Diet.importText(text); } catch (e) { toast(e.message || "Não consegui analisar", true); return; } finally { btn.disabled = false; btn.textContent = "Analisar dieta"; }
  const p = mdPending.plan, ok = Diet.planOk(p);
  formSheet("Confira o que foi entendido", "mDietConfirm", `<p class="sm muted">${mdPending.source === "ai" ? "Lido por IA" + (mdPending.provider ? " (" + esc(mdPending.provider) + ")" : "") : "Leitura local simples (sem IA)"}</p>
   ${ok ? "" : `<div class="infobox">Não consegui identificar refeições. Use títulos como “Almoço:” com opções embaixo, ou uma tabela “Dia | Café da manhã | Almoço…”. Para textos livres, ative uma IA em Ajustes.</div>`}
   <div class="dsum"><div><b>${p.meals.length}</b><span>refeições</span></div><div><b>${p.days.length}</b><span>dias</span></div><div><b>${Object.values(p.options).reduce((a, v) => a + v.length, 0)}</b><span>opções</span></div><div><b>${p.add.length + p.avoid.length}</b><span>regras</span></div></div>
   <ul class="dml">${p.meals.map((m) => `<li><b>${esc(m.name)}</b> <span class="muted">${m.time}</span><div class="sm muted">${esc(((p.days[0] && p.days[0].m[m.id]) || (p.options[m.id] || [])[0] || "—").slice(0, 100))}</div></li>`).join("")}</ul>
   <label class="field"><span>O dia 1 do cardápio é</span><input type="date" name="start" value="${todayStr()}"></label>`, { label: ok ? "Usar esta dieta" : "Voltar" });
};
SUBMIT.mDietConfirm = (f, fd) => {
  if (!Diet.planOk(mdPending.plan)) { closeModal(); return; }
  Diet.setPlan(mdPending.plan, mdPending.source, fd.get("start") || todayStr());
  closeModal(); render(); toast("Dieta importada");
};
ACT.mDietShift = (el) => { ui.m.diet.date = ymd(addDays(wd(mdDate()), +el.dataset.n)); render(); };
ACT.mDietSwap = (el) => { Diet.swap(mdDate(), el.dataset.m); render(); };
ACT.mDietDel = (el) => { Diet.delLog(mdDate(), el.dataset.id); render(); };
ACT.mDietRestart = () => { Diet.D().plan.start = mdDate(); Diet.D().over = {}; save(); render(); toast("O ciclo recomeça neste dia"); };
ACT.mDietReplace = () => mConfirm("Importar uma nova dieta substitui a atual. O histórico do que você registrou é mantido.", "Trocar dieta", () => { Diet.D().plan = null; save(); render(); }, { title: "Trocar a dieta?", danger: false });
ACT.mDietLog = (el) => {
  const P = Diet.D().plan, meal = P.meals.find((x) => x.id === el.dataset.m);
  openLayer(`<div class="fsheet"><div class="shead"><h2>${esc(meal.name)}</h2><button type="button" class="icon-btn" data-act="layerClose" aria-label="Fechar">${mIc("x")}</button></div><div class="sbody">
   <input type="hidden" id="dMeal" value="${meal.id}">
   <label class="field"><span>O que você comeu</span><textarea id="dText" rows="4" placeholder="Ex.: 2 ovos mexidos, pão integral e uma banana"></textarea></label>
   <label class="btn big">${mIc("camera", 16)} Foto da refeição<input type="file" id="dFile" accept="image/*" hidden data-ch="mDietPhoto"></label><div id="dPhoto" class="sm muted"></div>
   <div id="dRes"></div></div><div class="sfoot"><button class="btn primary big grow" id="dGo" data-act="mDietCheck">Conferir com a dieta</button></div></div>`, { tall: true });
};
INP.mDietPhoto = (el) => { $("#dPhoto").textContent = el.files[0] ? el.files[0].name : ""; };
ACT.mDietCheck = async () => {
  const text = ($("#dText").value || "").trim(), file = $("#dFile").files[0], meal = $("#dMeal").value, btn = $("#dGo");
  if (!text && !file) { toast("Descreva o que comeu ou envie uma foto", true); return; }
  btn.disabled = true; btn.textContent = "Conferindo…";
  try {
    const r = await Diet.check({ meal, text, file, date: mdDate() });
    Diet.addLog(mdDate(), { meal, text: text || (r.items || []).map((i) => i.food).join(", ") || "(foto)", verdict: r.verdict, items: r.items, summary: r.summary, tip: r.tip, source: r.source });
    $("#dRes").innerHTML = Diet.resultHtml(r);
    btn.textContent = "Concluir"; btn.disabled = false; btn.dataset.act = "mDietDone";
    render();
  } catch (e) { toast(e.message || "Não consegui conferir", true); btn.disabled = false; btn.textContent = "Conferir com a dieta"; }
};
ACT.mDietDone = () => closeModal();
function dietHome() {
  if (!(S.diet && S.diet.plan)) return "";
  const m = Diet.menu(todayStr());
  return `<section class="msec"><div class="sh"><h3>Dieta de hoje</h3><a href="#/diet">Abrir</a></div>${m.items.map(({ meal, text }) => { const v = mdBest(mdLog(todayStr(), meal.id)); return `<div class="row-it" data-act="goDietM"><span class="muted sm" style="width:42px">${meal.time}</span><div class="grow"><b>${esc(meal.name)}</b><div class="sm muted ell">${esc(text)}</div></div>${v ? Diet.chip(v) : ""}</div>`; }).join("")}</section>`;
}
ACT.goDietM = () => go("diet");
