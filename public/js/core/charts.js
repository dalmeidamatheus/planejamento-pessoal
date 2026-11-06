"use strict";
const PAL = ["#3b6fd4", "#2f9e6b", "#d9822b", "#7b61b8", "#c8644f", "#4a9bb0", "#a8893a", "#8c8a82", "#b0587f", "#5f7a3a"];
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
const short = (v) => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1).replace(".0", "") + "M" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(1).replace(".0", "") + "k" : String(Math.round(v));
function barsChart(rows, { h = 210, series = [{ k: "a", c: "#3f8f6b", n: "Entradas" }, { k: "b", c: "#c8644f", n: "Saídas" }] } = {}) {
  const W = 620, L = 44, B = 24, T = 8, ch = h - B - T, max = niceMax(Math.max(1, ...rows.flatMap((r) => series.map((s) => r[s.k] || 0))));
  const gw = (W - L) / rows.length, bw = Math.min(22, (gw - 10) / series.length);
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const y = T + ch - ch * i / 4;
    g += `<line x1="${L}" x2="${W}" y1="${y}" y2="${y}" stroke="#efede7"/><text x="${L - 6}" y="${y + 3}" font-size="10" fill="#97938a" text-anchor="end">${short(max * i / 4)}</text>`;
  }
  rows.forEach((r, i) => {
    const cx = L + gw * i + gw / 2;
    const tip = `<b>${esc(r.l)}</b><br>` + series.map((s) => `${s.n}: ${brl(r[s.k])}`).join("<br>");
    g += `<g data-tip="${esc(tip)}"><rect x="${L + gw * i}" y="${T}" width="${gw}" height="${ch}" fill="transparent"/>`;
    series.forEach((s, j) => {
      const v = r[s.k] || 0, bh = ch * v / max, x = cx - bw * series.length / 2 + bw * j;
      g += `<rect x="${x + 1}" y="${T + ch - bh}" width="${bw - 2}" height="${Math.max(bh, 0)}" rx="2" fill="${s.c}" opacity=".9"><animate attributeName="height" from="0" to="${Math.max(bh, 0)}" dur=".35s"/><animate attributeName="y" from="${T + ch}" to="${T + ch - bh}" dur=".35s"/></rect>`;
    });
    g += `<text x="${cx}" y="${h - 7}" font-size="10.5" fill="#5d5a53" text-anchor="middle">${esc(r.l)}</text></g>`;
  });
  return `<svg class="chartbox" viewBox="0 0 ${W} ${h}">${g}</svg>`;
}
function donut(items, { size = 170 } = {}) {
  const tot = items.reduce((a, b) => a + b.v, 0);
  if (!tot) return `<div class="empty">Sem dados no período</div>`;
  const r = 62, C = 2 * Math.PI * r;
  let off = 0, seg = "";
  items.forEach((it) => {
    const f = it.v / tot, len = C * f;
    seg += `<circle cx="85" cy="85" r="${r}" fill="none" stroke="${it.c}" stroke-width="22" stroke-dasharray="${Math.max(len - 1.5, 0)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 85 85)" data-tip="${esc(it.l)}: ${brl(it.v)} (${(f * 100).toFixed(0)}%)"/>`;
    off += len;
  });
  return `<div class="row" style="gap:18px;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 170 170" width="${size}" height="${size}">${seg}<text x="85" y="82" text-anchor="middle" font-size="10" fill="#97938a">Total</text><text x="85" y="98" text-anchor="middle" font-size="13" font-weight="600" fill="#1d1c1a">${short(tot)}</text></svg>
  <div class="legend">${items.map((it) => `<div><span class="dot" style="--c:${it.c}"></span>${esc(it.l)}<b>${brl(it.v)}</b></div>`).join("")}</div></div>`;
}
function lineChart(rows, { h = 200, c = "#3b6fd4", zero = true, step = false, fmt = short } = {}) {
  const W = 620, L = 56, B = 24, T = 10, ch = h - B - T, vals = rows.map((r) => r.v);
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (zero) {
    mn = Math.min(0, mn);
    mx = Math.max(1, mx);
  } else {
    const pad = (mx - mn) * 0.25 || Math.abs(mx) * 0.05 || 1;
    mn -= pad;
    mx += pad;
  }
  if (mx === mn) mx = mn + 1;
  const x = (i) => L + (W - L - 14) * (rows.length < 2 ? 0.5 : i / (rows.length - 1)), y = (v) => T + ch - ch * (v - mn) / (mx - mn), base = zero ? y(Math.max(mn, 0)) : T + ch;
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const v = mn + (mx - mn) * i / 4, yy = y(v);
    g += `<line x1="${L}" x2="${W}" y1="${yy}" y2="${yy}" stroke="#efede7"/><text x="${L - 6}" y="${yy + 3}" font-size="10" fill="#97938a" text-anchor="end">${fmt(v)}</text>`;
  }
  const line = step ? rows.map((r, i) => i ? `H${x(i)} V${y(r.v)}` : `M${x(0)},${y(r.v)}`).join(" ") : "M" + rows.map((r, i) => `${x(i)},${y(r.v)}`).join(" L");
  g += `<path d="${line} V${base} H${x(0)} Z" fill="${c}" opacity=".08"/><path d="${line}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;
  const every = Math.ceil(rows.length / 8);
  rows.forEach((r, i) => {
    g += `<circle cx="${x(i)}" cy="${y(r.v)}" r="4.5" fill="#fff" stroke="${c}" stroke-width="2" data-tip="<b>${esc(r.l)}</b><br>${r.t || brl(r.v)}"/>${i % every === 0 || i === rows.length - 1 ? `<text x="${x(i)}" y="${h - 7}" font-size="10.5" fill="#5d5a53" text-anchor="middle">${esc(r.l)}</text>` : ""}`;
  });
  return `<svg class="chartbox" viewBox="0 0 ${W} ${h}">${g}</svg>`;
}
