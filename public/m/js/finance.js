"use strict";
/* Finanças: lançamentos do mês, cartões e investimentos (resumo) */
let dTxM = null;
const fym = () => ui.m.ym || (ui.m.ym = curYm());
const money = (v, t) => (t === "in" ? "+ " : "− ") + brl(v);
function txRow(t) {
  const st = stat(t), [sl, sc] = STAT[st];
  return `<div class="row-it tx ${t.status === "paid" ? "paid" : ""}" data-act="txOpen" data-id="${t.id}"><button class="tk-chk ${t.status === "paid" ? "on" : ""}" data-act="txPay" data-id="${t.id}" aria-label="${t.type === "in" ? "Marcar recebido" : "Marcar pago"}">${t.status === "paid" ? "✓" : ""}</button>
   <div class="grow"><b class="ell">${esc(t.desc)}</b><div class="sm muted ell">${esc(t.cat || "")}${t.of ? ` · ${t.no}/${t.of}` : ""} · ${METHODS[t.method] || ""}${t.virtual ? " · recorrente" : ""}</div></div>
   <div class="right"><b class="${t.type === "in" ? "pos" : "neg"}">${money(t.amount, t.type)}</b><div><span class="pill ${sc}">${t.type === "in" && st === "paid" ? "Recebido" : sl}</span></div></div></div>`;
}
MV.finance = () => {
  const ym = fym(), tab = ui.m.fin;
  const head = `<div class="agbar"><button class="icon-btn" data-act="finMonth" data-n="-1" aria-label="Mês anterior">${mIc("left")}</button><label class="agtitle"><b>${ymLabel(ym)}</b></label><button class="icon-btn" data-act="finMonth" data-n="1" aria-label="Próximo mês">${mIc("right")}</button></div>`;
  const seg = `<div class="segbar">${[["mov", "Lançamentos"], ["cards", "Cartões"], ["inv", "Investimentos"]].map(([k, n]) => `<button class="${tab === k ? "on" : ""}" data-act="finTab" data-t="${k}">${n}</button>`).join("")}</div>`;
  if (tab === "cards") {
    return seg + (S.cards.length ? S.cards.map((c) => { const u = cardUsed(c), p = c.limit ? Math.min(100, u / c.limit * 100) : 0; return `<div class="card-m" style="--c:${esc(c.color || "#2563eb")}" data-act="cardOpen" data-id="${c.id}"><div class="row"><b class="grow">${esc(c.name)}</b><span class="sm">fecha dia ${c.closing} · vence ${c.due}</span></div><div class="big-n">${brl(u)} <small>de ${brl(c.limit)}</small></div><div class="bar-t"><i style="width:${p}%"></i></div><div class="sm">Disponível ${brl(c.limit - u)}</div></div>`; }).join("") : '<div class="empty">Nenhum cartão cadastrado.</div>') + `<button class="fab" data-act="cardNew" aria-label="Novo cartão">${mIc("plus", 26)}</button>`;
  }
  if (tab === "inv") {
    const s = invSummary();
    return seg + `<div class="stats"><div><span>Investido</span><b>${brl(s.cost)}</b></div><div><span>Valor atual</span><b>${brl(s.value)}</b></div><div><span>Rendimento</span><b class="${s.yld >= 0 ? "pos" : "neg"}">${brl(s.yld)}</b></div></div><div class="stats one"><div><span>Patrimônio (caixa + investimentos)</span><b>${brl(netWorth(todayStr()))}</b></div></div>` + (S.assets.length ? S.assets.map((a) => `<div class="row-it"><span class="emo">📈</span><div class="grow"><b>${esc(a.name)}</b><div class="sm muted">${esc(ATYPES[a.type] || "")}</div></div><b>${brl(assetVal(a))}</b></div>`).join("") : '<div class="empty">Sem investimentos cadastrados.</div>') + '<p class="sm muted hint">Para registrar aportes e conferências use a versão desktop.</p>';
  }
  const t = totals(ym), f = ui.m.ftype;
  const L = t.L.filter((x) => f === "all" || x.type === f).sort((a, b) => b.date.localeCompare(a.date));
  const groups = {};
  L.forEach((x) => (groups[x.date] = groups[x.date] || []).push(x));
  return head + `<div class="stats"><div><span>Saldo hoje</span><b>${brl(cashAvailable(todayStr()))}</b></div><div><span>Entradas</span><b class="pos">${brl(t.in)}</b></div><div><span>Saídas</span><b class="neg">${brl(t.out)}</b></div></div>
  <div class="stats one"><div><span>Resultado do mês (previsto)</span><b class="${t.in - t.out >= 0 ? "pos" : "neg"}">${brl(t.in - t.out)}</b></div></div>` + seg + `<div class="segbar sm2">${[["all", "Todas"], ["in", "Entradas"], ["out", "Saídas"]].map(([k, n]) => `<button class="${f === k ? "on" : ""}" data-act="finType" data-t="${k}">${n}</button>`).join("")}</div>` +
    (L.length ? Object.keys(groups).sort().reverse().map((d) => `<div class="dayh">${fmtDayL(d)}</div>${groups[d].map(txRow).join("")}`).join("") : '<div class="empty">Sem lançamentos neste mês.</div>') + `<button class="fab" data-act="txNew" aria-label="Novo lançamento">${mIc("plus", 26)}</button>`;
};
ACT.finMonth = (el) => { ui.m.ym = addM(fym(), +el.dataset.n); render(); };
ACT.finTab = (el) => { ui.m.fin = el.dataset.t; render(); };
ACT.finType = (el) => { ui.m.ftype = el.dataset.t; render(); };
function materializeM(v, status) {
  const t = { id: uid(), type: v.type, desc: v.desc, amount: v.amount, cat: v.cat, sub: v.sub, method: v.method, date: v.date, status, tpl: v.tpl, tplYm: v.tplYm };
  S.tx.push(t);
  return t;
}
ACT.txPay = (el, e) => {
  e.stopPropagation();
  let t = S.tx.find((x) => x.id === el.dataset.id);
  if (!t) { const v = monthTx(fym()).find((x) => x.id === el.dataset.id); if (!v) return; materializeM(v, "paid"); }
  else t.status = t.status === "paid" ? "pending" : "paid";
  save();
  render();
};
ACT.txNew = () => openTx(null);
ACT.txOpen = (el) => {
  const id = el.dataset.id;
  if (!S.tx.find((x) => x.id === id)) {
    const v = monthTx(fym()).find((x) => x.id === id);
    if (v) mConfirm("“" + v.desc + "” é um lançamento recorrente. Marcar como " + (v.type === "in" ? "recebido" : "pago") + " neste mês?", "Marcar", () => { materializeM(v, "paid"); save(); render(); }, { title: "Lançamento recorrente", danger: false });
    return;
  }
  openTx(id);
};
function catOpts(type, sel) { return (type === "in" ? CATS_IN : CATS_OUT).map((c) => `<option ${c === sel ? "selected" : ""}>${esc(c)}</option>`).join(""); }
function openTx(id) {
  const old = id && S.tx.find((x) => x.id === id);
  const t = old ? clone(old) : { type: "out", desc: "", amount: "", date: todayStr(), cat: "Alimentação", sub: "", method: "pix", status: "paid" };
  dTxM = { id: old ? id : null, type: t.type };
  const credit = t.method === "credit" && !old;
  formSheet(old ? "Editar lançamento" : "Novo lançamento", "mTx", `
   <div class="seg2" id="txseg"><button type="button" class="${t.type === "out" ? "on" : ""}" data-act="mTxType" data-v="out">Saída</button><button type="button" class="${t.type === "in" ? "on" : ""}" data-act="mTxType" data-v="in">Entrada</button></div><input type="hidden" name="type" value="${t.type}">
   <label class="field"><span>Valor (R$)</span><input type="number" name="amount" inputmode="decimal" step="0.01" min="0.01" value="${t.amount}" required data-in="mTxChk" class="bigin"></label>
   <label class="field"><span>Descrição</span><input type="text" name="desc" value="${esc(t.desc)}" required placeholder="Ex.: Mercado"></label>
   <div class="grid2"><label class="field"><span id="txdl">${credit ? "Data da compra" : "Data / vencimento"}</span><input type="date" name="date" value="${t.date}" required data-in="mTxChk"></label><label class="field"><span>Categoria</span><select name="cat" id="txcat">${catOpts(t.type, t.cat)}</select></label></div>
   <div class="grid2"><label class="field"><span>Forma</span><select name="method" data-ch="mTxMethod">${Object.entries(METHODS).map(([k, n]) => `<option value="${k}" ${t.method === k ? "selected" : ""}>${n}</option>`).join("")}</select></label><label class="field" id="txstw"><span>Situação</span><select name="status"><option value="paid" ${t.status === "paid" ? "selected" : ""}>${t.type === "in" ? "Recebido" : "Pago"}</option><option value="pending" ${t.status !== "paid" ? "selected" : ""}>Pendente</option></select></label></div>
   <div id="cardBoxM" class="${credit ? "" : "hidden"}"><div class="grid2"><label class="field"><span>Cartão</span><select name="cardId" data-ch="mTxChk">${S.cards.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("") || "<option value=''>— cadastre um cartão —</option>"}</select></label><label class="field"><span>Parcelas</span><input type="number" name="inst" min="1" max="60" value="1" inputmode="numeric" data-in="mTxChk"></label></div><p class="sm muted" id="cardInfoM"></p></div>
   <label class="field"><span>Subcategoria (opcional)</span><input type="text" name="sub" value="${esc(t.sub || "")}"></label>
   ${old ? "" : `<label class="swrow" id="repWrap"><span>Repetir todo mês</span><input type="checkbox" name="rep"></label>`}`, { del: old ? "txDelM" : "", layer: {} });
  INP.mTxMethod($("select[name=method]"));
}
ACT.mTxType = (el) => {
  const f = el.closest("form");
  dTxM.type = el.dataset.v;
  $("input[name=type]", f).value = dTxM.type;
  $$("#txseg button", f).forEach((b) => b.classList.toggle("on", b === el));
  $("#txcat").innerHTML = catOpts(dTxM.type, "");
  $("select[name=status] option[value=paid]", f).textContent = dTxM.type === "in" ? "Recebido" : "Pago";
  INP.mTxMethod($("select[name=method]", f));
};
INP.mTxMethod = (el) => {
  const f = el.closest("form"), credit = el.value === "credit" && dTxM.type === "out" && !dTxM.id;
  $("#cardBoxM").classList.toggle("hidden", !credit);
  $("#txstw").classList.toggle("hidden", credit);
  $("#txdl").textContent = credit ? "Data da compra" : "Data / vencimento";
  const rw = $("#repWrap"); if (rw) rw.classList.toggle("hidden", credit);
  INP.mTxChk();
};
INP.mTxChk = () => {
  const f = $("form[data-form=mTx]");
  if (!f || $("#cardBoxM").classList.contains("hidden")) return;
  const c = cardOf(f.cardId.value), n = Math.max(1, +f.inst.value || 1), a = +f.amount.value || 0, d = f.date.value, info = $("#cardInfoM");
  if (!c || !d) { info.textContent = c ? "" : "Cadastre um cartão em Finanças → Cartões."; return; }
  const inv = invYm(c, d), av = c.limit - cardUsed(c);
  info.innerHTML = `${n > 1 && a ? n + "× " + brl(a / n) + " · " : ""}Entra na fatura de <b>${ymLabel(inv)}</b> (vence ${fmtDay(dueDate(c, inv))}). Limite disponível: <b class="${a > av ? "neg" : ""}">${brl(av)}</b>${a > av ? " — excede!" : ""}`;
};
SUBMIT.mTx = (f, fd) => {
  const type = fd.get("type"), amount = R2(+fd.get("amount")), date = fd.get("date"), m = fd.get("method");
  const base = { type, desc: fd.get("desc").trim(), amount, cat: fd.get("cat"), sub: (fd.get("sub") || "").trim(), method: m };
  if (!amount || amount <= 0) { toast("Informe um valor válido", true); return; }
  if (dTxM.id) {
    const x = S.tx.find((y) => y.id === dTxM.id);
    Object.assign(x, base, { date, status: fd.get("status") || x.status });
    if (x.cardId) x.method = "credit";
    save(); closeModal(); render(); toast("Lançamento salvo");
    return;
  }
  if (m === "credit" && type === "out") {
    const c = cardOf(fd.get("cardId"));
    if (!c) { toast("Cadastre um cartão em Finanças → Cartões", true); return; }
    const n = Math.max(1, Math.min(60, +fd.get("inst") || 1)), exceeds = amount > c.limit - cardUsed(c);
    const cents = Math.round(amount * 100), b = Math.floor(cents / n), rem = cents - b * n, grp = uid(), first = invYm(c, date);
    for (let i = 0; i < n; i++) { const inv = addM(first, i); S.tx.push({ id: uid(), ...base, amount: (b + (i < rem ? 1 : 0)) / 100, date: dueDate(c, inv), status: "pending", cardId: c.id, invoice: inv, purchase: date, grp, no: i + 1, of: n }); }
    save(); closeModal(); render();
    toast((exceeds ? "Atenção: passou do limite. " : "") + (n > 1 ? `Parcelado em ${n}× nas faturas` : "Lançado na fatura de " + ymLabel(first)), exceeds);
    return;
  }
  const status = fd.get("status");
  if (fd.get("rep")) {
    const r = { id: uid(), ...base, day: +date.slice(8, 10), start: date.slice(0, 7) + "-01", every: 1, until: "", skip: [] };
    S.recur.push(r);
    if (status === "paid") materializeM({ ...base, date, tpl: r.id, tplYm: date.slice(0, 7) }, "paid");
    save(); closeModal(); render(); toast("Lançamento recorrente criado");
    return;
  }
  S.tx.push({ id: uid(), ...base, date, status });
  save(); closeModal(); render(); toast("Lançamento criado");
};
ACT.txDelM = () => {
  const id = dTxM.id, x = S.tx.find((y) => y.id === id);
  mConfirm("Excluir “" + (x ? x.desc : "") + "”?", "Excluir", () => { S.tx = S.tx.filter((y) => y.id !== id); save(); LAYERS.slice().forEach(removeLayer); syncHistory(); render(); });
};
/* cartões */
let dCard = null;
ACT.cardNew = () => openCard(null);
ACT.cardOpen = (el) => openCard(el.dataset.id);
function openCard(id) {
  const old = id && cardOf(id), c = old || { name: "", limit: "", closing: 25, due: 5, color: "#2563eb" };
  dCard = id;
  formSheet(old ? "Editar cartão" : "Novo cartão", "mCard", `<label class="field"><span>Nome</span><input type="text" name="name" value="${esc(c.name)}" required placeholder="Ex.: Nubank"></label>
   <label class="field"><span>Limite (R$)</span><input type="number" name="limit" step="0.01" min="0" value="${c.limit}" required inputmode="decimal"></label>
   <div class="grid2"><label class="field"><span>Dia do fechamento</span><input type="number" name="closing" min="1" max="31" value="${c.closing}" required></label><label class="field"><span>Dia do vencimento</span><input type="number" name="due" min="1" max="31" value="${c.due}" required></label></div>
   <label class="field"><span>Cor</span><input type="color" name="color" value="${esc(c.color || "#2563eb")}"></label>`, { del: old ? "cardDel" : "" });
}
SUBMIT.mCard = (f, fd) => {
  const o = { name: fd.get("name").trim(), limit: +fd.get("limit") || 0, closing: +fd.get("closing"), due: +fd.get("due"), color: fd.get("color") };
  if (dCard) Object.assign(cardOf(dCard), o); else S.cards.push({ id: uid(), ...o });
  save(); closeModal(); render();
};
ACT.cardDel = () => {
  const id = dCard;
  if (S.tx.some((t) => t.cardId === id)) { toast("Este cartão tem compras lançadas — exclua pelo desktop.", true); return; }
  mConfirm("Excluir este cartão?", "Excluir", () => { S.cards = S.cards.filter((c) => c.id !== id); save(); LAYERS.slice().forEach(removeLayer); syncHistory(); render(); });
};
