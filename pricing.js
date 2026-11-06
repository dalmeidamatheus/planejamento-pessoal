"use strict";
const watchRows = {};
const salaryRef = () => S.settings.salary || incomeEst();
function pmt(price, n, ratePct) {
  n = Math.max(1, Math.round(n) || 1);
  const i = (+ratePct || 0) / 100;
  if (n === 1) return price;
  if (!i) return price / n;
  return price * i / (1 - Math.pow(1 + i, -n));
}
function financing(it, price = curPrice(it)) {
  const n = Math.max(1, +it.inst || 1), parcela = pmt(price, n, it.rate), total = parcela * n;
  return { n, parcela, total, juros: Math.max(0, total - price), taxa: +it.rate || 0 };
}
function priceHist(it) {
  const m = new Map();
  [...it.hist || [], ...(watchRows[it.id] || {}).history || []].sort((a, b) => a.d.localeCompare(b.d)).forEach((x) => m.set(x.d, +x.p));
  const out = [];
  [...m.entries()].forEach(([d, p]) => {
    if (!out.length || out[out.length - 1].p !== p) out.push({ d, p });
  });
  return out;
}
const curPrice = (it) => {
  const h = priceHist(it);
  return h.length ? h[h.length - 1].p : +it.price || 0;
};
function addPoint(it, price) {
  price = R2(price);
  const h = priceHist(it);
  if (!h.length || h[h.length - 1].p !== price) (it.hist || (it.hist = [])).push({ d: todayStr(), p: price });
  it.price = price;
}
function priceChange(it) {
  const h = priceHist(it);
  if (h.length < 2) return null;
  const a = h[h.length - 2].p, b = h[h.length - 1].p;
  return { pct: (b - a) / a * 100, from: a, to: b, d: h[h.length - 1].d, min: Math.min(...h.map((x) => x.p)), max: Math.max(...h.map((x) => x.p)) };
}
const monthsUntil = (date) => Math.max(1, Math.ceil((wd(date) - wd(todayStr())) / 864e5 / 30.44));
const pctOf = (v) => {
  const s = salaryRef();
  return s > 0 ? v / s * 100 : null;
};
const fmtPct = (p) => p == null ? "—" : (p < 10 ? p.toFixed(1).replace(".", ",") : String(Math.round(p))) + "%";
const signedPct = (p) => (p > 0 ? "+" : "") + p.toFixed(1).replace(".", ",") + "%";
const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
