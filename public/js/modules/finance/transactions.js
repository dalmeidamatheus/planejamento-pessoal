"use strict";
const TX_PERIODS = [["month", "Mês"], ["3m", "3 meses"], ["6m", "6 meses"], ["12m", "12 meses"], ["year", "Ano"], ["all", "Tudo"], ["range", "Período"]];
const TX_SORTS = [["date_desc", "Mais recentes"], ["date_asc", "Mais antigas"], ["val_desc", "Maior valor"], ["val_asc", "Menor valor"], ["desc_az", "Descrição A–Z"]];
const TX_GROUPS = [["cat", "Categoria"], ["sub", "Subcategoria"], ["desc", "Descrição (onde)"], ["method", "Forma de pagamento"], ["card", "Cartão"], ["month", "Mês"], ["status", "Status"]];
ui.fin.f = Object.assign({ period: "month", from: "", to: "", type: "", status: "", cat: "", sub: "", method: "", card: "", q: "", min: "", max: "", sort: "date_desc", view: "list", group: "cat", limit: 100 }, ui.fin.f);

function txMonths() {
  const f = ui.fin.f, cur = curYm();
  let a, b;
  if (f.period === "month") a = b = ui.fin.ym;
  else if (f.period === "3m") [a, b] = [addM(cur, -2), cur];
  else if (f.period === "6m") [a, b] = [addM(cur, -5), cur];
  else if (f.period === "12m") [a, b] = [addM(cur, -11), cur];
  else if (f.period === "year") [a, b] = [cur.slice(0, 4) + "-01", cur.slice(0, 4) + "-12"];
  else if (f.period === "range") {
    a = (f.from || "").slice(0, 7) || cur;
    b = (f.to || "").slice(0, 7) || cur;
    if (a > b) [a, b] = [b, a];
  } else {
    a = [...S.tx.map((t) => t.date.slice(0, 7)), ...S.recur.map((r) => r.start.slice(0, 7)), cur].sort()[0];
    b = [...S.tx.map((t) => t.date.slice(0, 7)), cur].sort().pop();
  }
  const out = [];
  for (let m = a, n = 0; m <= b && n < 240; m = addM(m, 1), n++) out.push(m);
  return out;
}
function txFiltered() {
  const f = ui.fin.f, q = norm(f.q), min = f.min === "" ? null : +f.min, max = f.max === "" ? null : +f.max;
  const L = txMonths().flatMap(monthTx).filter((t) => (!f.type || t.type === f.type) && (!f.status || stat(t) === f.status) && (!f.cat || t.cat === f.cat) && (!f.sub || t.sub === f.sub) && (!f.method || t.method === f.method) && (!f.card || (f.card === "none" ? !t.cardId : t.cardId === f.card)) && (min == null || t.amount >= min) && (max == null || t.amount <= max) && (f.period !== "range" || (!f.from || t.date >= f.from) && (!f.to || t.date <= f.to)) && (!q || norm(t.desc + " " + t.cat + " " + (t.sub || "")).includes(q)));
  const sorters = { date_desc: (a, b) => b.date.localeCompare(a.date), date_asc: (a, b) => a.date.localeCompare(b.date), val_desc: (a, b) => b.amount - a.amount, val_asc: (a, b) => a.amount - b.amount, desc_az: (a, b) => a.desc.localeCompare(b.desc, "pt-BR") };
  return L.sort(sorters[f.sort] || sorters.date_desc);
}
function txSummary(L) {
  const inn = L.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0), out = L.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);
  const pend = L.filter((t) => t.status !== "paid").reduce((s, t) => s + (t.type === "in" ? t.amount : -t.amount), 0);
  return { n: L.length, inn, out, net: inn - out, pend };
}
function txGroupKey(t, g) {
  if (g === "cat") return { k: t.cat, l: t.cat };
  if (g === "sub") return { k: t.sub || "", l: t.sub || "(sem subcategoria)" };
  if (g === "desc") return { k: t.desc.trim().toLowerCase(), l: t.desc.trim() };
  if (g === "method") return { k: t.method, l: METHODS[t.method] || "—" };
  if (g === "card") return { k: t.cardId || "none", l: cardOf(t.cardId)?.name || "Sem cartão" };
  if (g === "month") return { k: t.date.slice(0, 7), l: ymLabel(t.date.slice(0, 7)) };
  return { k: stat(t), l: STAT[stat(t)][0] };
}
function txGroups(L) {
  const g = ui.fin.f.group, m = new Map();
  L.forEach((t) => {
    const { k, l } = txGroupKey(t, g), x = m.get(k) || { k, l, n: 0, inn: 0, out: 0 };
    x.n++;
    if (t.type === "in") x.inn += t.amount;
    else x.out += t.amount;
    m.set(k, x);
  });
  const arr = [...m.values()];
  return g === "month" ? arr.sort((a, b) => b.k.localeCompare(a.k)) : arr.sort((a, b) => b.out - a.out || b.inn - a.inn);
}
function txRow(t) {
  const s = stat(t), c = t.cardId ? cardOf(t.cardId) : null;
  return `<tr class="cl" data-act="openTx" data-id="${t.id}"><td class="muted">${fmtDay(t.date)}/${t.date.slice(2, 4)}</td><td>${esc(t.desc)} ${t.of > 1 ? `<span class="pill">${t.no}/${t.of}</span>` : ""}${t.virtual || t.tpl ? `<span class="muted" title="Recorrente">${ic("repeat", 12)}</span>` : ""}</td>
    <td><span class="dot" style="--c:${catColor(t.cat)}"></span> ${esc(t.cat)}${t.sub ? `<span class="muted sm"> · ${esc(t.sub)}</span>` : ""}</td><td class="muted">${METHODS[t.method] || "—"}${c ? " · " + esc(c.name) : ""}</td>
    <td class="num ${t.type === "in" ? "pos" : ""}">${t.type === "in" ? "+" : "−"} ${brl(t.amount)}</td><td><span class="pill ${STAT[s][1]}">${STAT[s][0]}</span></td>
    <td class="num"><button class="btn sm ghost" data-act="txPay" data-id="${t.id}" title="${s === "paid" ? "Marcar como pendente" : "Marcar como pago"}">${ic("check", 14)}</button></td></tr>`;
}
function txRows() {
  const L = txFiltered(), f = ui.fin.f, S0 = txSummary(L);
  const cards = `<div class="cols c4" style="margin-bottom:12px">
   <div class="card stat"><div class="l">Lançamentos</div><div class="v">${S0.n}</div><div class="s">${S0.pend ? "pendente: " + signBrl(S0.pend) : "tudo liquidado"}</div></div>
   <div class="card stat"><div class="l">Entradas</div><div class="v pos">${brl(S0.inn)}</div></div>
   <div class="card stat"><div class="l">Saídas</div><div class="v neg">${brl(S0.out)}</div></div>
   <div class="card stat"><div class="l">Saldo do filtro</div><div class="v ${signCls(S0.net)}">${signBrl(S0.net)}</div></div></div>`;
  if (!L.length) return cards + `<div class="card"><div class="empty">Nenhuma transação neste filtro.</div></div>`;
  if (f.view === "group") {
    const G = txGroups(L), tot = f.type === "in" ? S0.inn : S0.out;
    return cards + `<div class="card" style="padding:6px 10px"><table class="tb"><thead><tr><th>${TX_GROUPS.find((x) => x[0] === f.group)[1]}</th><th class="num">Lanç.</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Saldo</th><th style="width:26%">Participação</th></tr></thead><tbody>${G.map((g) => {
      const val = f.type === "in" ? g.inn : g.out, p = tot ? Math.min(100, val / tot * 100) : 0;
      return `<tr class="cl" data-act="txDrill" data-k="${esc(g.k)}" title="Ver os lançamentos"><td>${esc(g.l)}</td><td class="num muted">${g.n}</td><td class="num ${g.inn ? "pos" : "muted"}">${g.inn ? brl(g.inn) : "—"}</td><td class="num">${g.out ? brl(g.out) : "—"}</td><td class="num ${signCls(g.inn - g.out)}">${signBrl(g.inn - g.out)}</td><td><div class="row"><div class="bar-t grow"><i style="width:${p}%"></i></div><span class="sm muted" style="width:38px;text-align:right">${p.toFixed(0)}%</span></div></td></tr>`;
    }).join("")}</tbody></table></div>`;
  }
  const shown = L.slice(0, f.limit);
  return cards + `<div class="card" style="padding:6px 10px"><table class="tb"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th class="num">Valor</th><th>Status</th><th></th></tr></thead><tbody>${shown.map(txRow).join("")}</tbody></table>${L.length > shown.length ? `<div style="text-align:center;padding:10px"><button class="btn" data-act="txMore">Mostrar mais (${L.length - shown.length} restantes)</button></div>` : ""}</div>`;
}
