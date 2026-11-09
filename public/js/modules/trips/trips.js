"use strict";
ui.trip = { status: "all", q: "" };
const tripMatch = (t) => {
  const f = ui.trip, q = norm(f.q), left = tripCalc(t).left;
  return (f.status === "all" || f.status === "next" && (left == null || left >= 0) || f.status === "past" && left != null && left < 0) && (!q || norm(t.name + " " + (t.dest || "")).includes(q));
};
function tripFilters() {
  const f = ui.trip;
  return `<div class="seg">${[["all", "Todas"], ["next", "Próximas"], ["past", "Passadas"]].map(([k, n]) => `<button class="${f.status === k ? "on" : ""}" data-act="tripStatus" data-s="${k}">${n}</button>`).join("")}</div><input type="text" style="width:250px" placeholder="Buscar viagem ou destino…" value="${esc(f.q)}" data-in="tripQ">`;
}
ACT.tripStatus = (el) => {
  ui.trip.status = el.dataset.s;
  render();
};
INP.tripQ = (el) => {
  ui.trip.q = el.value;
  renderKeep(el);
};
const TRIP_CATS = [["passagem", "Passagens", "✈️", "#2563eb"], ["hospedagem", "Hospedagem", "🏨", "#8b5cf6"], ["alimentacao", "Alimentação", "🍽️", "#f59e0b"], ["transporte", "Transporte local", "🚕", "#06b6d4"], ["passeios", "Passeios e ingressos", "🎟️", "#16a34a"], ["compras", "Compras", "🛍️", "#ec4899"], ["seguro", "Seguro e documentos", "🛂", "#d97706"], ["outros", "Outros", "📦", "#64748b"]];
const TRIP_MULT = { fixo: "valor fixo", pessoa: "por pessoa", dia: "por dia", pessoa_dia: "por pessoa/dia" };
const tripCat = (k) => TRIP_CATS.find((c) => c[0] === k) || TRIP_CATS[7];
function tripCalc(t) {
  const days = t.start && t.end ? Math.max(1, Math.round((wd(t.end) - wd(t.start)) / 864e5) + 1) : 1, people = Math.max(1, +t.people || 1);
  const mult = { fixo: 1, pessoa: people, dia: days, pessoa_dia: people * days };
  const items = (t.items || []).map((i) => ({ ...i, total: i.amount * (mult[i.mult] || 1) }));
  const total = items.reduce((s, i) => s + i.total, 0), saved = (t.deposits || []).reduce((s, d) => s + d.amount, 0), remaining = Math.max(0, total - saved);
  const left = t.start ? Math.ceil((wd(t.start) - wd(todayStr())) / 864e5) : null;
  const months = left == null ? 1 : Math.max(1, Math.ceil(left / 30.44));
  return { days, people, items, total, saved, remaining, left, months, perMonth: left != null && left < 0 ? 0 : remaining / months, pct: total ? Math.min(100, saved / total * 100) : 0 };
}
const leftLabel = (c) => c.left == null ? "" : c.left > 1 ? `faltam ${c.left} dias` : c.left === 1 ? "é amanhã!" : c.left === 0 ? "é hoje! ✈️" : "já passou";
function tripCard(t) {
  const c = tripCalc(t), sal = salaryRef();
  return `<div class="tbox" data-act="openTrip" data-id="${t.id}">
   <div class="row"><span class="temoji">${esc(t.emoji || "✈️")}</span><div class="grow"><div class="wt">${esc(t.name)}</div><div class="muted sm">${esc(t.dest || "")}${t.start ? ` · ${fmtDay(t.start)}${t.end ? "–" + fmtDay(t.end) : ""}/${t.start.slice(2, 4)}` : ""}</div></div>${c.left != null ? `<span class="pill ${c.left < 0 ? "" : "blue"}">${leftLabel(c)}</span>` : ""}</div>
   <div class="row" style="margin-top:12px;justify-content:space-between"><span><b style="font-size:18px">${brl(c.saved)}</b> <span class="muted sm">de ${brl(c.total)}</span></span><b>${c.pct.toFixed(0)}%</b></div>
   <div class="bar-t" style="margin:6px 0 10px"><i style="width:${c.pct}%"></i></div>
   ${c.remaining > 5e-3 ? c.left != null && c.left < 0 ? `<div class="sm muted">Faltou ${brl(c.remaining)}</div>` : `<div class="sm">Separe <b>${brl(c.perMonth)}/mês</b> por ${c.months} ${c.months > 1 ? "meses" : "mês"}${sal ? ` · ${fmtPct(pctOf(c.perMonth))} do salário` : ""}</div>` : '<div class="sm pos"><b>✓ Caixinha completa!</b></div>'}</div>`;
}
VIEWS.trips = () => {
  const T = S.trips, calc = T.map(tripCalc), active = calc.filter((c) => c.left == null || c.left >= 0);
  const perMonth = active.reduce((s, c) => s + c.perMonth, 0), saved = calc.reduce((s, c) => s + c.saved, 0), total = calc.reduce((s, c) => s + c.total, 0);
  const order = [...T].filter(tripMatch).sort((a, b) => (a.start || "9").localeCompare(b.start || "9"));
  return `<div class="cols c3" style="margin-bottom:14px">
   <div class="card stat"><div class="l">Planejado em viagens</div><div class="v">${brl(total)}</div><div class="s">${T.length} caixinha(s)</div></div>
   <div class="card stat"><div class="l">Já guardado</div><div class="v pos">${brl(saved)}</div><div class="s">${total ? (saved / total * 100).toFixed(0) : 0}% do planejado</div></div>
   <div class="card stat"><div class="l">Separar por mês (todas)</div><div class="v">${brl(perMonth)}</div><div class="s">${salaryRef() ? fmtPct(pctOf(perMonth)) + " do salário" : "informe sua renda em Ajustes"}</div></div></div>
  <div class="toolbar">${tripFilters()}<div class="grow"></div><button class="btn primary" data-act="newTrip">${ic("plus")}Caixinha de viagem</button></div>
  ${order.length ? `<div class="tgrid">${order.map(tripCard).join("")}</div>` : `<div class="card"><div class="empty">Nenhuma viagem planejada.<br><br><button class="btn primary" data-act="newTrip">${ic("plus")}Planejar primeira viagem</button></div></div>`}`;
};
