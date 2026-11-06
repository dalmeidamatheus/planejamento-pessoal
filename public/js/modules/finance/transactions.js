"use strict";
function txRows() {
  const f = ui.fin.f, q = norm(f.q);
  const L = monthTx(ui.fin.ym).filter((t) => (!f.type || t.type === f.type) && (!f.status || stat(t) === f.status) && (!f.cat || t.cat === f.cat) && (!q || norm(t.desc + " " + t.cat + " " + (t.sub || "")).includes(q)));
  if (!L.length) return `<div class="empty">Nenhuma transação neste filtro.</div>`;
  return `<table class="tb"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th class="num">Valor</th><th>Status</th><th></th></tr></thead><tbody>` + L.map((t) => {
    const s = stat(t), c = t.cardId ? cardOf(t.cardId) : null;
    return `<tr class="cl" data-act="openTx" data-id="${t.id}"><td class="muted">${fmtDay(t.date)}</td><td>${esc(t.desc)} ${t.of > 1 ? `<span class="pill">${t.no}/${t.of}</span>` : ""}${t.virtual || t.tpl ? `<span class="muted" title="Recorrente">${ic("repeat", 12)}</span>` : ""}</td>
    <td><span class="dot" style="--c:${catColor(t.cat)}"></span> ${esc(t.cat)}${t.sub ? `<span class="muted sm"> · ${esc(t.sub)}</span>` : ""}</td><td class="muted">${METHODS[t.method] || "—"}${c ? " · " + esc(c.name) : ""}</td>
    <td class="num ${t.type === "in" ? "pos" : ""}">${t.type === "in" ? "+" : "−"} ${brl(t.amount)}</td><td><span class="pill ${STAT[s][1]}">${STAT[s][0]}</span></td>
    <td class="num"><button class="btn sm ghost" data-act="txPay" data-id="${t.id}" title="${s === "paid" ? "Marcar como pendente" : "Marcar como pago"}">${ic("check", 14)}</button></td></tr>`;
  }).join("") + "</tbody></table>";
}
