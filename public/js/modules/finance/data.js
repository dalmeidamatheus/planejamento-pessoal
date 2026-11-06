"use strict";
const CATS_OUT = ["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Assinaturas", "Compras", "Impostos", "Investimentos", "Viagens", "Outros"];
const CATS_IN = ["Salário", "Freela", "Rendimentos", "Resgate", "Reembolso", "Outros"];
const METHODS = { credit: "Cartão de crédito", pix: "Pix", debit: "Débito", boleto: "Boleto", cash: "Dinheiro", transfer: "Transferência" };
const ATYPES = { rf: "Renda fixa", acoes: "Ações", cripto: "Cripto", fii: "Fundos imobiliários", fundos: "Fundos", outro: "Outros" };
const catColor = (c) => {
  const all = [...CATS_OUT, ...CATS_IN];
  let i = all.indexOf(c);
  if (i < 0) {
    i = 0;
    for (const ch of c) i += ch.charCodeAt(0);
  }
  return PAL[i % PAL.length];
};
const cardOf = (id) => S.cards.find((c) => c.id === id);
const R2 = (n) => Math.round(n * 100) / 100;
function monthTx(ym) {
  const real = S.tx.filter((t) => t.date.slice(0, 7) === ym), virt = [];
  S.recur.forEach((r) => {
    if (r.start.slice(0, 7) > ym || r.until && r.until.slice(0, 7) < ym || (r.skip || []).includes(ym)) return;
    const md_ = (+ym.slice(0, 4) - +r.start.slice(0, 4)) * 12 + (+ym.slice(5) - +r.start.slice(5, 7));
    if (md_ % (r.every || 1)) return;
    if (S.tx.some((t) => t.tpl === r.id && t.tplYm === ym)) return;
    virt.push({ id: "v:" + r.id + ":" + ym, type: r.type, desc: r.desc, amount: r.amount, cat: r.cat, sub: r.sub, method: r.method, date: ym + "-" + pad(Math.min(r.day, daysIn(ym))), status: "pending", virtual: true, tpl: r.id, tplYm: ym });
  });
  return real.concat(virt).sort((a, b) => a.date.localeCompare(b.date));
}
const stat = (t) => t.status === "paid" ? "paid" : t.date < todayStr() ? "overdue" : "pending";
const STAT = { paid: ["Pago", "ok"], pending: ["Pendente", "warn"], overdue: ["Atrasado", "bad"] };
function totals(ym) {
  const L = monthTx(ym);
  const s = (ty, paid) => L.filter((t) => t.type === ty && (!paid || t.status === "paid")).reduce((a, t) => a + t.amount, 0);
  return { in: s("in"), out: s("out"), inP: s("in", 1), outP: s("out", 1), L };
}
function assetVal(a, at) {
  const d = at || todayStr();
  const checks = (a.checks || []).filter((c) => c.d <= d).sort((x, y) => x.d.localeCompare(y.d));
  const last = checks[checks.length - 1];
  const moved = (a.moves || []).filter((m) => m.d <= d && (!last || m.d > last.d || m.d === last.d && (m.ts || 0) > (last.ts || 0))).reduce((s2, m) => s2 + m.a, 0);
  return (last ? last.v : 0) + moved;
}
const assetInv = (a, at) => (a.moves || []).filter((m) => !at || m.d <= at).reduce((s, m) => s + m.a, 0);
function normAssets() {
  (S.assets || []).forEach((a) => {
    if (!a.checks) a.checks = [];
    if (!a.moves) a.moves = (a.contribs || []).map((c) => ({ id: uid(), d: c.date, a: c.amount }));
    if (a.manual != null && a.manual !== "" && !a.checks.length) a.checks.push({ id: uid(), d: todayStr(), v: +a.manual });
    delete a.contribs;
    delete a.manual;
    delete a.rate;
  });
}
function perfSeries(list) {
  const dates = [...new Set(list.flatMap((a) => (a.checks || []).map((c) => c.d)))].sort();
  const pts = [];
  dates.forEach((d, i) => {
    const v = list.reduce((s, a) => s + assetVal(a, d), 0);
    if (!i) {
      const inv = list.reduce((s, a) => s + assetInv(a, d), 0);
      const yld = inv > 0 ? v - inv : 0;
      pts.push({ d, v, moves: 0, yld, ret: inv > 0 ? yld / inv : 0, cost: v - yld });
      return;
    }
    const p = pts[i - 1];
    const moves = list.reduce((s, a) => s + (a.moves || []).filter((m) => m.d > p.d && m.d <= d).reduce((q, m) => q + m.a, 0), 0);
    const yld = v - p.v - moves, den = p.v + moves / 2;
    pts.push({ d, v, moves, yld, ret: den > 0 ? yld / den : 0, cost: p.cost + moves });
  });
  let cum = 0;
  pts.forEach((p) => {
    cum += p.yld;
    p.cum = cum;
  });
  return pts;
}
const moveCash = (m) => !!m.cash || !!m.tx && !S.tx.some((t) => t.id === m.tx);
function cashAvailable(at) {
  const base = (S.settings.opening || 0) + S.tx.filter((t) => t.status === "paid" && t.date <= at).reduce((s, t) => s + (t.type === "in" ? t.amount : -t.amount), 0);
  const moved = S.assets.flatMap((a) => a.moves || []).filter((m) => moveCash(m) && m.d <= at).reduce((s, m) => s + m.a, 0);
  return base - moved;
}
function investFlows() {
  const rows = [];
  S.tx.filter((t) => t.status === "paid" && (t.cat === "Investimentos" && t.type === "out" || t.cat === "Resgate" && t.type === "in")).forEach((t) => rows.push({ d: t.date, v: t.type === "out" ? -t.amount : t.amount, n: t.desc.replace(/^(Aporte|Resgate) — /, "") }));
  S.assets.forEach((a) => (a.moves || []).filter(moveCash).forEach((m) => rows.push({ d: m.d, v: -m.a, n: a.name })));
  return rows.sort((x, y) => y.d.localeCompare(x.d));
}
function invSummary(list = S.assets) {
  const all = perfSeries(list), last = all[all.length - 1];
  const value = list.reduce((s, a) => s + assetVal(a), 0);
  const cost = last ? last.cost + list.reduce((s, a) => s + (a.moves || []).filter((m) => m.d > last.d).reduce((q, m) => q + m.a, 0), 0) : list.reduce((s, a) => s + assetInv(a), 0);
  return { value, cost, yld: value - cost };
}
function netWorth(at) {
  return cashAvailable(at) + S.assets.reduce((s, a) => s + assetVal(a, at), 0);
}
const cardUsed = (c) => S.tx.filter((t) => t.cardId === c.id && t.status !== "paid").reduce((s, t) => s + t.amount, 0);
const invYm = (c, d) => +d.slice(8, 10) > c.closing ? addM(d.slice(0, 7), 1) : d.slice(0, 7);
const dueDate = (c, inv) => {
  const dm = c.due <= c.closing ? addM(inv, 1) : inv;
  return dm + "-" + pad(Math.min(c.due, daysIn(dm)));
};
const incomeEst = () => {
  const rec = S.recur.filter((r) => r.type === "in").reduce((s2, r) => s2 + r.amount / (r.every || 1), 0);
  if (rec) return rec;
  let s = 0, n = 0;
  for (let i = 1; i <= 3; i++) {
    const t = totals(addM(curYm(), -i));
    if (t.in) {
      s += t.in;
      n++;
    }
  }
  return n ? s / n : 0;
};
