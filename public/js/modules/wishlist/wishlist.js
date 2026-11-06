"use strict";
ui.wish = { status: "want", sort: "prio" };
const PORD = { alta: 0, media: 1, baixa: 2 };
function wishCard(it) {
  const p = curPrice(it), ch = priceChange(it), fin = financing(it, p), pct = pctOf(p);
  const recent = ch && (wd(todayStr()) - wd(ch.d)) / 864e5 <= 14;
  return `<div class="wcard ${it.bought ? "bought" : ""}" data-act="openWish" data-id="${it.id}">
   <div class="wimg">🎁${it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</div>
   <div class="wbody"><div class="row"><span class="wt grow">${esc(it.name)}</span>${it.prio ? `<span class="pill ${PRIO[it.prio].c}">${PRIO[it.prio].n}</span>` : ""}</div>
    <div class="wp">${brl(p)}${ch ? `<span class="pill ${ch.pct < 0 ? "ok" : "bad"}">${ch.pct < 0 ? "▼" : "▲"} ${Math.abs(ch.pct).toFixed(1).replace(".", ",")}%</span>` : ""}</div>
    <div class="muted sm">${pct != null ? `${fmtPct(pct)} do salário` : "Defina sua renda em Ajustes"}${fin.n > 1 ? ` · ${fin.n}× ${brl(fin.parcela)}${fin.taxa ? ` (juros ${String(fin.taxa).replace(".", ",")}% a.m.)` : " sem juros"}` : ""}</div>
    <div class="row wrap" style="gap:4px">${it.monitor ? '<span class="pill blue">👁 monitorando</span>' : ""}${it.target > 0 ? `<span class="pill ${p <= it.target ? "ok" : ""}">🎯 ${brl(it.target)}</span>` : ""}${recent && ch.pct < 0 ? '<span class="pill ok">🏷️ em queda</span>' : ""}${it.bought ? '<span class="pill">comprado</span>' : ""}${hostOf(it.url) ? `<span class="pill">${ic("link", 11)} ${esc(hostOf(it.url))}</span>` : ""}</div></div></div>`;
}
VIEWS.wishlist = () => {
  const f = ui.wish, sal = salaryRef();
  const sorters = { prio: (a, b) => (PORD[a.prio] ?? 1) - (PORD[b.prio] ?? 1) || curPrice(a) - curPrice(b), cheap: (a, b) => curPrice(a) - curPrice(b), exp: (a, b) => curPrice(b) - curPrice(a), drop: (a, b) => (priceChange(a)?.pct || 0) - (priceChange(b)?.pct || 0) };
  const L = S.wishlist.filter((i) => f.status === "all" || (i.bought ? "bought" : "want") === f.status).sort(sorters[f.sort] || sorters.prio);
  const want = S.wishlist.filter((i) => !i.bought), tot = want.reduce((s, i) => s + curPrice(i), 0);
  const drops = want.filter((i) => {
    const c = priceChange(i);
    return c && c.pct < 0 && (wd(todayStr()) - wd(c.d)) / 864e5 <= 14;
  }).length;
  const mon = want.filter((i) => i.monitor && i.url).length;
  return `<div class="cols c4" style="margin-bottom:14px">
   <div class="card stat"><div class="l">Total desejado (à vista)</div><div class="v">${brl(tot)}</div><div class="s">${want.length} item(ns)</div></div>
   <div class="card stat"><div class="l">Equivale a</div><div class="v">${sal ? (tot / sal).toFixed(1).replace(".", ",") : "—"}</div><div class="s">${sal ? "salários mensais (" + brl(sal) + ")" : "informe sua renda em Ajustes"}</div></div>
   <div class="card stat"><div class="l">Preços em queda (14 dias)</div><div class="v ${drops ? "pos" : ""}">${drops}</div></div>
   <div class="card stat"><div class="l">Monitorando</div><div class="v">${mon}</div><div class="s">verificação diária no servidor</div></div></div>
  <div class="toolbar"><div class="seg">${[["want", "Desejos"], ["bought", "Comprados"], ["all", "Todos"]].map(([k, n]) => `<button class="${f.status === k ? "on" : ""}" data-act="wishStatus" data-s="${k}">${n}</button>`).join("")}</div>
   <select style="width:190px" data-ch="wishSort"><option value="prio" ${f.sort === "prio" ? "selected" : ""}>Ordenar: prioridade</option><option value="cheap" ${f.sort === "cheap" ? "selected" : ""}>Mais barato</option><option value="exp" ${f.sort === "exp" ? "selected" : ""}>Mais caro (maior % do salário)</option><option value="drop" ${f.sort === "drop" ? "selected" : ""}>Maior queda de preço</option></select>
   <div class="grow"></div>${mon ? `<button class="btn" data-act="wishCheckAll">Verificar preços agora</button>` : ""}<button class="btn primary" data-act="newWish">${ic("plus")}Item</button></div>
  ${L.length ? `<div class="wgrid">${L.map(wishCard).join("")}</div>` : `<div class="card"><div class="empty">${S.wishlist.length ? "Nada neste filtro." : 'Sua lista está vazia.<br><br><button class="btn primary" data-act="newWish">' + ic("plus") + "Adicionar o primeiro item</button>"}</div></div>`}`;
};
ACT.wishStatus = (el) => {
  ui.wish.status = el.dataset.s;
  render();
};
INP.wishSort = (el) => {
  ui.wish.sort = el.value;
  render();
};
