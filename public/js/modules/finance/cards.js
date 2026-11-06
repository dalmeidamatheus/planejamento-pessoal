"use strict";
ui.fin.card = "all";
function finCards() {
  const ym = ui.fin.ym;
  if (!S.cards.length) return `<div class="card"><div class="empty">Nenhum cartão cadastrado.<br><br><button class="btn primary" data-act="newCard">${ic("plus")}Cadastrar cartão</button></div></div>`;
  const visible = ui.fin.card === "all" ? S.cards : S.cards.filter((c) => c.id === ui.fin.card);
  const cards = visible.map((c) => {
    const used = cardUsed(c), pct = Math.min(100, used / c.limit * 100), inv = S.tx.filter((t) => t.cardId === c.id && t.invoice === ym), tot = inv.reduce((s, t) => s + t.amount, 0), paid = inv.length && inv.every((t) => t.status === "paid"), best = c.closing >= daysIn(ym) ? 1 : c.closing + 1;
    return `<div class="card"><div class="ccard ${pct >= 100 ? "o" : ""}" style="--c:${c.color || "#2b3a55"};margin-bottom:12px"><div class="row"><b class="grow">${esc(c.name)}</b><button class="btn sm ghost" style="color:#fff" data-act="editCard" data-id="${c.id}">Editar</button></div>
     <div style="font-size:12px;opacity:.8;margin-top:10px">Limite utilizado</div><div style="font-size:20px;font-weight:600">${brl(used)} <span style="font-size:12px;opacity:.8;font-weight:400">/ ${brl(c.limit)}</span></div><div class="bar-t" style="margin:8px 0 6px"><i style="width:${pct}%"></i></div>
     <div class="row" style="justify-content:space-between;font-size:12px"><span>Disponível ${brl(c.limit - used)}</span><span>${pct.toFixed(0)}%</span></div></div>
     <div class="grid3 sm" style="margin-bottom:10px"><div><div class="muted">Fecha dia</div><b>${c.closing}</b></div><div><div class="muted">Vence dia</div><b>${c.due}</b></div><div><div class="muted">Melhor dia p/ comprar</div><b>${best}</b></div></div>
     <div class="row" style="margin-bottom:6px"><h2 class="grow">Fatura de ${ymLabel(ym)}</h2><b>${brl(tot)}</b>${tot ? `<span class="pill ${paid ? "ok" : "warn"}">${paid ? "Paga" : "Em aberto"}</span>` : ""}</div>
     ${inv.length ? `<div class="list">${inv.map((t) => `<div class="it" data-act="openTx" data-id="${t.id}"><span class="muted sm" style="width:38px">${fmtDay(t.purchase || t.date)}</span><div class="grow">${esc(t.desc)} ${t.of > 1 ? `<span class="pill">${t.no}/${t.of}</span>` : ""}</div><div class="num">${brl(t.amount)}</div></div>`).join("")}</div>` : '<div class="empty">Sem lançamentos nesta fatura</div>'}
     ${tot && !paid ? `<button class="btn primary" style="margin-top:10px" data-act="payInvoice" data-id="${c.id}" data-ym="${ym}">Pagar fatura (${brl(tot)})</button>` : ""}</div>`;
  }).join("");
  const cm = [];
  for (let i = 0; i < 12; i++) {
    const m = addM(curYm(), i);
    cm.push({ l: ymShort(m), m, a: S.tx.filter((t) => t.cardId && (ui.fin.card === "all" || t.cardId === ui.fin.card) && t.status !== "paid" && t.invoice === m).reduce((s, t) => s + t.amount, 0) });
  }
  const inc = incomeEst(), tot12 = cm.reduce((s, x) => s + x.a, 0), nxt = cm[0].a + 0;
  return `<div class="toolbar"><select style="width:220px" data-ch="finCard"><option value="all">Todos os cartões</option>${S.cards.map((c) => `<option value="${c.id}" ${ui.fin.card === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select><span class="muted sm">O gráfico de comprometimento acompanha o cartão selecionado.</span></div><div class="cols c2" style="margin-bottom:14px">${cards}</div>
  <div class="card"><div class="hd"><h2>Comprometimento da renda futura</h2><span class="muted sm">parcelas e faturas em aberto</span></div>
   <div class="cols c3" style="margin-bottom:12px"><div class="stat"><div class="l">Já comprometido (12 meses)</div><div class="v">${brl(tot12)}</div></div><div class="stat"><div class="l">Renda mensal estimada</div><div class="v">${brl(inc)}</div></div><div class="stat"><div class="l">Este mês no cartão</div><div class="v ${inc && nxt / inc > 0.5 ? "neg" : ""}">${inc ? Math.round(nxt / inc * 100) + "%" : "—"}</div><div class="s">${brl(nxt)} da renda</div></div></div>
   ${barsChart(cm.map((x) => ({ l: x.l, a: x.a, pct: inc ? Math.round(x.a / inc * 100) : 0 })), { series: [{ k: "a", c: "#e5484d", n: "Em faturas" }] })}</div>`;
}
ACT.payInvoice = (el) => {
  if (!confirmDlg("Marcar todos os lançamentos desta fatura como pagos?")) return;
  S.tx.forEach((t) => {
    if (t.cardId === el.dataset.id && t.invoice === el.dataset.ym) t.status = "paid";
  });
  save();
  render();
  toast("Fatura paga — limite liberado");
};
let dCard = null;
ACT.newCard = () => openCard();
ACT.editCard = (el) => openCard(el.dataset.id);
function openCard(id) {
  const c = id ? S.cards.find((x) => x.id === id) : { name: "", limit: "", closing: 25, due: 5, color: "#2b3a55" };
  dCard = id;
  modal(`<form data-form="card"><h2>${id ? "Editar" : "Novo"} cartão</h2><label class="field"><span>Nome</span><input type="text" name="name" value="${esc(c.name)}" required placeholder="Nubank, Itaú Platinum…"></label>
  <label class="field"><span>Limite total (R$)</span><input type="number" step="0.01" min="1" name="limit" value="${c.limit}" required></label>
  <div class="grid3"><label class="field"><span>Dia de fechamento</span><input type="number" min="1" max="31" name="closing" value="${c.closing}" required></label><label class="field"><span>Dia de vencimento</span><input type="number" min="1" max="31" name="due" value="${c.due}" required></label>
  <label class="field"><span>Cor</span><select name="color">${["#2b3a55", "#6b3f8c", "#b4552d", "#2f6f5c", "#0f172a", "#a8334f"].map((x) => `<option value="${x}" style="background:${x};color:#fff" ${c.color === x ? "selected" : ""}>■ ${x}</option>`).join("")}</select></label></div>
  <div class="muted sm">Compras feitas <b>depois</b> do dia de fechamento entram na fatura seguinte. O melhor dia de compra é o dia seguinte ao fechamento.</div>
  <div class="foot">${id ? `<button type="button" class="btn danger" data-act="cardDel">Excluir</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
}
SUBMIT.card = (f, fd) => {
  const o = { name: fd.get("name").trim(), limit: +fd.get("limit"), closing: +fd.get("closing"), due: +fd.get("due"), color: fd.get("color") };
  if (dCard) Object.assign(S.cards.find((x) => x.id === dCard), o);
  else S.cards.push({ id: uid(), ...o });
  save();
  closeModal();
  render();
};
ACT.cardDel = () => {
  if (S.tx.some((t) => t.cardId === dCard)) {
    toast("Há lançamentos neste cartão. Exclua-os antes.", true);
    return;
  }
  if (!confirmDlg("Excluir cartão?")) return;
  S.cards = S.cards.filter((x) => x.id !== dCard);
  save();
  closeModal();
  render();
};
INP.finCard = (el) => {
  ui.fin.card = el.value;
  render();
};
