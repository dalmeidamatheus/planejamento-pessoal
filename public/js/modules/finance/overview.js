"use strict";
function finGeral() {
  const ym = ui.fin.ym, T = totals(ym), cur = curYm();
  const rows = [];
  for (let i = 5; i >= 0; i--) {
    const m = addM(ym, -i), x = totals(m);
    rows.push({ l: ymShort(m), a: x.in, b: x.out });
  }
  const byCat = {};
  T.L.filter((t) => t.type === "out").forEach((t) => byCat[t.cat] = (byCat[t.cat] || 0) + t.amount);
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
   <div class="card stat"><div class="l">Patrimônio líquido</div><div class="v">${brl(netWorth(todayStr()))}</div><div class="s">Caixa + investimentos</div></div></div>
  <div class="cols c21" style="margin-bottom:14px"><div class="card"><div class="hd"><h2>Fluxo de caixa</h2><div class="row sm muted"><span class="dot" style="--c:#3f8f6b"></span>Entradas <span class="dot" style="--c:#c8644f"></span>Saídas</div></div>${barsChart(rows)}</div>
   <div class="card"><div class="hd"><h2>Despesas por categoria</h2></div>${donut(cats)}</div></div>
  <div class="cols c21"><div class="card"><div class="hd"><h2>Evolução patrimonial</h2><span class="muted sm">12 meses</span></div>${lineChart(nw)}</div>
   <div class="card"><div class="hd"><h2>Próximos vencimentos</h2></div>${up.length ? `<div class="list">${up.map((t) => `<div class="it" data-act="openTx" data-id="${t.id}"><div class="grow"><div>${esc(t.desc)}</div><div class="muted sm">${fmtDayL(t.date)}${t.cardId ? " · " + esc(cardOf(t.cardId)?.name || "") : ""}</div></div><div class="num">${brl(t.amount)}</div>${stat(t) === "overdue" ? '<span class="pill bad">Atrasado</span>' : ""}</div>`).join("")}</div>` : '<div class="empty">Nada pendente 🎉</div>'}</div></div>`;
}
