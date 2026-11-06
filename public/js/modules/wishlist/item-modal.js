"use strict";
let dWish = null;
ACT.newWish = () => openWishForm(null);
ACT.openWish = (el) => openWish(el.dataset.id);
ACT.wishEdit = (el) => openWishForm(el.dataset.id);
function openWish(id) {
  const it = S.wishlist.find((x) => x.id === id);
  if (!it) return;
  const p = curPrice(it), fin = financing(it, p), h = priceHist(it), ch = priceChange(it), w = watchRows[it.id], pct = pctOf(p);
  const rows = h.map((x, k) => {
    const pc = k ? (x.p - h[k - 1].p) / h[k - 1].p * 100 : null;
    return { l: fmtDay(x.d), v: x.p, t: `${brl(x.p)}${pc != null ? ` (${signedPct(pc)})` : " — início"}<br>${fmtDayL(x.d)}/${x.d.slice(0, 4)}` };
  });
  const lastCheck = Math.max(it.lastCheck || 0, w?.last_checked ? Date.parse(w.last_checked) : 0);
  const need = it.by ? p / monthsUntil(it.by) : 0;
  modal(`<div class="row" style="margin-bottom:4px"><h2 class="grow" style="margin:0">${esc(it.name)}</h2>${it.prio ? `<span class="pill ${PRIO[it.prio].c}">${PRIO[it.prio].n}</span>` : ""}${it.bought ? '<span class="pill">comprado</span>' : ""}</div>
   <div class="row" style="margin-bottom:12px"><span style="font-size:26px;font-weight:600;letter-spacing:-.02em">${brl(p)}</span>${ch ? `<span class="pill ${ch.pct < 0 ? "ok" : "bad"}">${ch.pct < 0 ? "▼" : "▲"} ${signedPct(ch.pct)} em ${fmtDay(ch.d)}</span>` : ""}</div>
   <div class="cols c3" style="margin-bottom:12px;gap:8px">
    <div class="card flat stat" style="padding:10px"><div class="l">% do salário (à vista)</div><div class="v" style="font-size:18px">${fmtPct(pct)}</div></div>
    <div class="card flat stat" style="padding:10px"><div class="l">${fin.n > 1 ? fin.n + "× de" : "Parcela"}</div><div class="v" style="font-size:18px">${brl(fin.parcela)}</div><div class="s">${fin.n > 1 ? fmtPct(pctOf(fin.parcela)) + " do salário/mês" : ""}</div></div>
    <div class="card flat stat" style="padding:10px"><div class="l">Total parcelado</div><div class="v" style="font-size:18px">${brl(fin.total)}</div><div class="s ${fin.juros > 5e-3 ? "neg" : ""}">${fin.juros > 5e-3 ? "juros: " + brl(fin.juros) : fin.n > 1 ? "sem juros" : "à vista"}</div></div></div>
   ${it.by ? `<div class="sm" style="margin-bottom:10px">📅 Para comprar até ${fmtDay(it.by)}/${it.by.slice(0, 4)}, separe <b>${brl(need)}/mês</b> (${fmtPct(pctOf(need))} do salário).</div>` : ""}
   <div class="hd" style="display:flex;justify-content:space-between;margin:14px 0 6px"><h2>Histórico de preço</h2><span class="muted sm">apenas datas em que o preço mudou</span></div>
   ${h.length ? lineChart(rows, { h: 190, c: "#2f9e6b", zero: false, step: true, fmt: (v) => "R$" + Math.round(v) }) : ""}
   ${h.length < 2 ? `<div class="muted sm" style="margin:6px 0">Ainda sem alterações. ${it.monitor ? "O monitor registra aqui quando o preço mudar." : "Ative o monitoramento ou atualize o preço manualmente para formar o histórico."}</div>` : `<div class="row sm muted" style="margin:6px 0"><span>Menor: <b style="color:var(--ok)">${brl(ch.min)}</b></span><span>Maior: <b>${brl(ch.max)}</b></span></div>
    <div class="list sm" style="max-height:130px;overflow:auto">${[...h].reverse().slice(0, 8).map((x, k, a) => {
    const prev = a[k + 1];
    const pc = prev ? (x.p - prev.p) / prev.p * 100 : null;
    return `<div class="it" style="cursor:default;padding:5px 4px"><span class="muted" style="width:76px">${fmtDay(x.d)}/${x.d.slice(2, 4)}</span><span class="grow">${brl(x.p)}</span>${pc != null ? `<span class="pill ${pc < 0 ? "ok" : "bad"}">${signedPct(pc)}</span>` : '<span class="pill">início</span>'}</div>`;
  }).join("")}</div>`}
   <label class="row sm" style="margin:12px 0 4px"><input type="checkbox" data-ch="wishMonitor" data-id="${it.id}" ${it.monitor ? "checked" : ""}> Monitorar preço pelo link e avisar quando mudar</label>
   <div class="muted sm">${it.url ? lastCheck ? "Última verificação: " + new Date(lastCheck).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Ainda não verificado." : "Adicione o link do produto para monitorar."}${w?.last_error ? ` · último erro: ${esc(w.last_error)}` : ""}</div>
   ${it.notes ? `<div class="sm" style="margin-top:8px;white-space:pre-wrap">${esc(it.notes)}</div>` : ""}
   <div class="foot" style="flex-wrap:wrap;justify-content:flex-start">
    ${it.url ? `<a class="btn" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${ic("link")}Abrir link</a><button class="btn" data-act="wishCheck" data-id="${it.id}">Verificar preço</button>` : ""}
    <button class="btn" data-act="wishPrice" data-id="${it.id}">Atualizar preço</button>
    <button class="btn" data-act="wishTx" data-id="${it.id}">Registrar compra</button>
    <button class="btn" data-act="wishBought" data-id="${it.id}">${it.bought ? "Voltar p/ desejos" : "Marcar comprado"}</button>
    <span class="grow"></span><button class="btn" data-act="wishEdit" data-id="${it.id}">Editar</button><button class="btn danger" data-act="wishDel" data-id="${it.id}">${ic("trash")}</button></div>`, { wide: true });
}
INP.wishMonitor = (el) => {
  const it = S.wishlist.find((x) => x.id === el.dataset.id);
  if (!it) return;
  if (el.checked && !it.url) {
    el.checked = false;
    toast("Adicione o link do produto (Editar) para monitorar", true);
    return;
  }
  it.monitor = el.checked;
  save();
  render();
  toast(it.monitor ? "Monitoramento ativado — checagem diária pelo servidor" : "Monitoramento desativado");
};
ACT.wishBought = (el) => {
  const it = S.wishlist.find((x) => x.id === el.dataset.id);
  it.bought = !it.bought;
  if (it.bought) it.monitor = false;
  save();
  closeModal();
  render();
  toast(it.bought ? "Marcado como comprado 🎉" : "Voltou para a lista");
};
ACT.wishDel = (el) => {
  if (!confirmDlg("Excluir este item da lista de desejos?")) return;
  S.wishlist = S.wishlist.filter((x) => x.id !== el.dataset.id);
  save();
  closeModal();
  render();
};
ACT.wishTx = (el) => {
  const it = S.wishlist.find((x) => x.id === el.dataset.id);
  closeModal();
  ui.fin.tab = "tx";
  openTx(null, { fields: { type: "out", desc: it.name, amount: curPrice(it), cat: "Compras", status: "pending" } });
  toast("Salve a transação e marque o item como comprado");
};
ACT.wishPrice = (el) => {
  const it = S.wishlist.find((x) => x.id === el.dataset.id);
  modal(`<form data-form="wishPrice"><h2>Atualizar preço</h2><p class="muted sm">Se o valor mudou, um novo ponto entra no histórico de hoje.</p><input type="hidden" name="id" value="${it.id}">
   <label class="field"><span>Novo preço à vista (R$)</span><input type="number" step="0.01" min="0.01" name="price" value="${curPrice(it)}" required></label>
   <div class="foot"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
};
SUBMIT.wishPrice = (f, fd) => {
  const it = S.wishlist.find((x) => x.id === fd.get("id"));
  addPoint(it, +fd.get("price"));
  save();
  wishTick();
  openWish(it.id);
  render();
};
function openWishForm(id, pre) {
  const it = id ? S.wishlist.find((x) => x.id === id) : Object.assign({ name: "", url: "", price: "", prio: "media", inst: 1, rate: 0, target: "", by: "", monitor: false, notes: "", img: "" }, pre || {});
  dWish = id;
  modal(`<form data-form="wish"><h2>${id ? "Editar item" : "Novo item"}</h2>
   <label class="field"><span>Link do produto</span><div class="row"><input type="url" name="url" value="${esc(it.url || "")}" placeholder="https://loja.com/produto"><button type="button" class="btn" data-act="wishFetch">Buscar dados</button></div></label>
   <label class="field"><span>Nome</span><input type="text" name="nm" value="${esc(it.name)}" required placeholder="Ex.: Fone com cancelamento de ruído"></label>
   <input type="hidden" name="img" value="${esc(it.img || "")}">
   <div class="grid3"><label class="field"><span>Preço à vista (R$)</span><input type="number" step="0.01" min="0.01" name="price" value="${id ? curPrice(it) : it.price}" required></label>
    <label class="field"><span>Prioridade</span><select name="prio">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${it.prio === k ? "selected" : ""}>${v.n}</option>`).join("")}</select></label>
    <label class="field"><span>Preço-alvo (avisar se chegar)</span><input type="number" step="0.01" min="0" name="target" value="${it.target || ""}"></label></div>
   <div class="grid3"><label class="field"><span>Parcelas</span><input type="number" min="1" max="60" name="inst" value="${it.inst || 1}"></label>
    <label class="field"><span>Juros (% ao mês)</span><input type="number" step="0.01" min="0" name="rate" value="${it.rate || 0}"></label>
    <label class="field"><span>Quero comprar até</span><input type="date" name="by" value="${it.by || ""}"></label></div>
   <label class="row sm" style="margin-bottom:10px"><input type="checkbox" name="monitor" ${it.monitor ? "checked" : ""}> Monitorar preço pelo link e avisar quando mudar</label>
   <label class="field"><span>Notas</span><textarea name="notes" rows="2">${esc(it.notes || "")}</textarea></label>
   <div class="foot"><span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
}
SUBMIT.wish = (f, fd) => {
  const o = { name: fd.get("nm").trim(), url: fd.get("url").trim(), img: fd.get("img") || "", prio: fd.get("prio"), inst: Math.max(1, +fd.get("inst") || 1), rate: +fd.get("rate") || 0, target: +fd.get("target") || 0, by: fd.get("by"), monitor: !!fd.get("monitor"), notes: fd.get("notes") };
  if (o.monitor && !o.url) {
    toast("Para monitorar, informe o link do produto", true);
    return;
  }
  const price = +fd.get("price");
  let it;
  if (dWish) {
    it = S.wishlist.find((x) => x.id === dWish);
    Object.assign(it, o);
    addPoint(it, price);
  } else {
    it = { id: uid(), ...o, hist: [] };
    addPoint(it, price);
    it.seenPrice = R2(price);
    S.wishlist.push(it);
  }
  save();
  closeModal();
  render();
  toast(dWish ? "Item salvo" : "Item adicionado à lista");
};
