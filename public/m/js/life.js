"use strict";
/* Mais: menu, hábitos, desejos, viagens, aniversários e ajustes */
MV.more = () => `<div class="usercard"><span class="av">${esc((user.email || "?")[0])}</span><div class="grow"><b class="ell">${esc(user.email)}</b><div class="sm muted"><span id="sync2">${sb ? "Sincronizado com a nuvem" : "Salvo neste aparelho"}</span></div></div></div>
  <div class="menu-list">${[["finance", "💰", "Finanças", "Lançamentos, cartões e investimentos"], ["habits", "🔥", "Hábitos", "Sequências e consistência"], ["wish", "🎁", "Desejos", "Lista de compras e preços"], ["trips", "✈️", "Viagens", "Caixinhas e planejamento"]].map(([v, e, n, d]) => `<a class="mi" href="#/${v}"><span class="emo">${e}</span><div class="grow"><b>${n}</b><div class="sm muted">${d}</div></div>${mIc("right", 18)}</a>`).join("")}
   <button class="mi" data-act="bdOpen"><span class="emo">🎂</span><div class="grow"><b>Aniversários</b><div class="sm muted">${(S.birthdays || []).length} cadastrado(s)</div></div>${mIc("right", 18)}</button>
   <button class="mi" data-act="settingsM"><span class="emo">⚙️</span><div class="grow"><b>Ajustes</b><div class="sm muted">Dados de exemplo, sincronização</div></div>${mIc("right", 18)}</button>
   <button class="mi" data-act="goDesktop"><span class="emo">🖥️</span><div class="grow"><b>Abrir versão desktop</b><div class="sm muted">Interface completa para tela grande</div></div>${mIc("right", 18)}</button>
   <button class="mi neg" data-act="logout"><span class="emo">🚪</span><div class="grow"><b>Sair</b></div></button></div>`;
ACT.goDesktop = () => { try { LS.setItem("norte:desktop", "1"); } catch {} location.href = "/"; };
ACT.settingsM = () => openLayer(`<h2>Ajustes</h2><div class="stack tight">
  <button class="listbtn" data-act="syncNow"><span>🔄</span>Sincronizar agora</button>
  <button class="listbtn" data-act="seedAsk"><span>🧪</span>Carregar dados de exemplo</button></div><p class="sm muted">Fuso horário: ${esc(S.settings.tz)}</p>`, { cls: "menu" });
ACT.syncNow = async () => { closeModal(); if (sb) { setSync("saving"); await pushCloud(); toast("Sincronizado ✓"); } else toast("Modo local: nada a sincronizar"); };
ACT.seedAsk = () => { closeModal(); setTimeout(() => mConfirm("Isso adiciona compromissos, transações, tarefas, hábitos e notas de exemplo aos seus dados.", "Carregar", () => ACT.seed(), { title: "Dados de exemplo", danger: false }), 0); };

/* ---------- aniversários ---------- */
let dBdM = null;
ACT.bdOpen = () => {
  const L = [...(S.birthdays || [])].sort((a, b) => bdNext(a).days - bdNext(b).days);
  openLayer(`<h2>Aniversários</h2><div class="stack tight scroll">${L.map((b) => { const n = bdNext(b); return `<button class="listbtn" data-act="bdEditM" data-id="${b.id}"><span>🎂</span><span class="grow ell">${esc(b.name)} · ${pad(b.day)}/${pad(b.month)}</span><small class="muted">${n.days === 0 ? "hoje!" : "em " + n.days + "d"}</small></button>`; }).join("") || '<div class="empty">Nenhum aniversário.</div>'}</div><button class="btn primary big" data-act="bdEditM" data-id="">+ Novo aniversário</button>`, { cls: "menu" });
};
ACT.bdEditM = (el) => {
  const id = el.dataset.id, old = id && (S.birthdays || []).find((x) => x.id === id), b = old || { name: "", day: "", month: new Date().getMonth() + 1, year: "", before: 0, notes: "" };
  dBdM = id || null;
  closeModal();
  setTimeout(() => formSheet(old ? "Editar aniversário" : "Novo aniversário", "mBd", `<label class="field"><span>Nome</span><input type="text" name="name" value="${esc(b.name)}" required></label>
   <div class="grid3"><label class="field"><span>Dia</span><input type="number" name="day" min="1" max="31" value="${b.day}" required inputmode="numeric"></label><label class="field"><span>Mês</span><select name="month">${MES.map((m, i) => `<option value="${i + 1}" ${b.month === i + 1 ? "selected" : ""}>${m.slice(0, 3)}</option>`).join("")}</select></label><label class="field"><span>Ano (opc.)</span><input type="number" name="year" value="${b.year || ""}" inputmode="numeric"></label></div>
   <label class="field"><span>Avisar</span><select name="before">${opts(BD_BEFORE, b.before || 0)}</select></label>`, { del: old ? "bdDelM" : "" }), 0);
};
SUBMIT.mBd = (f, fd) => {
  const day = +fd.get("day"), month = +fd.get("month");
  if (day < 1 || day > new Date(Date.UTC(2024, month, 0)).getUTCDate()) { toast("Dia inválido para este mês", true); return; }
  const o = { name: fd.get("name").trim(), day, month, year: +fd.get("year") || null, before: +fd.get("before") || 0, notes: "" };
  S.birthdays = S.birthdays || [];
  if (dBdM) Object.assign(S.birthdays.find((x) => x.id === dBdM), o); else S.birthdays.push({ id: uid(), ...o });
  save(); closeModal(); render(); toast("Aniversário salvo 🎂");
};
ACT.bdDelM = () => { const id = dBdM; mConfirm("Excluir este aniversário?", "Excluir", () => { S.birthdays = S.birthdays.filter((x) => x.id !== id); save(); LAYERS.slice().forEach(removeLayer); syncHistory(); render(); }); };

