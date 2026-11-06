"use strict";
const CATS_OUT = ["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Assinaturas", "Compras", "Impostos", "Investimentos", "Viagens", "Outros"];
const CATS_IN = ["Salário", "Freela", "Rendimentos", "Reembolso", "Outros"];
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
  const now = at ? wd(at) : wd(todayStr());
  if (!at && a.manual != null && a.manual !== "") return +a.manual;
  return (a.contribs || []).reduce((s, c) => {
    if (wd(c.date) > now) return s;
    const y = (now - wd(c.date)) / (365.25 * 864e5);
    return s + c.amount * Math.pow(1 + (a.rate || 0) / 100, y);
  }, 0);
}
const assetInv = (a, at) => (a.contribs || []).filter((c) => !at || c.date <= at).reduce((s, c) => s + c.amount, 0);
function netWorth(at) {
  const cash = (S.settings.opening || 0) + S.tx.filter((t) => t.status === "paid" && t.date <= at).reduce((s, t) => s + (t.type === "in" ? t.amount : -t.amount), 0);
  const inv = S.assets.reduce((s, a) => s + assetVal(a, at), 0);
  return cash + inv;
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
