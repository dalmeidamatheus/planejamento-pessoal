"use strict";
let dTx = null;
ACT.newTx = (el) => openTx(null, { method: el?.dataset?.method });
ACT.openTx = (el) => openTx(el.dataset.id);
function materialize(v, status) {
  const t = { id: uid(), type: v.type, desc: v.desc, amount: v.amount, cat: v.cat, sub: v.sub, method: v.method, date: v.date, status, tpl: v.tpl, tplYm: v.tplYm };
  S.tx.push(t);
  return t;
}
ACT.txPay = (el, e) => {
  let t = S.tx.find((x) => x.id === el.dataset.id);
  if (!t) {
    const v = monthTx(ui.fin.ym).find((x) => x.id === el.dataset.id);
    if (!v) return;
    materialize(v, "paid");
  } else t.status = t.status === "paid" ? "pending" : "paid";
  save();
  render();
};
function openTx(id, pre = {}) {
  if (id && id.startsWith("v:")) {
    const v = monthTx(ui.fin.ym).find((x) => x.id === id) || [...monthTx(curYm()), ...monthTx(addM(curYm(), 1))].find((x) => x.id === id);
    if (!v) return;
    modal(`<h2>${esc(v.desc)}</h2><p class="muted">Lançamento recorrente · ${fmtDayL(v.date)} · <b>${brl(v.amount)}</b></p><div class="row wrap">
     <button class="btn primary" data-act="virtPay" data-id="${id}">${ic("check")}Marcar como ${v.type === "in" ? "recebido" : "pago"}</button>
     <button class="btn" data-act="virtEdit" data-tpl="${v.tpl}">Editar recorrência</button>
     <button class="btn danger" data-act="virtSkip" data-tpl="${v.tpl}" data-ym="${v.tplYm}">Pular este mês</button></div>
     <div class="foot"><button class="btn" data-act="close">Fechar</button></div>`);
    return;
  }
  const ex = id && S.tx.find((x) => x.id === id);
  dTx = ex ? clone(ex) : Object.assign({ type: "out", desc: "", amount: "", date: todayStr(), cat: "Outros", sub: "", method: "pix", status: "paid", _new: true }, pre.method ? { method: pre.method, status: "pending" } : {}, pre.tpl || {}, pre.fields || {});
  if (pre.tpl) dTx._tpl = pre.tpl.id;
  const t = dTx, inst = !!t.of && !t._new, tplMode = !!t._tpl;
  modal(`<form data-form="tx"><h2>${tplMode ? "Editar recorrência" : ex ? "Editar transação" : "Nova transação"}</h2>
  <div class="seg" style="margin-bottom:12px"><button type="button" class="${t.type === "out" ? "on" : ""}" data-act="txType" data-v="out">Saída</button><button type="button" class="${t.type === "in" ? "on" : ""}" data-act="txType" data-v="in">Entrada</button></div>
  <input type="hidden" name="type" value="${t.type}">
  <label class="field"><span>Descrição</span><input type="text" name="desc" value="${esc(t.desc)}" required placeholder="Ex.: Mercado, Salário, Notebook"></label>
  <div class="grid2"><label class="field"><span>${t.method === "credit" && !inst ? "Valor total" : "Valor"} (R$)</span><input type="number" step="0.01" min="0.01" name="amount" value="${t.amount}" required></label>
   <label class="field"><span id="dateLbl">${tplMode ? "Dia base do vencimento" : t.method === "credit" ? "Data da compra" : "Data / vencimento"}</span><input type="date" name="date" value="${t.date}" required></label></div>
  <div class="grid2"><label class="field"><span>Categoria</span><select name="cat" id="txCat"></select></label><label class="field"><span>Subcategoria</span><input type="text" name="sub" list="subs_dl" value="${esc(t.sub || "")}" placeholder="opcional"><datalist id="subs_dl">${[...new Set(S.tx.map((x) => x.sub).filter(Boolean))].map((x) => `<option>${esc(x)}</option>`).join("")}</datalist></label></div>
  <div class="grid2 ${inst ? "hidden" : ""}"><label class="field"><span>Forma de pagamento</span><select name="method" data-ch="txMethod">${Object.entries(METHODS).map(([k, v]) => `<option value="${k}" ${t.method === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
   <label class="field ${tplMode ? "hidden" : ""}"><span>Status</span><select name="status"><option value="paid" ${t.status === "paid" ? "selected" : ""}>${t.type === "in" ? "Recebido" : "Pago"}</option><option value="pending" ${t.status !== "paid" ? "selected" : ""}>Pendente</option></select></label></div>
  <div id="cardBox" class="${t.method === "credit" && !inst ? "" : "hidden"}"><div class="grid3"><label class="field"><span>Cartão</span><select name="cardId" data-ch="txCardChk">${S.cards.length ? S.cards.map((c) => `<option value="${c.id}" ${t.cardId === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("") : '<option value="">Cadastre um cartão primeiro</option>'}</select></label>
   <label class="field"><span>Parcelas</span><input type="number" min="1" max="60" name="inst" value="1" data-in="txCardChk"></label><label class="field"><span>Parcela</span><input type="text" id="instPrev" disabled></label></div><div id="cardInfo" class="sm muted" style="margin-bottom:10px"></div></div>
  ${inst ? `<div class="sm muted" style="margin-bottom:10px">Parcela ${t.no} de ${t.of} · fatura ${ymLabel(t.invoice)} · ${esc(cardOf(t.cardId)?.name || "")}</div>` : ""}
  <div id="repBox" class="grid3 ${t.method === "credit" && !inst || inst || ex && !tplMode ? "hidden" : ""}"><label class="field"><span>Repetir</span><select name="rep" data-ch="txRep"><option value="">Não repete</option><option value="1" ${tplMode ? "selected" : ""}>Mensalmente</option></select></label>
   <label class="field rep ${tplMode ? "" : "hidden"}"><span>A cada (meses)</span><input type="number" min="1" name="every" value="${t._every || 1}"></label><label class="field rep ${tplMode ? "" : "hidden"}"><span>Até (opcional)</span><input type="date" name="until" value="${t._until || ""}"></label></div>
  <div class="foot">${ex ? `<button type="button" class="btn danger" data-act="txDel">${ic("trash")}Excluir</button>` : ""}${inst ? `<button type="button" class="btn danger" data-act="txDelGrp">Excluir todas as parcelas</button>` : ""}${tplMode ? `<button type="button" class="btn danger" data-act="tplDel">Encerrar recorrência</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`, { onMount: () => {
    fillCats();
    INP.txCardChk();
  } });
}
function fillCats() {
  const s = $("#txCat");
  if (!s) return;
  const L = dTx.type === "in" ? CATS_IN : CATS_OUT;
  if (!L.includes(dTx.cat)) dTx.cat = L[L.length - 1];
  s.innerHTML = L.map((c) => `<option ${c === dTx.cat ? "selected" : ""}>${c}</option>`).join("");
}
ACT.txType = (el) => {
  const f = el.closest("form");
  dTx.type = el.dataset.v;
  $("input[name=type]", f).value = dTx.type;
  $$(".seg button", f).forEach((b) => b.classList.toggle("on", b === el));
  dTx.cat = "";
  fillCats();
  $("select[name=status] option[value=paid]", f).textContent = dTx.type === "in" ? "Recebido" : "Pago";
};
INP.txMethod = (el) => {
  const f = el.closest("form"), cr = el.value === "credit";
  $("#cardBox").classList.toggle("hidden", !cr);
  $("#repBox").classList.toggle("hidden", cr || !dTx._new && !dTx._tpl);
  $("#dateLbl").textContent = cr ? "Data da compra" : "Data / vencimento";
  INP.txCardChk();
};
INP.txRep = (el) => $$(".rep", el.closest("form")).forEach((x) => x.classList.toggle("hidden", !el.value));
INP.txCardChk = () => {
  const f = $("form[data-form=tx]");
  if (!f || $("#cardBox").classList.contains("hidden")) return;
  const c = cardOf(f.cardId?.value), n = Math.max(1, +f.inst.value || 1), a = +f.amount.value || 0, d = f.date.value;
  $("#instPrev").value = n > 1 && a ? n + "× " + brl(a / n) : brl(a);
  if (!c || !d) {
    $("#cardInfo").textContent = "";
    return;
  }
  const inv = invYm(c, d), av = c.limit - cardUsed(c);
  $("#cardInfo").innerHTML = `Entra na fatura de <b>${ymLabel(inv)}</b> (vence ${fmtDay(dueDate(c, inv))}). Limite disponível: <b class="${a > av ? "neg" : ""}">${brl(av)}</b>${a > av ? " — excede o limite!" : ""}`;
};
document.addEventListener("input", (e) => {
  if (e.target.form?.dataset?.form === "tx" && (e.target.name === "amount" || e.target.name === "date")) INP.txCardChk();
});
SUBMIT.tx = (f, fd) => {
  const t = dTx, type = fd.get("type"), amount = R2(+fd.get("amount")), date = fd.get("date"), m = fd.get("method") || t.method, base = { type, desc: fd.get("desc").trim(), amount, cat: fd.get("cat"), sub: fd.get("sub").trim(), method: m };
  if (!amount || amount <= 0) {
    toast("Informe um valor válido", true);
    return;
  }
  if (t._tpl) {
    const r = S.recur.find((x) => x.id === t._tpl);
    if (r) {
      Object.assign(r, base, { day: +date.slice(8, 10), every: Math.max(1, +fd.get("every") || 1), until: fd.get("until") || "" });
    }
    save();
    closeModal();
    render();
    toast("Recorrência atualizada");
    return;
  }
  if (!t._new) {
    const x = S.tx.find((y) => y.id === t.id);
    Object.assign(x, base, { date, status: fd.get("status") || x.status });
    if (x.cardId) {
      x.method = "credit";
    }
    save();
    closeModal();
    render();
    toast("Transação salva");
    return;
  }
  const status = fd.get("status");
  if (m === "credit" && type === "out") {
    const c = cardOf(fd.get("cardId"));
    if (!c) {
      toast("Cadastre um cartão em “Cartões”", true);
      return;
    }
    const n = Math.max(1, Math.min(60, +fd.get("inst") || 1));
    if (amount > c.limit - cardUsed(c) && !confirm(`O valor excede o limite disponível (${brl(c.limit - cardUsed(c))}). Lançar mesmo assim?`)) return;
    const cents = Math.round(amount * 100), b = Math.floor(cents / n), rem = cents - b * n, grp = uid(), first = invYm(c, date);
    for (let i = 0; i < n; i++) {
      const inv = addM(first, i);
      S.tx.push({ id: uid(), ...base, amount: (b + (i < rem ? 1 : 0)) / 100, date: dueDate(c, inv), status: "pending", cardId: c.id, invoice: inv, purchase: date, grp, no: i + 1, of: n });
    }
    save();
    closeModal();
    render();
    toast(n > 1 ? `Compra parcelada em ${n}× lançada nas faturas` : "Compra lançada na fatura de " + ymLabel(first));
    return;
  }
  if (fd.get("rep")) {
    const r = { id: uid(), ...base, day: +date.slice(8, 10), start: date.slice(0, 7) + "-01", every: Math.max(1, +fd.get("every") || 1), until: fd.get("until") || "", skip: [] };
    S.recur.push(r);
    if (status === "paid") materialize({ ...base, date, tpl: r.id, tplYm: date.slice(0, 7) }, "paid");
    save();
    closeModal();
    render();
    toast("Lançamento recorrente criado");
    return;
  }
  S.tx.push({ id: uid(), ...base, date, status });
  save();
  closeModal();
  render();
  toast("Transação criada");
};
ACT.txDel = () => {
  if (!confirmDlg("Excluir esta transação?")) return;
  S.tx = S.tx.filter((x) => x.id !== dTx.id);
  save();
  closeModal();
  render();
};
ACT.txDelGrp = () => {
  if (!confirmDlg("Excluir todas as parcelas desta compra?")) return;
  S.tx = S.tx.filter((x) => x.grp !== dTx.grp);
  save();
  closeModal();
  render();
};
ACT.tplDel = () => {
  if (!confirmDlg("Encerrar esta recorrência? Lançamentos já pagos são mantidos.")) return;
  S.recur = S.recur.filter((x) => x.id !== dTx._tpl);
  save();
  closeModal();
  render();
};
ACT.virtPay = (el) => {
  const v = [...monthTx(ui.fin.ym), ...monthTx(curYm()), ...monthTx(addM(curYm(), 1))].find((x) => x.id === el.dataset.id);
  if (v) materialize(v, "paid");
  save();
  closeModal();
  render();
};
ACT.virtSkip = (el) => {
  const r = S.recur.find((x) => x.id === el.dataset.tpl);
  (r.skip || (r.skip = [])).push(el.dataset.ym);
  save();
  closeModal();
  render();
};
ACT.virtEdit = (el) => {
  const r = S.recur.find((x) => x.id === el.dataset.tpl);
  openTx(null, { tpl: { ...r, id: r.id, amount: r.amount, date: ui.fin.ym + "-" + pad(Math.min(r.day, daysIn(ui.fin.ym))), _every: r.every, _until: r.until, _new: false } });
};
