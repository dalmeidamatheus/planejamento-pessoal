const { fetchPrice } = require("../lib/price");
const BUDGET_MS = 5e4;
module.exports = async (req, res) => {
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, CRON_SECRET: secret } = process.env;
  if (!secret) return res.status(501).json({ error: "Defina CRON_SECRET" });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "Não autorizado" });
  if (!url || !key) return res.status(501).json({ error: "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY" });
  const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const started = Date.now();
  const today = new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 10);
  let checked = 0, changed = 0, errors = 0;
  const usersRes = await fetch(`${url}/rest/v1/user_data?select=user_id,wishlist:data->wishlist&limit=1000`, { headers: H });
  if (!usersRes.ok) return res.status(502).json({ error: "Falha ao ler usuários" });
  const users = (await usersRes.json()).filter((u) => Array.isArray(u.wishlist));
  for (const u of users) {
    const items = u.wishlist.filter((i) => i && i.monitor && !i.bought && i.url && i.id).slice(0, 40);
    if (!items.length) continue;
    const wr = await fetch(`${url}/rest/v1/price_watch?user_id=eq.${u.user_id}&select=item_id,last_price,history`, { headers: H });
    const prev = Object.fromEntries((wr.ok && await wr.json() || []).map((r) => [r.item_id, r]));
    const rows = [];
    for (let i = 0; i < items.length; i += 4) {
      if (Date.now() - started > BUDGET_MS) break;
      const chunk = items.slice(i, i + 4);
      const out = await Promise.allSettled(chunk.map((it) => fetchPrice(it.url)));
      out.forEach((r, k) => {
        const it = chunk[k], old = prev[it.id], now = (new Date()).toISOString();
        checked++;
        if (r.status === "rejected") {
          errors++;
          rows.push({ user_id: u.user_id, item_id: it.id, url: it.url, last_price: old?.last_price ?? null, last_checked: now, last_error: String(r.reason.message).slice(0, 200), history: old?.history || [] });
          return;
        }
        const price = Math.round(r.value.price * 100) / 100;
        const history = Array.isArray(old?.history) ? [...old.history] : [];
        if (old?.last_price == null || Number(old.last_price) !== price) {
          history.push({ d: today, p: price });
          if (old?.last_price != null) changed++;
        }
        rows.push({ user_id: u.user_id, item_id: it.id, url: it.url, last_price: price, last_checked: now, last_error: null, history: history.slice(-200) });
      });
    }
    if (rows.length) {
      await fetch(`${url}/rest/v1/price_watch?on_conflict=user_id,item_id`, {
        method: "POST",
        headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows)
      });
    }
  }
  return res.status(200).json({ users: users.length, checked, changed, errors, ms: Date.now() - started });
};
