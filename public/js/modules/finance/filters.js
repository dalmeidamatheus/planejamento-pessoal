"use strict";
function finTx() {
  const f = ui.fin.f;
  return `<div class="toolbar"><input type="text" style="width:220px" placeholder="Buscar…" value="${esc(f.q)}" data-in="finF" data-k="q">
   <select style="width:130px" data-ch="finF" data-k="type"><option value="">Todos os tipos</option><option value="in" ${f.type === "in" ? "selected" : ""}>Entradas</option><option value="out" ${f.type === "out" ? "selected" : ""}>Saídas</option></select>
   <select style="width:130px" data-ch="finF" data-k="status"><option value="">Todo status</option>${Object.entries(STAT).map(([k, v]) => `<option value="${k}" ${f.status === k ? "selected" : ""}>${v[0]}</option>`).join("")}</select>
   <select style="width:150px" data-ch="finF" data-k="cat"><option value="">Todas as categorias</option>${[...new Set([...CATS_OUT, ...CATS_IN])].map((c) => `<option ${f.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select>
   <div class="grow"></div><button class="btn" data-act="txCsv">Exportar CSV</button></div>
   <div class="card" style="padding:6px 10px" id="txList">${txRows()}</div><p class="muted sm">Despesas no cartão entram no mês de vencimento da fatura (cada parcela no seu mês).</p>`;
}
INP.finF = (el) => {
  ui.fin.f[el.dataset.k] = el.value;
  $("#txList").innerHTML = txRows();
};
function downloadFile(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2e3);
}
ACT.txCsv = () => {
  const f = ui.fin.f, q = norm(f.q);
  const L = monthTx(ui.fin.ym).filter((t) => (!f.type || t.type === f.type) && (!f.status || stat(t) === f.status) && (!f.cat || t.cat === f.cat) && (!q || norm(t.desc + " " + t.cat + " " + (t.sub || "")).includes(q)));
  const q2 = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const rows = [
    ["Data", "Tipo", "Descrição", "Categoria", "Subcategoria", "Pagamento", "Cartão", "Parcela", "Valor", "Status"].join(";"),
    ...L.map((t) => [t.date, t.type === "in" ? "Entrada" : "Saída", q2(t.desc), q2(t.cat), q2(t.sub || ""), METHODS[t.method] || "", q2(cardOf(t.cardId)?.name || ""), t.of > 1 ? t.no + "/" + t.of : "", String(t.type === "in" ? t.amount : -t.amount).replace(".", ","), STAT[stat(t)][0]].join(";"))
  ];
  downloadFile("transacoes-" + ui.fin.ym + ".csv", "\uFEFF" + rows.join("\n"), "text/csv;charset=utf-8");
  toast(L.length + " transações exportadas");
};
