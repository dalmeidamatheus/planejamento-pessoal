"use strict";
const txActive = () => {
  const f = ui.fin.f;
  return !!(f.type || f.status || f.cat || f.sub || f.method || f.card || f.q || f.min !== "" || f.max !== "");
};
function finTx() {
  const f = ui.fin.f, subs = [...new Set(S.tx.map((t) => t.sub).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${String(cur) === String(v) ? "selected" : ""}>${esc(label)}</option>`;
  const sel = (k, w, first, items) => `<select style="width:${w}px" data-ch="finF" data-k="${k}">${opt("", f[k], first)}${items.map(([v, l]) => opt(v, f[k], l)).join("")}</select>`;
  return `<div class="toolbar">
   <div class="seg">${TX_PERIODS.map(([k, n]) => `<button class="${f.period === k ? "on" : ""}" data-act="finPeriod" data-p="${k}">${n}</button>`).join("")}</div>
   ${f.period === "month" ? monthNav() : ""}
   ${f.period === "range" ? `<input type="date" style="width:150px" value="${esc(f.from)}" data-ch="finF" data-k="from"><span class="muted sm">até</span><input type="date" style="width:150px" value="${esc(f.to)}" data-ch="finF" data-k="to">` : ""}
   <div class="grow"></div>
   <div class="seg"><button class="${f.view === "list" ? "on" : ""}" data-act="finView" data-v="list">Lista</button><button class="${f.view === "group" ? "on" : ""}" data-act="finView" data-v="group">Agrupado</button></div>
   ${f.view === "group" ? `<select style="width:260px" data-ch="finF" data-k="group">${TX_GROUPS.map(([v, l]) => opt(v, f.group, "Agrupar por " + l.toLowerCase())).join("")}</select>` : ""}
   <button class="btn" data-act="txCsv">Exportar CSV</button><button class="btn primary" data-act="newTx">${ic("plus")}Transação</button></div>
  <div class="toolbar">
   <input type="text" style="width:190px" placeholder="Buscar…" value="${esc(f.q)}" data-in="finF" data-k="q">
   ${sel("type", 150, "Todos os tipos", [["in", "Entradas"], ["out", "Saídas"]])}
   ${sel("status", 140, "Todo status", Object.entries(STAT).map(([k, v]) => [k, v[0]]))}
   ${sel("cat", 190, "Todas as categorias", [...new Set([...CATS_OUT, ...CATS_IN])].map((c) => [c, c]))}
   ${sel("sub", 190, "Toda subcategoria", subs.map((s) => [s, s]))}
   ${sel("method", 190, "Toda forma de pagto.", Object.entries(METHODS))}
   ${S.cards.length ? sel("card", 170, "Todos os cartões", [...S.cards.map((c) => [c.id, c.name]), ["none", "Sem cartão"]]) : ""}
   <input type="number" step="0.01" min="0" style="width:96px" placeholder="Valor mín." value="${esc(f.min)}" data-in="finF" data-k="min">
   <input type="number" step="0.01" min="0" style="width:96px" placeholder="Valor máx." value="${esc(f.max)}" data-in="finF" data-k="max">
   <select style="width:140px" data-ch="finF" data-k="sort">${TX_SORTS.map(([v, l]) => opt(v, f.sort, l)).join("")}</select>
   ${txActive() ? `<button class="btn sm ghost" data-act="finClear">Limpar filtros</button>` : ""}</div>
  <div id="txBody">${txRows()}</div><p class="muted sm">Despesas no cartão entram no mês de vencimento da fatura (cada parcela no seu mês). Em períodos que incluem meses futuros, recorrências aparecem como previstas.</p>`;
}
INP.finF = (el, e) => {
  ui.fin.f[el.dataset.k] = el.value;
  ui.fin.f.limit = 100;
  if (e.type === "input") $("#txBody").innerHTML = txRows();
  else render();
};
ACT.finPeriod = (el) => {
  ui.fin.f.period = el.dataset.p;
  ui.fin.f.limit = 100;
  render();
};
ACT.finView = (el) => {
  ui.fin.f.view = el.dataset.v;
  render();
};
ACT.finClear = () => {
  Object.assign(ui.fin.f, { type: "", status: "", cat: "", sub: "", method: "", card: "", q: "", min: "", max: "", limit: 100 });
  render();
};
ACT.txMore = () => {
  ui.fin.f.limit += 100;
  $("#txBody").innerHTML = txRows();
};
ACT.txDrill = (el) => {
  const f = ui.fin.f, g = f.group, k = el.dataset.k;
  if (g === "cat") f.cat = k;
  else if (g === "sub") f.sub = k;
  else if (g === "desc") f.q = k;
  else if (g === "method") f.method = k;
  else if (g === "card") f.card = k;
  else if (g === "status") f.status = k;
  else {
    f.period = "month";
    ui.fin.ym = k;
  }
  f.view = "list";
  f.limit = 100;
  render();
};
function downloadFile(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2e3);
}
ACT.txCsv = () => {
  const L = txFiltered(), q2 = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const rows = [
    ["Data", "Tipo", "Descrição", "Categoria", "Subcategoria", "Pagamento", "Cartão", "Parcela", "Valor", "Status"].join(";"),
    ...L.map((t) => [t.date, t.type === "in" ? "Entrada" : "Saída", q2(t.desc), q2(t.cat), q2(t.sub || ""), METHODS[t.method] || "", q2(cardOf(t.cardId)?.name || ""), t.of > 1 ? t.no + "/" + t.of : "", String(t.type === "in" ? t.amount : -t.amount).replace(".", ","), STAT[stat(t)][0]].join(";"))
  ];
  downloadFile("transacoes-" + (ui.fin.f.period === "month" ? ui.fin.ym : ui.fin.f.period) + ".csv", "﻿" + rows.join("\n"), "text/csv;charset=utf-8");
  toast(L.length + " transações exportadas");
};
