"use strict";
function finInv() {
  const A = S.assets;
  if (!A.length) return `<div class="card"><div class="empty">Nenhum ativo ainda.<br><br><button class="btn primary" data-act="newAsset">${ic("plus")}Cadastrar ativo</button></div></div>`;
  const inv = A.reduce((s, a) => s + assetInv(a), 0), val = A.reduce((s, a) => s + assetVal(a), 0), y12 = ymd(addDays(wd(todayStr()), -365)), dv = S.divs.filter((d) => d.date >= y12).reduce((s, d) => s + d.amount, 0);
  const byT = {};
  A.forEach((a) => byT[a.type] = (byT[a.type] || 0) + assetVal(a));
  const al = Object.entries(byT).filter((x) => x[1] > 0).map(([k, v], i) => ({ l: ATYPES[k], v, c: PAL[i % PAL.length] }));
  return `<div class="cols c4" style="margin-bottom:14px"><div class="card stat"><div class="l">Total investido</div><div class="v">${brl(inv)}</div></div><div class="card stat"><div class="l">Valor atual (estimado)</div><div class="v">${brl(val)}</div></div>
   <div class="card stat"><div class="l">Rentabilidade</div><div class="v ${val < inv ? "neg" : "pos"}">${inv ? ((val - inv) / inv * 100).toFixed(1).replace(".", ",") : "0"}%</div><div class="s">${brl(val - inv)}</div></div><div class="card stat"><div class="l">Proventos (12 meses)</div><div class="v">${brl(dv)}</div></div></div>
  <div class="cols c21" style="margin-bottom:14px"><div class="card"><div class="hd"><h2>Ativos</h2></div><table class="tb"><thead><tr><th>Ativo</th><th>Tipo</th><th class="num">Investido</th><th class="num">Atual</th><th class="num">Rent.</th><th></th></tr></thead><tbody>
   ${A.map((a) => {
    const i = assetInv(a), v = assetVal(a);
    return `<tr><td><b>${esc(a.name)}</b><div class="muted sm">${a.rate || 0}% a.a. estimado${a.manual != null && a.manual !== "" ? " · valor manual" : ""}</div></td><td>${ATYPES[a.type]}</td><td class="num">${brl(i)}</td><td class="num">${brl(v)}</td><td class="num ${v < i ? "neg" : "pos"}">${i ? ((v - i) / i * 100).toFixed(1).replace(".", ",") : 0}%</td><td class="num"><button class="btn sm ghost" data-act="editAsset" data-id="${a.id}">Editar</button></td></tr>`;
  }).join("")}</tbody></table></div>
  <div class="card"><div class="hd"><h2>Alocação</h2></div>${donut(al, { size: 150 })}</div></div>
  <div class="card"><div class="hd"><h2>Aportes e proventos recentes</h2></div>${(() => {
    const L = [...A.flatMap((a) => (a.contribs || []).map((c) => ({ d: c.date, n: a.name, v: c.amount, k: "Aporte" }))), ...S.divs.map((d) => ({ d: d.date, n: S.assets.find((a) => a.id === d.assetId)?.name || "—", v: d.amount, k: "Provento" }))].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 10);
    return L.length ? `<div class="list">${L.map((x) => `<div class="it" style="cursor:default"><span class="muted sm" style="width:42px">${fmtDay(x.d)}</span><span class="pill ${x.k === "Provento" ? "ok" : "blue"}">${x.k}</span><div class="grow">${esc(x.n)}</div><div class="num">${brl(x.v)}</div></div>`).join("")}</div>` : '<div class="empty">Sem movimentações</div>';
  })()}</div>`;
}
let dAsset = null;
ACT.newAsset = () => openAsset();
ACT.editAsset = (el) => openAsset(el.dataset.id);
function openAsset(id) {
  const a = id ? S.assets.find((x) => x.id === id) : { name: "", type: "rf", rate: 10, manual: "" };
  dAsset = id;
  modal(`<form data-form="asset"><h2>${id ? "Editar" : "Novo"} ativo</h2><label class="field"><span>Nome</span><input type="text" name="name" value="${esc(a.name)}" required placeholder="Tesouro Selic, PETR4, BTC, HGLG11…"></label>
  <div class="grid2"><label class="field"><span>Tipo</span><select name="type">${Object.entries(ATYPES).map(([k, v]) => `<option value="${k}" ${a.type === k ? "selected" : ""}>${v}</option>`).join("")}</select></label><label class="field"><span>Rentabilidade estimada (% a.a.)</span><input type="number" step="0.1" name="rate" value="${a.rate}"></label></div>
  <label class="field"><span>Valor atual manual (opcional — substitui a estimativa)</span><input type="number" step="0.01" name="manual" value="${a.manual ?? ""}"></label>
  <div class="foot">${id ? `<button type="button" class="btn danger" data-act="assetDel">Excluir</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
}
SUBMIT.asset = (f, fd) => {
  const o = { name: fd.get("name").trim(), type: fd.get("type"), rate: +fd.get("rate") || 0, manual: fd.get("manual") === "" ? null : +fd.get("manual") };
  if (dAsset) Object.assign(S.assets.find((x) => x.id === dAsset), o);
  else S.assets.push({ id: uid(), contribs: [], ...o });
  save();
  closeModal();
  render();
};
ACT.assetDel = () => {
  if (!confirmDlg("Excluir ativo e seu histórico?")) return;
  S.assets = S.assets.filter((x) => x.id !== dAsset);
  S.divs = S.divs.filter((d) => d.assetId !== dAsset);
  save();
  closeModal();
  render();
};
function assetSel() {
  return S.assets.length ? S.assets.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("") : '<option value="">Cadastre um ativo primeiro</option>';
}
ACT.newContrib = () => {
  if (!S.assets.length) {
    toast("Cadastre um ativo primeiro", true);
    return;
  }
  modal(`<form data-form="contrib"><h2>Novo aporte</h2><label class="field"><span>Ativo</span><select name="a">${assetSel()}</select></label><div class="grid2"><label class="field"><span>Valor (R$)</span><input type="number" step="0.01" min="0.01" name="v" required></label><label class="field"><span>Data</span><input type="date" name="d" value="${todayStr()}" required></label></div>
  <label class="row sm"><input type="checkbox" name="tx" checked> Lançar também como saída (categoria Investimentos)</label><div class="foot"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
};
SUBMIT.contrib = (f, fd) => {
  const a = S.assets.find((x) => x.id === fd.get("a")), v = R2(+fd.get("v")), d = fd.get("d");
  if (!a) return;
  a.contribs.push({ date: d, amount: v });
  if (fd.get("tx")) S.tx.push({ id: uid(), type: "out", desc: "Aporte — " + a.name, amount: v, date: d, cat: "Investimentos", sub: ATYPES[a.type], method: "transfer", status: "paid" });
  save();
  closeModal();
  render();
  toast("Aporte registrado");
};
ACT.newDiv = () => {
  if (!S.assets.length) {
    toast("Cadastre um ativo primeiro", true);
    return;
  }
  modal(`<form data-form="div"><h2>Novo provento</h2><label class="field"><span>Ativo</span><select name="a">${assetSel()}</select></label><div class="grid2"><label class="field"><span>Valor (R$)</span><input type="number" step="0.01" min="0.01" name="v" required></label><label class="field"><span>Data</span><input type="date" name="d" value="${todayStr()}" required></label></div>
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