/* ---------- hábitos ---------- */
const hStreak = (h) => { let d = wd(todayStr()), n = 0; if (!h.log[ymd(d)]) d = addDays(d, -1); while (h.log[ymd(d)]) { n++; d = addDays(d, -1); } return n; };
const hAdh = (h, n = 30) => { let c = 0; const t = wd(todayStr()); for (let i = 0; i < n; i++) if (h.log[ymd(addDays(t, -i))]) c++; return Math.round(c / n * 100); };
MV.habits = () => {
  if (!S.habits.length) return `<div class="empty">Nenhum hábito ainda.<br><br><button class="btn primary" data-act="habNew">+ Criar hábito</button></div>`;
  const t = wd(todayStr()), days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  return S.habits.map((h) => `<div class="hab" style="--c:${h.color}"><div class="row"><span class="dot"></span><b class="grow ell" data-act="habEdit" data-id="${h.id}">${esc(h.name)}</b><span class="pill">🔥 ${hStreak(h)}</span><span class="pill">${hAdh(h)}%</span></div><div class="hdays">${days.map((d) => { const k = ymd(d); return `<button class="hd ${h.log[k] ? "on" : ""} ${k === todayStr() ? "today" : ""}" data-act="habToggle" data-id="${h.id}" data-d="${k}"><small>${DSEM[d.getUTCDay()][0]}</small><b>${d.getUTCDate()}</b></button>`; }).join("")}</div></div>`).join("") + `<button class="fab" data-act="habNew" aria-label="Novo hábito">${mIc("plus", 26)}</button>`;
};
ACT.habToggle = (el) => {
  const h = S.habits.find((x) => x.id === el.dataset.id), d = el.dataset.d;
  if (!h) return;
  if (h.log[d]) delete h.log[d]; else h.log[d] = true;
  save(); render();
};
let dHabM = null;
ACT.habNew = () => openHab(null);
ACT.habEdit = (el) => openHab(el.dataset.id);
function openHab(id) {
  const old = id && S.habits.find((x) => x.id === id), h = old || { name: "", color: HCOL[S.habits.length % HCOL.length] };
  dHabM = id;
  formSheet(old ? "Editar hábito" : "Novo hábito", "mHab", `<label class="field"><span>Nome</span><input type="text" name="name" value="${esc(h.name)}" required placeholder="Beber 2L de água"></label><div class="field"><span>Cor</span><div class="swatches">${HCOL.map((c) => `<label><input type="radio" name="color" value="${c}" ${h.color === c ? "checked" : ""}><i style="background:${c}"></i></label>`).join("")}</div></div>`, { del: old ? "habDelM" : "" });
}
SUBMIT.mHab = (f, fd) => {
  const o = { name: fd.get("name").trim(), color: fd.get("color") || HCOL[0] };
  if (dHabM) Object.assign(S.habits.find((x) => x.id === dHabM), o); else S.habits.push({ id: uid(), log: {}, ...o });
  save(); closeModal(); render();
};
ACT.habDelM = () => { const id = dHabM; mConfirm("Excluir este hábito e todo o histórico?", "Excluir", () => { S.habits = S.habits.filter((h) => h.id !== id); save(); LAYERS.slice().forEach(removeLayer); syncHistory(); render(); }); };

