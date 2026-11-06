const { fetchPrice } = require("../lib/price");
const { userFromToken, bearer } = require("../lib/auth");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  const anon = process.env.ALLOW_ANON_PRICE_CHECK === "1" && !process.env.SUPABASE_URL;
  if (!anon && !await userFromToken(bearer(req))) return res.status(401).json({ error: "Não autenticado" });
  let url = "";
  try {
    url = String((typeof req.body === "string" ? JSON.parse(req.body) : req.body)?.url || "").trim();
  } catch {
    return res.status(400).json({ error: "JSON inválido" });
  }
  if (!url || url.length > 2e3) return res.status(400).json({ error: "URL inválida" });
  try {
    const r = await fetchPrice(url);
    return res.status(200).json({ price: Math.round(r.price * 100) / 100, currency: r.currency, title: r.title, image: r.image, source: r.source });
  } catch (e) {
    if (e.code === "PRICE_NOT_FOUND") return res.status(422).json({ error: e.message });
    if (e.code === "BAD_URL") return res.status(400).json({ error: e.message });
    if (/^HTTP_/.test(e.code || "")) return res.status(502).json({ error: e.message });
    return res.status(502).json({ error: "Não foi possível acessar o link" });
  }
};
