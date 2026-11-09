"use strict";
let dTrip = null;
ACT.newTrip = () => openTripForm(null);
ACT.openTrip = (el) => openTrip(el.dataset.id);
ACT.tripEdit = (el) => openTripForm(el.dataset.id);
function openTrip(id) {
  const t = S.trips.find((x) => x.id === id);
  if (!t) return;
  dTrip = id;
  const c = tripCalc(t), sal = salaryRef();
  const byCat = {};
  c.items.forEach((i) => byCat[i.cat] = (byCat[i.cat] || 0) + i.total);
  const slices = Object.entries(byCat).filter((x) => x[1] > 0).map(([k, v]) => ({ l: tripCat(k)[2] + " " + tripCat(k)[1], v, c: tripCat(k)[3] }));
  modal(`<div class="row" style="margin-bottom:2px"><span class="temoji">${esc(t.emoji || "✈️")}</span><h2 class="grow" style="margin:0">${esc(t.name)}</h2>${c.left != null ? `<span class="pill blue">${leftLabel(c)}</span>` : ""}</div>
   <div class="muted sm" style="margin-bottom:12px">${esc(t.dest || "")}${t.start ? ` · ${fmtDay(t.start)}/${t.start.slice(0, 4)}${t.end ? " a " + fmtDay(t.end) + "/" + t.end.slice(0, 4) : ""}` : ""} · ${c.people} pessoa(s) · ${c.days} dia(s)</div>
   <div class="cols c3" style="gap:8px;margin-bottom:10px">
    <div class="card flat stat" style="padding:10px"><div class="l">Orçamento total</div><div class="v" style="font-size:18px">${brl(c.total)}</div><div class="s">${brl(c.total / c.people)} por pessoa</div></div>
    <div class="card flat stat" style="padding:10px"><div class="l">Guardado</div><div class="v pos" style="font-size:18px">${brl(c.saved)}</div><div class="s">faltam ${brl(c.remaining)}</div></div>
    <div class="card flat stat" style="padding:10px"><div class="l">Separar por mês</div><div class="v" style="font-size:18px">${brl(c.perMonth)}</div><div class="s">${c.remaining > 5e-3 ? `${c.months} ${c.months > 1 ? "meses" : "mês"}${sal ? " · " + fmtPct(pctOf(c.perMonth)) + " do salário" : ""} · ${brl(c.perMonth / 4.345)}/semana` : "completo ✓"}</div></div></div>
   <div class="bar-t" style="margin-bottom:14px"><i style="width:${c.pct}%"></i></div>
   ${slices.length ? `<div style="margin-bottom:14px">${donut(slices, { size: 130 })}</div>` : ""}
   <div class="hd" style="display:flex;justify-content:space-between;margin-bottom:6px"><h2>Orçamento</h2></div>
   ${c.items.length ? `<table class="tb"><tbody>${c.items.map((i) => `<tr><td>${tripCat(i.cat)[2]} ${esc(i.name)}<div class="muted sm">${brl(i.amount)} ${TRIP_MULT[i.mult]}</div></td><td class="num">${brl(i.total)}</td><td class="num"><button class="btn sm ghost" data-act="tripItemDel" data-id="${i.id}">${ic("x", 13)}</button></td></tr>`).join("")}</tbody></table>` : '<div class="empty" style="padding:10px">Adicione os custos previstos abaixo.</div>'}
   <form data-form="tripItem" class="row" style="margin:8px 0 14px;flex-wrap:wrap"><input type="text" name="n" placeholder="Ex.: Passagem aérea" required style="flex:2;min-width:180px"><select name="cat" style="flex:1;min-width:170px">${TRIP_CATS.map((x) => `<option value="${x[0]}">${x[2]} ${x[1]}</option>`).join("")}</select><input type="number" step="0.01" min="0.01" name="a" placeholder="R$" required style="width:90px"><select name="m" style="width:130px">${Object.entries(TRIP_MULT).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select><button class="btn">${ic("plus")}</button></form>
   <div class="hd" style="display:flex;justify-content:space-between;margin-bottom:6px"><h2>Depósitos na caixinha</h2></div>
   ${(t.deposits || []).length ? `<div class="list">${[...t.deposits].sort((a, b) => b.date.localeCompare(a.date)).map((d) => `<div class="it" style="cursor:default"><span class="muted sm" style="width:64px">${fmtDay(d.date)}/${d.date.slice(2, 4)}</span><span class="grow">${brl(d.amount)}</span><button class="btn sm ghost" data-act="tripDepDel" data-id="${d.id}">${ic("x", 13)}</button></div>`).join("")}</div>` : ""}
   <form data-form="tripDep" class="row" style="margin:8px 0;flex-wrap:wrap"><input type="number" step="0.01" min="0.01" name="a" placeholder="Valor a guardar" required value="${c.remaining > 5e-3 ? Math.round(c.perMonth * 100) / 100 : ""}" style="width:150px"><input type="date" name="d" value="${todayStr()}" style="width:150px"><label class="row sm"><input type="checkbox" name="tx" checked> lançar como saída (Viagens)</label><button class="btn primary">Guardar</button></form>
   ${t.notes ? `<div class="sm" style="white-space:pre-wrap;margin-top:6px">${esc(t.notes)}</div>` : ""}
   <div class="foot" style="justify-content:flex-start;flex-wrap:wrap">${t.start ? `<button class="btn" data-act="tripCal">${ic("calendar")}${t.eventId && S.events.some((e) => e.id === t.eventId) ? "Atualizar no calendário" : "Pôr no calendário"}</button>` : ""}<span class="grow"></span><button class="btn" data-act="tripEdit" data-id="${t.id}">Editar</button><button class="btn danger" data-act="tripDel">${ic("trash")}</button></div>`, { wide: true });
}
SUBMIT.tripItem = (f, fd) => {
  const t = S.trips.find((x) => x.id === dTrip);
  (t.items || (t.items = [])).push({ id: uid(), name: fd.get("n").trim(), cat: fd.get("cat"), amount: R2(+fd.get("a")), mult: fd.get("m") });
  save();
  openTrip(dTrip);
  render();
};
ACT.tripItemDel = (el) => {
  const t = S.trips.find((x) => x.id === dTrip);
  t.items = t.items.filter((i) => i.id !== el.dataset.id);
  save();
  openTrip(dTrip);
  render();
};
SUBMIT.tripDep = (f, fd) => {
  const t = S.trips.find((x) => x.id === dTrip), a = R2(+fd.get("a")), d = fd.get("d");
  (t.deposits || (t.deposits = [])).push({ id: uid(), date: d, amount: a });
  if (fd.get("tx")) S.tx.push({ id: uid(), type: "out", desc: "Caixinha — " + t.name, amount: a, date: d, cat: "Viagens", sub: t.dest || "", method: "transfer", status: "paid" });
  save();
  openTrip(dTrip);
  render();
  toast(brl(a) + " guardados na caixinha 💰");
};
ACT.tripDepDel = (el) => {
  const t = S.trips.find((x) => x.id === dTrip);
  t.deposits = t.deposits.filter((d) => d.id !== el.dataset.id);
  save();
  openTrip(dTrip);
  render();
};
ACT.tripDel = () => {
  if (!confirmDlg("Excluir esta caixinha de viagem?")) return;
  const t = S.trips.find((x) => x.id === dTrip);
  if (t.eventId) S.events = S.events.filter((e) => e.id !== t.eventId);
  S.trips = S.trips.filter((x) => x.id !== dTrip);
  save();
  closeModal();
  render();
};
function tripToCal(t) {
  if (!t.start) return;
  const end = ymd(addDays(wd(t.end || t.start), 1)), o = { title: (t.emoji || "✈️") + " " + t.name, start: t.start + "T00:00", end: end + "T00:00", allDay: true, tz: dtz() };
  let e = t.eventId && S.events.find((x) => x.id === t.eventId);
  if (e) Object.assign(e, o);
  else {
    e = { id: uid(), tag: "lazer", prio: "media", rec: { freq: "none" }, ex: [], subtasks: [], links: [], notes: t.dest || "", remind: null, ...o };
    S.events.push(e);
    t.eventId = e.id;
  }
}
ACT.tripCal = () => {
  const t = S.trips.find((x) => x.id === dTrip);
  if (!t.start) return;
  tripToCal(t);
  save();
  openTrip(dTrip);
  toast("Viagem marcada no calendário");
};
function openTripForm(id) {
  const t = id ? S.trips.find((x) => x.id === id) : { name: "", dest: "", emoji: "✈️", start: "", end: "", people: 1, notes: "" };
  dTrip = id;
  modal(`<form data-form="trip"><h2>${id ? "Editar viagem" : "Nova caixinha de viagem"}</h2>
   <div class="grid2"><label class="field"><span>Nome</span><input type="text" name="name" value="${esc(t.name)}" required placeholder="Férias em Lisboa"></label><label class="field"><span>Destino</span><input type="text" name="dest" value="${esc(t.dest || "")}" placeholder="Lisboa, Portugal"></label></div>
   <div class="grid3"><label class="field"><span>Ida</span><input type="date" name="start" value="${t.start || ""}"></label><label class="field"><span>Volta</span><input type="date" name="end" value="${t.end || ""}"></label><label class="field"><span>Pessoas</span><input type="number" min="1" max="30" name="people" value="${t.people || 1}"></label></div>
   <label class="field"><span>Ícone</span><select name="emoji">${["✈️", "🏖️", "🏔️", "🏙️", "🚗", "🚢", "⛺", "🎡", "🗺️"].map((e) => `<option ${t.emoji === e ? "selected" : ""}>${e}</option>`).join("")}</select></label>
   <label class="field"><span>Notas</span><textarea name="notes" rows="2">${esc(t.notes || "")}</textarea></label>
   <div class="muted sm">A data de ida define em quantos meses você precisa juntar o dinheiro.</div>
   <div class="foot"><span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
}
SUBMIT.trip = (f, fd) => {
  const o = { name: fd.get("name").trim(), dest: fd.get("dest").trim(), start: fd.get("start"), end: fd.get("end"), people: Math.max(1, +fd.get("people") || 1), emoji: fd.get("emoji"), notes: fd.get("notes") };
  if (o.start && o.end && o.end < o.start) {
    toast("A volta precisa ser depois da ida", true);
    return;
  }
  let t;
  if (dTrip) {
    t = S.trips.find((x) => x.id === dTrip);
    Object.assign(t, o);
    if (t.eventId && S.events.some((e) => e.id === t.eventId)) tripToCal(t);
  } else {
    t = { id: uid(), items: [], deposits: [], ...o };
    S.trips.push(t);
    if (t.start) {
      tripToCal(t);
      toast("Viagem marcada no calendário");
    }
  }
  save();
  closeModal();
  render();
  openTrip(t.id);
};
