"use strict";
async function apiPost(path, body) {
  let tk = "";
  try {
    if (sb) tk = (await sb.auth.getSession()).data.session?.access_token || "";
  } catch {
  }
  try {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", ...tk ? { Authorization: "Bearer " + tk } : {} }, body: JSON.stringify(body) });
    let j = null;
    try {
      j = await r.json();
    } catch {
    }
    return { ok: r.ok, status: r.status, json: j };
  } catch {
    return { ok: false, status: 0, json: null };
  }
}
const apiErr = (r) => r.status === 401 ? "Entre com uma conta (Supabase) para usar a verificação de preços." : r.status === 404 || r.status === 0 ? "Função /api/price indisponível (só funciona no deploy da Vercel)." : r.status === 422 ? "Não consegui identificar o preço nessa página. Atualize manualmente." : r.json?.error || "Falha ao consultar o link";
async function loadWatch() {
  if (!sb) return;
  try {
    const { data } = await sb.from("price_watch").select("item_id,last_price,last_checked,last_error,history");
    (data || []).forEach((r) => watchRows[r.item_id] = r);
  } catch {
  }
  wishTick();
  if (view === "wishlist") render();
}
function wishTick() {
  if (!S) return;
  let changed = false;
  S.wishlist.forEach((it) => {
    if (it.bought) return;
    const p = curPrice(it);
    if (it.seenPrice == null) {
      it.seenPrice = p;
      changed = true;
      return;
    }
    if (p !== it.seenPrice) {
      const pc = (p - it.seenPrice) / it.seenPrice * 100;
      pushNotif(`${p < it.seenPrice ? "🏷️ Preço caiu" : "📈 Preço subiu"}: ${it.name} — ${brl(it.seenPrice)} → ${brl(p)} (${signedPct(pc)})`, "w:" + it.id + ":" + p);
      it.seenPrice = p;
      changed = true;
    }
    if (it.target > 0) {
      if (p <= it.target && !it.tHit) {
        pushNotif(`🎯 ${it.name} chegou ao preço-alvo: ${brl(p)} (alvo ${brl(it.target)})`, "wt:" + it.id + ":" + p);
        it.tHit = true;
        changed = true;
      } else if (p > it.target && it.tHit) {
        it.tHit = false;
        changed = true;
      }
    }
  });
  if (changed) save();
}
async function checkItem(it) {
  const r = await apiPost("/api/price", { url: it.url });
  it.lastCheck = Date.now();
  if (!r.ok) return { ok: false, msg: apiErr(r) };
  const before = curPrice(it);
  addPoint(it, r.json.price);
  if (!it.img && r.json.image) it.img = r.json.image;
  save();
  wishTick();
  return { ok: true, price: r.json.price, changed: R2(r.json.price) !== before };
}
ACT.wishCheck = async (el) => {
  const it = S.wishlist.find((x) => x.id === el.dataset.id);
  el.disabled = true;
  el.textContent = "Verificando…";
  const r = await checkItem(it);
  if (!r.ok) toast(r.msg, true);
  else toast(r.changed ? "Preço mudou: " + brl(r.price) : "Preço mantido: " + brl(r.price));
  openWish(it.id);
  render();
};
ACT.wishCheckAll = async (el) => {
  const L = S.wishlist.filter((i) => !i.bought && i.monitor && i.url);
  el.disabled = true;
  let ch = 0, fail = 0;
  for (const it of L) {
    el.textContent = `Verificando ${ch + fail + 1}/${L.length}…`;
    const r = await checkItem(it);
    if (!r.ok) fail++;
    else if (r.changed) ch++;
  }
  render();
  toast(`${L.length} verificados · ${ch} com preço novo${fail ? " · " + fail + " falharam" : ""}`, !!fail && !ch);
};
ACT.wishFetch = async (el) => {
  const f = el.closest("form"), url = f.elements.url.value.trim();
  if (!url) {
    toast("Cole o link do produto primeiro", true);
    return;
  }
  el.disabled = true;
  el.textContent = "Buscando…";
  const r = await apiPost("/api/price", { url });
  el.disabled = false;
  el.textContent = "Buscar dados";
  if (!r.ok) {
    toast(apiErr(r), true);
    return;
  }
  const d = r.json;
  if (!f.elements.nm.value && d.title) f.elements.nm.value = d.title.slice(0, 120);
  f.elements.price.value = d.price;
  f.elements.img.value = d.image || "";
  toast(`Encontrado: ${brl(d.price)}${d.source === "texto" ? " (confira o valor — baixa confiança)" : ""}`);
};