/* ---------- desejos ---------- */
MV.wish = () => {
  const st = ui.m.wst, L = S.wishlist.filter((i) => (i.bought ? "bought" : "want") === st).sort((a, b) => TaskOps.rank(a) - TaskOps.rank(b));
  const want = S.wishlist.filter((i) => !i.bought), tot = want.reduce((s, i) => s + curPrice(i), 0);
  return `<div class="stats one"><div><span>${want.length} desejo(s) · total à vista</span><b>${brl(tot)}</b></div></div><div class="segbar">${[["want", "Desejos"], ["bought", "Comprados"]].map(([k, n]) => `<button class="${st === k ? "on" : ""}" data-act="wishSt" data-s="${k}">${n}</button>`).join("")}</div>` +
    (L.length ? L.map((it) => { const p = curPrice(it), ch = priceChange(it), fin = financing(it); return `<div class="wcard-m ${it.bought ? "bought" : ""}" data-act="wishOpen" data-id="${it.id}"><div class="row"><b class="grow ell">${esc(it.name)}</b>${prioPill(it.prio)}</div><div class="big-n">${brl(p)}${ch ? ` <span class="pill ${ch.pct < 0 ? "ok" : "bad"}">${signedPct(ch.pct)}</span>` : ""}</div><div class="sm muted">${it.inst > 1 ? `${it.inst}× ${brl(fin.parcela)}` : "à vista"}${it.target > 0 ? ` · 🎯 ${brl(it.target)}` : ""}${it.by ? ` · até ${fmtDay(it.by)}` : ""}</div></div>`; }).join("") : '<div class="empty">Nada por aqui.</div>') + `<button class="fab" data-act="wishNew" aria-label="Novo desejo">${mIc("plus", 26)}</button>`;
};
ACT.wishSt = (el) => { ui.m.wst = el.dataset.s; render(); };
let dWishM = null;
ACT.wishNew = () => openWish(null);
ACT.wishOpen = (el) => openWish(el.dataset.id);
function openWish(id) {
  const old = id && S.wishlist.find((x) => x.id === id), it = old || { name: "", price: "", prio: "media", inst: 1, rate: 0, target: "", by: "", url: "", notes: "" };
  dWishM = id;
  const hist = old ? priceHist(it).slice(-6).reverse() : [];
  formSheet(old ? "Editar desejo" : "Novo desejo", "mWish", `<label class="field"><span>Nome</span><input type="text" name="nm" value="${esc(it.name)}" required placeholder="O que você quer?"></label>
   <div class="grid2"><label class="field"><span>Preço à vista (R$)</span><input type="number" name="price" step="0.01" min="0.01" inputmode="decimal" value="${old ? curPrice(it) : ""}" required></label><label class="field"><span>Prioridade</span><select name="prio">${opts(Object.entries(PRIO).map(([k, v]) => [k, v.n]), it.prio)}</select></label></div>
   <div class="grid2"><label class="field"><span>Parcelas</span><input type="number" name="inst" min="1" max="60" value="${it.inst || 1}" inputmode="numeric"></label><label class="field"><span>Juros (% a.m.)</span><input type="number" name="rate" step="0.01" min="0" value="${it.rate || 0}" inputmode="decimal"></label></div>
   <div class="grid2"><label class="field"><span>Preço-alvo</span><input type="number" name="target" step="0.01" min="0" value="${it.target || ""}" inputmode="decimal"></label><label class="field"><span>Comprar até</span><input type="date" name="by" value="${it.by || ""}"></label></div>
   <label class="field"><span>Link do produto</span><input type="url" name="url" value="${esc(it.url || "")}" placeholder="https://"></label>
   <label class="field"><span>Notas</span><textarea name="notes" rows="2">${esc(it.notes || "")}</textarea></label>
   ${old ? `${it.url ? `<a class="btn" href="${esc(it.url)}" target="_blank" rel="noopener">Abrir link</a> ` : ""}<button type="button" class="btn ${it.bought ? "" : "primary"}" data-act="wishBoughtM">${it.bought ? "Voltar para desejos" : "Marcar como comprado 🎉"}</button>${hist.length ? `<div class="hist"><b class="sm">Histórico de preço</b>${hist.map((h) => `<div class="sm row"><span class="grow">${fmtDay(h.d)}/${h.d.slice(2, 4)}</span><b>${brl(h.p)}</b></div>`).join("")}</div>` : ""}` : ""}`, { del: old ? "wishDelM" : "" });
}
SUBMIT.mWish = (f, fd) => {
  const o = { name: fd.get("nm").trim(), url: fd.get("url").trim(), prio: fd.get("prio"), inst: Math.max(1, +fd.get("inst") || 1), rate: +fd.get("rate") || 0, target: +fd.get("target") || 0, by: fd.get("by"), notes: fd.get("notes") }, price = +fd.get("price");
  if (dWishM) { const it = S.wishlist.find((x) => x.id === dWishM); Object.assign(it, o); addPoint(it, price); }
  else { const it = { id: uid(), img: "", monitor: false, ...o, hist: [] }; addPoint(it, price); it.seenPrice = R2(price); S.wishlist.push(it); }
  save(); closeModal(); render(); toast("Desejo salvo");
};
ACT.wishBoughtM = () => {
  const it = S.wishlist.find((x) => x.id === dWishM);
  it.bought = !it.bought;
  if (it.bought) it.monitor = false;
  save(); closeModal(); render(); toast(it.bought ? "Marcado como comprado 🎉" : "Voltou para a lista");
};
ACT.wishDelM = () => { const id = dWishM; mConfirm("Excluir este item da lista?", "Excluir", () => { S.wishlist = S.wishlist.filter((x) => x.id !== id); save(); LAYERS.slice().forEach(removeLayer); syncHistory(); render(); }); };

