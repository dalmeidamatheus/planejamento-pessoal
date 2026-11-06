"use strict";
const monthNav = () => `<div class="row"><button class="icon-btn" data-act="finPrev">${ic("left")}</button><b style="min-width:120px;text-align:center;text-transform:capitalize">${ymLabel(ui.fin.ym)}</b><button class="icon-btn" data-act="finNext">${ic("right")}</button><button class="btn sm ghost" data-act="finCur">Mês atual</button></div>`;
ACT.finPrev = () => {
  ui.fin.ym = addM(ui.fin.ym, -1);
  render();
};
ACT.finNext = () => {
  ui.fin.ym = addM(ui.fin.ym, 1);
  render();
};
ACT.finCur = () => {
  ui.fin.ym = curYm();
  render();
};
ACT.finTab = (el) => {
  ui.fin.tab = el.dataset.t;
  render();
};
VIEWS.finance = () => {
  if (!ui.fin.ym) ui.fin.ym = curYm();
  const t = ui.fin.tab;
  const tabs = [["geral", "Visão geral"], ["tx", "Transações"], ["cards", "Cartões"], ["inv", "Investimentos"], ["bud", "Orçamentos & metas"]];
  const act = { geral: `<button class="btn primary" data-act="newTx">${ic("plus")}Transação</button>`, tx: `<button class="btn primary" data-act="newTx">${ic("plus")}Transação</button>`, cards: `<button class="btn" data-act="newCard">${ic("plus")}Cartão</button><button class="btn primary" data-act="newTx" data-method="credit">${ic("plus")}Compra no cartão</button>`, inv: `<button class="btn" data-act="newAsset">${ic("plus")}Investimento</button><button class="btn" data-act="newMove">Movimentar</button><button class="btn" data-act="newDiv">Provento</button><button class="btn primary" data-act="newCheck">Conferir saldo</button>`, bud: `<button class="btn" data-act="newGoal">${ic("plus")}Meta</button><button class="btn primary" data-act="newBudget">${ic("plus")}Orçamento</button>` }[t];
  return `<div class="tabs">${tabs.map(([k, n]) => `<button class="${t === k ? "on" : ""}" data-act="finTab" data-t="${k}">${n}</button>`).join("")}</div>
  ${t === "tx" ? "" : `<div class="toolbar">${t === "geral" || t === "cards" || t === "bud" ? monthNav() : t === "inv" ? "<b>Carteira de investimentos</b>" : ""}<div class="grow"></div>${act}</div>`}` + { geral: finGeral, tx: finTx, cards: finCards, inv: finInv, bud: finBud }[t]();
};
