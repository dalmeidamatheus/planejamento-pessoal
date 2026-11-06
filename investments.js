"use strict";
ui.inv = { sel: "all", range: "all" };
const INV_RANGES = [["all", "Tudo"], ["12", "12 meses"], ["6", "6 meses"], ["3", "3 meses"]];
const invList = () => ui.inv.sel === "all" ? S.assets : S.assets.filter((a) => a.id === ui.inv.sel);
function invCut() {
  if (ui.inv.range === "all") return "";
  const m = addM(curYm(), -+ui.inv.range);
  return m + "-" + pad(Math.min(+todayStr().slice(8, 10), daysIn(m)));
}
const signBrl = (v) => (v > 0.005 ? "+" : v < -0.005 ? "−" : "") + brl(Math.abs(v));
const signCls = (v) => v > 0.005 ? "pos" : v < -0.005 ? "neg" : "";
const pcRet = (r) => (r > 0.00005 ? "+" : r < -0.00005 ? "−" : "") + Math.abs(r * 100).toFixed(2).replace(".", ",") + "%";
const assetOpts = (sel) => S.assets.map((a) => `<option value="${a.id}" ${a.id === sel ? "selected" : ""}>${esc(a.name)}</option>`).join("");
INP.invSel = (el) => {
  ui.inv.sel = el.value;
  render();
};
function finInv() {
  if (!S.assets.length) return `<div class="card"><div class="empty">Nenhum investimento ainda.<br><br><button class="btn primary" data-act="newAsset">${ic("plus")}Cadastrar investimento</button></div></div>`;
  if (ui.inv.sel !== "all" && !S.assets.some((a) => a.id === ui.inv.sel)) ui.inv.sel = "all";
  const list = invList(), all = perfSeries(list), cut = invCut();
  let i0 = 0;
  if (cut) {
    i0 = all.findIndex((p) => p.d >= cut);
    if (i0 < 0) i0 = all.length;
  }
  const stats = all.slice(i0), vis = all.slice(Math.max(0, i0 - 1));
  const value = list.reduce((s, a) => s + assetVal(a), 0), last = all[all.length - 1];
  const cost = last ? last.cost + list.reduce((s, a) => s + (a.moves || []).filter((m) => m.d > last.d).reduce((q, m) => q + m.a, 0), 0) : list.reduce((s, a) => s + assetInv(a), 0);
  const yTotal = value - cost, yRange = stats.reduce((s, p) => s + p.yld, 0), mvRange = stats.reduce((s, p) => s + p.moves, 0);
  const twr = stats.reduce((t, p) => t * (1 + p.ret), 1) - 1, allRange = ui.inv.range === "all";
  const tipP = (p) => `<b>${fmtDayL(p.d)}/${p.d.slice(0, 4)}</b><br>Saldo: ${brl(p.v)}<br>Aportado: ${brl(p.cost)}<br>Rendimento acumulado: ${signBrl(p.cum)}`;
  const rowsV = vis.map((p) => ({ l: fmtDay(p.d), v: p.v, cost: p.cost, t: tipP(p) }));
  const rowsC = vis.map((p) => ({ l: fmtDay(p.d), v: p.cum, t: tipP(p) }));
  const rowsY = stats.filter((p, k) => !(k === 0 && i0 === 0 && !p.yld && !p.moves)).map((p) => ({ l: fmtDay(p.d), v: p.yld, t: `<b>${fmtDayL(p.d)}/${p.d.slice(0, 4)}</b><br>Rendimento: ${signBrl(p.yld)} (${pcRet(p.ret)})<br>Movimentação: ${signBrl(p.moves)}<br>Saldo: ${brl(p.v)}` }));
  const hint = `<div class="empty">Registre ao menos duas conferências de saldo para ver o rendimento.<br><span class="sm">Use <b>Conferir saldo</b> sempre que olhar o valor no app do banco.</span></div>`;
  const byT = {};
  S.assets.forEach((a) => byT[a.type] = (byT[a.type] || 0) + assetVal(a));
  const alloc = Object.entries(byT).filter((x) => x[1] > 0).map(([k, v], i) => ({ l: ATYPES[k], v, c: PAL[i % PAL.length] }));
  const recs = list.flatMap((a) => [...(a.checks || []).map((c) => ({ k: "check", a, id: c.id, d: c.d, v: c.v })), ...(a.moves || []).map((m) => ({ k: "move", a, id: m.id, d: m.d, v: m.a }))]).sort((x, y) => y.d.localeCompare(x.d)).slice(0, 40);
  const y12 = ymd(addDays(wd(todayStr()), -365)), ids = new Set(list.map((a) => a.id));
  const divs = S.divs.filter((d) => ids.has(d.assetId)).sort((a, b) => b.date.localeCompare(a.date));
  const dv12 = divs.filter((d) => d.date >= y12).reduce((s, d) => s + d.amount, 0);
  return `<div class="toolbar"><select style="width:220px" data-ch="invSel"><option value="all">Carteira inteira</option>${assetOpts(ui.inv.sel)}</select>
   <div class="seg">${INV_RANGES.map(([k, n]) => `<button class="${ui.inv.range === k ? "on" : ""}" data-act="invRange" data-r="${k}">${n}</button>`).join("")}</div>
   ${ui.inv.sel !== "all" ? `<button class="btn sm" data-act="editAsset" data-id="${ui.inv.sel}">Editar investimento</button>` : ""}</div>
  <div class="cols c4" style="margin-bottom:14px">
   <div class="card stat"><div class="l">Saldo atual</div><div class="v">${brl(value)}</div><div class="s">${last ? "última conferência " + fmtDay(last.d) : "sem conferências"}</div></div>
   <div class="card stat"><div class="l">Capital aportado</div><div class="v">${brl(cost)}</div><div class="s">saldo inicial + aportes − resgates</div></div>
   <div class="card stat"><div class="l">Rendimento acumulado</div><div class="v ${signCls(yTotal)}">${signBrl(yTotal)}</div><div class="s">${cost > 0 ? pcRet(yTotal / cost) + " sobre o aportado" : "—"}</div></div>
   <div class="card stat"><div class="l">${allRange ? "Rentabilidade total" : "Rentabilidade no período"}</div><div class="v ${signCls(twr)}">${stats.length ? pcRet(twr) : "—"}</div><div class="s">${signBrl(yRange)} · movimentado ${signBrl(mvRange)}</div></div></div>
  <div class="cols c2" style="margin-bottom:14px">
   <div class="card"><div class="hd"><h2>Saldo × capital aportado</h2><div class="row sm muted"><span class="dot" style="--c:#2563eb"></span>Saldo <span class="dot" style="--c:#94a3b8"></span>Aportado</div></div>${vis.length > 1 ? lineMulti(rowsV, { series: [{ k: "v", c: "#2563eb", n: "Saldo" }, { k: "cost", c: "#94a3b8", n: "Aportado", dash: true }], fmt: (v) => short(v) }) : hint}</div>
   <div class="card"><div class="hd"><h2>Rendimento por período</h2><span class="muted sm">o que sobrou depois das suas movimentações</span></div>${rowsY.length ? barsSigned(rowsY) : hint}</div></div>
  <div class="cols c2" style="margin-bottom:14px">
   <div class="card"><div class="hd"><h2>Rendimento acumulado</h2><span class="muted sm">positivo ou negativo</span></div>${vis.length > 1 ? lineChart(rowsC, { zero: false, c: yTotal >= 0 ? "#16a34a" : "#e5484d", fmt: (v) => short(v) }) : hint}</div>
   <div class="card"><div class="hd"><h2>Alocação</h2></div>${donut(alloc, { size: 150 })}</div></div>
  <div class="card" style="margin-bottom:14px"><div class="hd"><h2>Histórico por conferência</h2><span class="muted sm">rendimento = variação do saldo − o que você aportou ou resgatou</span></div>
   ${stats.length ? `<table class="tb"><thead><tr><th>Conferência</th><th class="num">Saldo</th><th class="num">Movimentação</th><th class="num">Rendimento</th><th class="num">Rentab.</th></tr></thead><tbody>${[...stats].reverse().map((p) => `<tr><td class="muted">${fmtDay(p.d)}/${p.d.slice(2, 4)}</td><td class="num">${brl(p.v)}</td><td class="num ${signCls(p.moves)}">${p.moves ? signBrl(p.moves) : "—"}</td><td class="num ${signCls(p.yld)}">${signBrl(p.yld)}</td><td class="num ${signCls(p.ret)}">${pcRet(p.ret)}</td></tr>`).join("")}</tbody></table>` : hint}</div>
  <div class="cols c2"><div class="card"><div class="hd"><h2>Registros</h2><span class="muted sm">conferências e movimentações</span></div>
   ${recs.length ? `<div class="list">${recs.map((r) => `<div class="it" style="cursor:default"><span class="muted sm" style="width:58px">${fmtDay(r.d)}/${r.d.slice(2, 4)}</span><span class="pill ${r.k === "check" ? "" : r.v >= 0 ? "blue" : "warn"}">${r.k === "check" ? "Saldo" : r.v >= 0 ? "Aporte" : "Resgate"}</span><div class="grow">${esc(r.a.name)}</div><div class="num ${r.k === "move" ? signCls(r.v) : ""}">${r.k === "move" ? signBrl(r.v) : brl(r.v)}</div><button class="btn sm ghost" data-act="invRecDel" data-k="${r.k}" data-a="${r.a.id}" data-id="${r.id}" title="Excluir registro">${ic("x", 13)}</button></div>`).join("")}</div>` : '<div class="empty">Sem registros</div>'}</div>
   <div class="card"><div class="hd"><h2>Proventos</h2><span class="muted sm">12 meses: ${brl(dv12)}</span></div>${divs.length ? `<div class="list">${divs.slice(0, 10).map((d) => `<div class="it" style="cursor:default"><span class="muted sm" style="width:58px">${fmtDay(d.date)}/${d.date.slice(2, 4)}</span><div class="grow">${esc(S.assets.find((a) => a.id === d.assetId)?.name || "—")}</div><div class="num pos">${brl(d.amount)}</div></div>`).join("")}</div>` : '<div class="empty">Sem proventos</div>'}</div></div>`;
}
ACT.invRange = (el) => {
  ui.inv.range = el.dataset.r;
  render();
};
ACT.invRecDel = (el) => {
  const a = S.assets.find((x) => x.id === el.dataset.a);
  if (!a || !confirmDlg("Excluir este registro?")) return;
  if (el.dataset.k === "check") a.checks = a.checks.filter((c) => c.id !== el.dataset.id);
  else a.moves = a.moves.filter((m) => m.id !== el.dataset.id);
  save();
  render();
};
let dAsset = null;
ACT.newAsset = () => openAsset();
ACT.editAsset = (el) => openAsset(el.dataset.id);
function openAsset(id) {
  const a = id ? S.assets.find((x) => x.id === id) : { name: "", type: "rf" };
  dAsset = id;
  modal(`<form data-form="asset"><h2>${id ? "Editar" : "Novo"} investimento</h2><label class="field"><span>Nome</span><input type="text" name="name" value="${esc(a.name)}" required placeholder="Tesouro Selic, CDB, PETR4, Bitcoin…"></label>
  <label class="field"><span>Tipo</span><select name="type">${Object.entries(ATYPES).map(([k, v]) => `<option value="${k}" ${a.type === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
  <div class="muted sm">Depois use <b>Conferir saldo</b> para registrar o valor que aparece no app do banco e <b>Movimentar</b> quando você colocar ou tirar dinheiro. O rendimento é calculado sozinho.</div>
  <div class="foot">${id ? `<button type="button" class="btn danger" data-act="assetDel">Excluir</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
}
SUBMIT.asset = (f, fd) => {
  const o = { name: fd.get("name").trim(), type: fd.get("type") };
  if (dAsset) Object.assign(S.assets.find((x) => x.id === dAsset), o);
  else {
    const a = { id: uid(), checks: [], moves: [], ...o };
    S.assets.push(a);
    ui.inv.sel = a.id;
  }
  save();
  closeModal();
  render();
};
ACT.assetDel = () => {
  if (!confirmDlg("Excluir investimento e todo o histórico?")) return;
  S.assets = S.assets.filter((x) => x.id !== dAsset);
  S.divs = S.divs.filter((d) => d.assetId !== dAsset);
  ui.inv.sel = "all";
  save();
  closeModal();
  render();
};
const needAsset = () => {
  if (S.assets.length) return true;
  toast("Cadastre um investimento primeiro", true);
  return false;
};
const defAsset = () => ui.inv.sel !== "all" ? ui.inv.sel : S.assets[0]?.id;
ACT.newCheck = () => {
  if (!needAsset()) return;
  const a0 = S.assets.find((a) => a.id === defAsset());
  modal(`<form data-form="check"><h2>Conferir saldo</h2><p class="muted sm">Digite o valor que aparece hoje no app do banco ou da corretora. A diferença para a conferência anterior, descontando o que você aportou ou resgatou, vira rendimento.</p>
  <label class="field"><span>Investimento</span><select name="a" data-ch="checkAsset">${assetOpts(a0.id)}</select></label>
  <div class="grid2"><label class="field"><span>Saldo (R$)</span><input type="number" step="0.01" min="0" name="v" id="chkV" value="${R2(assetVal(a0))}" required></label><label class="field"><span>Data da conferência</span><input type="date" name="d" value="${todayStr()}" required></label></div>
  <div class="muted sm">Se você aportou ou resgatou no mesmo dia, registre em <b>Movimentar</b> e informe aqui o saldo já com essa movimentação.</div>
  <div class="foot"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
};
INP.checkAsset = (el) => {
  const a = S.assets.find((x) => x.id === el.value);
  if (a) $("#chkV").value = R2(assetVal(a));
};
SUBMIT.check = (f, fd) => {
  const a = S.assets.find((x) => x.id === fd.get("a"));
  if (!a) return;
  const v = R2(+fd.get("v")), d = fd.get("d"), before = assetVal(a, d);
  a.checks = a.checks.filter((c) => c.d !== d);
  const hadBefore = (a.checks || []).some((c) => c.d < d) || a.moves.some((m) => m.d <= d);
  a.checks.push({ id: uid(), d, v });
  save();
  closeModal();
  render();
  toast(hadBefore ? `Saldo registrado · rendimento desde a última conferência: ${signBrl(v - before)}` : "Primeiro saldo registrado — ele é o ponto de partida");
};
ACT.newMove = () => {
  if (!needAsset()) return;
  modal(`<form data-form="move"><h2>Movimentar</h2><p class="muted sm">Registre só o dinheiro que <b>você</b> colocou ou tirou. Todo o resto da variação entre duas conferências é contado como rendimento.</p>
  <label class="field"><span>Investimento</span><select name="a">${assetOpts(defAsset())}</select></label>
  <div class="grid3"><label class="field"><span>Tipo</span><select name="k"><option value="aporte">Aporte (coloquei)</option><option value="resgate">Resgate (tirei)</option></select></label><label class="field"><span>Valor (R$)</span><input type="number" step="0.01" min="0.01" name="v" required></label><label class="field"><span>Data</span><input type="date" name="d" value="${todayStr()}" required></label></div>
  <label class="row sm"><input type="checkbox" name="tx" checked> Lançar também em Transações (Investimentos / Resgate)</label>
  <div class="foot"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
};
SUBMIT.move = (f, fd) => {
  const a = S.assets.find((x) => x.id === fd.get("a"));
  if (!a) return;
  const sign = fd.get("k") === "resgate" ? -1 : 1, v = R2(+fd.get("v")), d = fd.get("d");
  a.moves.push({ id: uid(), d, a: sign * v });
  if (fd.get("tx")) S.tx.push({ id: uid(), type: sign > 0 ? "out" : "in", desc: (sign > 0 ? "Aporte — " : "Resgate — ") + a.name, amount: v, date: d, cat: sign > 0 ? "Investimentos" : "Resgate", sub: ATYPES[a.type], method: "transfer", status: "paid" });
  save();
  closeModal();
  render();
  toast(sign > 0 ? "Aporte registrado" : "Resgate registrado");
};
ACT.newDiv = () => {
  if (!needAsset()) return;
  modal(`<form data-form="div"><h2>Novo provento</h2><label class="field"><span>Investimento</span><select name="a">${assetOpts(defAsset())}</select></label><div class="grid2"><label class="field"><span>Valor (R$)</span><input type="number" step="0.01" min="0.01" name="v" required></label><label class="field"><span>Data</span><input type="date" name="d" value="${todayStr()}" required></label></div>
  <label class="row sm"><input type="checkbox" name="tx" checked> Lançar também como entrada (Rendimentos)</label><div class="foot"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
};
SUBMIT.div = (f, fd) => {
  const a = S.assets.find((x) => x.id === fd.get("a")), v = R2(+fd.get("v")), d = fd.get("d");
  if (!a) return;
  S.divs.push({ id: uid(), assetId: a.id, date: d, amount: v });
  if (fd.get("tx")) S.tx.push({ id: uid(), type: "in", desc: "Provento — " + a.name, amount: v, date: d, cat: "Rendimentos", sub: ATYPES[a.type], method: "transfer", status: "paid" });
  save();
  closeModal();
  render();
  toast("Provento registrado");
};