/* ---------- viagens ---------- */
const TRIP_CATS_M = [["passagem", "Passagens"], ["hospedagem", "Hospedagem"], ["alimentacao", "Alimentação"], ["transporte", "Transporte local"], ["passeios", "Passeios e ingressos"], ["outros", "Outros"]];
const TRIP_MULT_M = [["fixo", "valor fixo"], ["pessoa", "por pessoa"], ["dia", "por dia"], ["pessoa_dia", "por pessoa/dia"]];
function tripCalcM(t) {
  const days = t.start && t.end ? Math.max(1, Math.round((wd(t.end) - wd(t.start)) / 864e5) + 1) : 1, people = Math.max(1, +t.people || 1);
  const mult = { fixo: 1, pessoa: people, dia: days, pessoa_dia: people * days };
  const items = (t.items || []).map((i) => ({ ...i, total: i.amount * (mult[i.mult] || 1) }));
  const total = items.reduce((s, i) => s + i.total, 0), saved = (t.deposits || []).reduce((s, d) => s + d.amount, 0), remaining = Math.max(0, total - saved);
  const left = t.start ? Math.ceil((wd(t.start) - wd(todayStr())) / 864e5) : null;
  const months = left == null ? 1 : Math.max(1, Math.ceil(left / 30.44));
  return { days, people, items, total, saved, remaining, left, months, perMonth: left != null && left < 0 ? 0 : remaining / months, pct: total ? Math.min(100, saved / total * 100) : 0 };
}
const leftLbl = (c) => (c.left == null ? "" : c.left > 1 ? `faltam ${c.left} dias` : c.left === 1 ? "é amanhã!" : c.left === 0 ? "é hoje! ✈️" : "já passou");
MV.trips = () => {
  const st = ui.m.tripSt, L = S.trips.filter((t) => { const l = tripCalcM(t).left; return st === "all" || (st === "next" ? l == null || l >= 0 : l != null && l < 0); });
  return `<div class="segbar">${[["next", "Próximas"], ["past", "Passadas"], ["all", "Todas"]].map(([k, n]) => `<button class="${st === k ? "on" : ""}" data-act="tripSt" data-s="${k}">${n}</button>`).join("")}</div>` +
    (L.length ? L.map((t) => { const c = tripCalcM(t); return `<div class="trip" data-act="tripOpen" data-id="${t.id}"><div class="row"><span class="emo">${esc(t.emoji || "✈️")}</span><div class="grow"><b>${esc(t.name)}</b><div class="sm muted">${esc(t.dest || "")}${t.start ? ` · ${fmtDay(t.start)}${t.end ? "–" + fmtDay(t.end) : ""}` : ""}</div></div><span class="pill blue">${leftLbl(c)}</span></div><div class="row spread"><span><b class="big-n">${brl(c.saved)}</b> <small class="muted">de ${brl(c.total)}</small></span><b>${c.pct.toFixed(0)}%</b></div><div class="bar-t"><i style="width:${c.pct}%"></i></div>${c.remaining > 0.005 && !(c.left != null && c.left < 0) ? `<div class="sm">Separe <b>${brl(c.perMonth)}/mês</b> por ${c.months} ${c.months > 1 ? "meses" : "mês"}</div>` : ""}</div>`; }).join("") : '<div class="empty">Nenhuma viagem.</div>') + `<button class="fab" data-act="tripNew" aria-label="Nova viagem">${mIc("plus", 26)}</button>`;
};
ACT.tripSt = (el) => { ui.m.tripSt = el.dataset.s; render(); };
let dTripM = null;
ACT.tripNew = () => openTripForm(null);
ACT.tripOpen = (el) => openTripSheet(el.dataset.id);
function openTripSheet(id) {
  const t = S.trips.find((x) => x.id === id);
  if (!t) return;
  dTripM = id;
  const c = tripCalcM(t);
  const html = `<div class="shead"><h2>${esc(t.emoji || "✈️")} ${esc(t.name)}</h2><button type="button" class="icon-btn" data-act="layerClose">${mIc("x")}</button></div><div class="sbody">
   <div class="muted sm">${esc(t.dest || "")}${t.start ? ` · ${fmtDay(t.start)}${t.end ? "–" + fmtDay(t.end) : ""}` : ""} · ${c.people} pessoa(s) · ${c.days} dia(s)</div>
   <div class="stats"><div><span>Total</span><b>${brl(c.total)}</b></div><div><span>Guardado</span><b class="pos">${brl(c.saved)}</b></div><div><span>Falta</span><b class="neg">${brl(c.remaining)}</b></div></div>
   <div class="bar-t"><i style="width:${c.pct}%"></i></div>${c.remaining > 0.005 && !(c.left != null && c.left < 0) ? `<p class="sm">Separe <b>${brl(c.perMonth)}/mês</b> por ${c.months} ${c.months > 1 ? "meses" : "mês"} (${leftLbl(c)}).</p>` : ""}
   <div class="sh"><h3>Itens do orçamento</h3><button class="btn sm" data-act="tripItemNew">+ Item</button></div>${c.items.map((i) => `<div class="row-it"><div class="grow"><b>${esc(i.name)}</b><div class="sm muted">${brl(i.amount)} · ${(TRIP_MULT_M.find((m) => m[0] === i.mult) || [, ""])[1]}</div></div><b>${brl(i.total)}</b><button class="icon-btn" data-act="tripItemDel" data-id="${i.id}" aria-label="Remover">${mIc("x", 16)}</button></div>`).join("") || '<div class="empty sm">Sem itens.</div>'}
   <div class="sh"><h3>Depósitos</h3><button class="btn sm" data-act="tripDepNew">+ Guardar</button></div>${[...(t.deposits || [])].sort((a, b) => b.date.localeCompare(a.date)).map((d) => `<div class="row-it"><div class="grow sm">${fmtDay(d.date)}/${d.date.slice(2, 4)}</div><b>${brl(d.amount)}</b><button class="icon-btn" data-act="tripDepDel" data-id="${d.id}" aria-label="Remover">${mIc("x", 16)}</button></div>`).join("") || '<div class="empty sm">Nada guardado ainda.</div>'}
   ${t.notes ? `<p class="sm muted">${esc(t.notes)}</p>` : ""}</div><div class="sfoot"><button class="btn danger big-ic" data-act="tripDelM" aria-label="Excluir">${mIc("trash")}</button><button class="btn big grow" data-act="tripEdit">Editar viagem</button></div>`;
  const top = topLayer();
  if (top && top.o.cls === "tripdet") { top.el.querySelector(".sheet").innerHTML = '<div class="grab"></div><div class="fsheet">' + html + "</div>"; return; }
  openLayer(`<div class="fsheet">${html}</div>`, { cls: "tripdet", tall: true });
}
ACT.tripEdit = () => openTripForm(dTripM);
function openTripForm(id) {
  const old = id && S.trips.find((x) => x.id === id), t = old || { name: "", dest: "", emoji: "✈️", start: "", end: "", people: 1, notes: "" };
  dTripM = id;
  formSheet(old ? "Editar viagem" : "Nova viagem", "mTrip", `<label class="field"><span>Nome</span><input type="text" name="name" value="${esc(t.name)}" required placeholder="Férias em Lisboa"></label><label class="field"><span>Destino</span><input type="text" name="dest" value="${esc(t.dest || "")}"></label>
   <div class="grid2"><label class="field"><span>Ida</span><input type="date" name="start" value="${t.start || ""}"></label><label class="field"><span>Volta</span><input type="date" name="end" value="${t.end || ""}"></label></div>
   <div class="grid2"><label class="field"><span>Pessoas</span><input type="number" name="people" min="1" value="${t.people || 1}" inputmode="numeric"></label><label class="field"><span>Ícone</span><select name="emoji">${["✈️", "🏖️", "🏔️", "🏙️", "🚗", "🚢", "⛺", "🎡", "🗺️"].map((e) => `<option ${t.emoji === e ? "selected" : ""}>${e}</option>`).join("")}</select></label></div>
   <label class="field"><span>Notas</span><textarea name="notes" rows="2">${esc(t.notes || "")}</textarea></label>`);
}
SUBMIT.mTrip = (f, fd) => {
  const o = { name: fd.get("name").trim(), dest: fd.get("dest").trim(), start: fd.get("start"), end: fd.get("end"), people: Math.max(1, +fd.get("people") || 1), emoji: fd.get("emoji"), notes: fd.get("notes") };
  if (o.start && o.end && o.end < o.start) { toast("A volta precisa ser depois da ida", true); return; }
  let t;
  if (dTripM) { t = S.trips.find((x) => x.id === dTripM); Object.assign(t, o); } else { t = { id: uid(), items: [], deposits: [], ...o }; S.trips.push(t); }
  save(); closeModal(); render();
  const top = topLayer();
  if (top && top.o.cls === "tripdet") openTripSheet(t.id); else openTripSheet(t.id);
};
ACT.tripItemNew = () => formSheet("Novo item", "mTripItem", `<label class="field"><span>Nome</span><input type="text" name="n" required placeholder="Passagem aérea"></label><div class="grid2"><label class="field"><span>Categoria</span><select name="cat">${opts(TRIP_CATS_M, "passagem")}</select></label><label class="field"><span>Valor (R$)</span><input type="number" name="a" step="0.01" min="0" required inputmode="decimal"></label></div><label class="field"><span>Como multiplicar</span><select name="m">${opts(TRIP_MULT_M, "pessoa")}</select></label>`);
SUBMIT.mTripItem = (f, fd) => { const t = S.trips.find((x) => x.id === dTripM); (t.items || (t.items = [])).push({ id: uid(), name: fd.get("n").trim(), cat: fd.get("cat"), amount: R2(+fd.get("a")), mult: fd.get("m") }); save(); closeModal(); openTripSheet(dTripM); render(); };
ACT.tripItemDel = (el) => { const t = S.trips.find((x) => x.id === dTripM); t.items = t.items.filter((i) => i.id !== el.dataset.id); save(); openTripSheet(dTripM); render(); };
ACT.tripDepNew = () => formSheet("Guardar na caixinha", "mTripDep", `<label class="field"><span>Valor (R$)</span><input type="number" name="a" step="0.01" min="0.01" required inputmode="decimal" class="bigin"></label><label class="field"><span>Data</span><input type="date" name="d" value="${todayStr()}" required></label><label class="swrow"><span>Registrar também como saída em Finanças</span><input type="checkbox" name="tx"></label>`);
SUBMIT.mTripDep = (f, fd) => {
  const t = S.trips.find((x) => x.id === dTripM), a = R2(+fd.get("a")), d = fd.get("d");
  (t.deposits || (t.deposits = [])).push({ id: uid(), date: d, amount: a });
  if (fd.get("tx")) S.tx.push({ id: uid(), type: "out", desc: "Caixinha — " + t.name, amount: a, date: d, cat: "Viagens", sub: t.dest || "", method: "transfer", status: "paid" });
  save(); closeModal(); openTripSheet(dTripM); render(); toast(brl(a) + " guardados 💰");
};
ACT.tripDepDel = (el) => { const t = S.trips.find((x) => x.id === dTripM); t.deposits = t.deposits.filter((d) => d.id !== el.dataset.id); save(); openTripSheet(dTripM); render(); };
ACT.tripDelM = () => { const id = dTripM; mConfirm("Excluir esta viagem?", "Excluir", () => { const t = S.trips.find((x) => x.id === id); if (t && t.eventId) S.events = S.events.filter((e) => e.id !== t.eventId); S.trips = S.trips.filter((x) => x.id !== id); save(); LAYERS.slice().forEach(removeLayer); syncHistory(); render(); }); };
