"use strict";
ui.fin.ov = { months: 6, kind: "out" };
function finGeral() {
  const ym = ui.fin.ym, T = totals(ym), cur = curYm();
  const rows = [];
  for (let i = ui.fin.ov.months - 1; i >= 0; i--) {
    const m = addM(ym, -i), x = totals(m);
    rows.push({ l: ymShort(m), a: x.in, b: x.out });
  }
  const byCat = {};
  T.L.filter((t) => t.type === ui.fin.ov.kind).forEach((t) => byCat[t.cat] = (byCat[t.cat] || 0) + t.amount);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ l: c, v, c: catColor(c) }));
  const nw = [];
  for (let i = 11; i >= 0; i--) {
    const m = addM(cur, -i);
    nw.push({ l: ymShort(m), v: netWorth(m + "-" + daysIn(m)) });
  }
  const up = [...monthTx(cur), ...monthTx(addM(cur, 1))].filter((t) => t.type === "out" && t.status !== "paid").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7);
  const empty = !S.tx.length && !S.recur.length && !S.cards.length;
  return `${empty ? `<div class="card flat" style="margin-bottom:14px;display:flex;align-items:center;gap:12px"><div class="grow"><b>Comece lançando sua primeira transação</b><div class="muted sm">Ou carregue dados de exemplo para explorar o sistema.</div></div><button class="btn" data-act="seed">Carregar exemplo</button></div>` : ""}
  <div class="cols c4" style="margin-bottom:14px">
   <div class="card stat"><div class="l">Entradas</div><div class="v pos">${brl(T.in)}</div><div class="s">${brl(T.inP)} recebido</div></div>
   <div class="card stat"><div class="l">Saídas</div><div class="v neg">${brl(T.out)}</div><div class="s">${brl(T.outP)} pago</div></div>
   <div class="card stat"><div class="l">Saldo do mês</div><div class="v ${T.in - T.out < 0 ? "neg" : ""}">${brl(T.in - T.out)}</div><div class="s">${T.in ? Math.round((T.in - T.out) / T.in * 100) + "% da renda poupada" : "—"}</div></div>
   ${statCash()}</div>
  <div class="cols c2" style="margin-bottom:14px">${statInv()}${statNet()}</div>
  <div class="cols c21" style="margin-bottom:14px"><div class="card"><div class="hd"><h2>Fluxo de caixa</h2><div class="row"><div class="row sm muted"><span class="dot" style="--c:#16a34a"></span>Entradas <span class="dot" style="--c:#e5484d"></span>Saídas</div><div class="seg">${[6, 12, 24].map((n) => `<button class="${ui.fin.ov.months === n ? "on" : ""}" data-act="ovMonths" data-n="${n}">${n}m</button>`).join("")}</div></div></div>${barsChart(rows)}</div>
   <div class="card"><div class="hd"><h2>${ui.fin.ov.kind === "out" ? "Despesas" : "Entradas"} por categoria</h2><div class="seg"><button class="${ui.fin.ov.kind === "out" ? "on" : ""}" data-act="ovKind" data-k="out">Saídas</button><button class="${ui.fin.ov.kind === "in" ? "on" : ""}" data-act="ovKind" data-k="in">Entradas</button></div></div>${donut(cats)}</div></div>
  <div class="cols c21"><div class="card"><div class="hd"><h2>Evolução patrimonial</h2><span class="muted sm">12 meses</span></div>${lineChart(nw)}</div>
   <div class="card"><div class="hd"><h2>Próximos vencimentos</h2></div>${up.length ? `<div class="list">${up.map((t) => `<div class="it" data-act="openTx" data-id="${t.id}"><div class="grow"><div>${esc(t.desc)}</div><div class="muted sm">${fmtDayL(t.date)}${t.cardId ? " · " + esc(cardOf(t.cardId)?.name || "") : ""}</div></div><div class="num">${brl(t.amount)}</div>${stat(t) === "overdue" ? '<span class="pill bad">Atrasado</span>' : ""}</div>`).join("")}</div>` : '<div class="empty">Nada pendente 🎉</div>'}</div></div>`;
}
ACT.ovMonths = (el) => {
  ui.fin.ov.months = +el.dataset.n;
  render();
};
ACT.ovKind = (el) => {
  ui.fin.ov.kind = el.dataset.k;
  render();
};
function statCash() {
  const c = cashAvailable(todayStr()), fl = investFlows().slice(0, 3);
  return `<div class="card stat"><div class="l">Dinheiro disponível</div><div class="v ${c < 0 ? "neg" : ""}">${brl(c)}</div><div class="s">já descontando o que foi para investimentos</div><div class="mini">${fl.length ? fl.map((f) => `${fmtDay(f.d)} · ${f.v < 0 ? "aporte" : "resgate"} ${signBrl(f.v)} · ${esc(f.n)}`).join("<br>") : "sem movimentações em investimentos"}</div></div>`;
}
function statInv() {
  const s = invSummary();
  return `<div class="card stat"><div class="l">Investimentos</div><div class="v">${brl(s.value)}</div><div class="s">rendimento <b class="${signCls(s.yld)}">${signBrl(s.yld)}</b>${s.cost > 0 ? " (" + pcRet(s.yld / s.cost) + ")" : ""} sobre ${brl(s.cost)} aportados</div></div>`;
}
function statNet() {
  const c = cashAvailable(todayStr()), i = invSummary().value;
  return `<div class="card stat"><div class="l">Patrimônio líquido</div><div class="v">${brl(c + i)}</div><div class="s">dinheiro disponível ${brl(c)} + investimentos ${brl(i)}</div></div>`;
}
