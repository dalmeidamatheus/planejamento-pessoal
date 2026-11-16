const { userFromToken, bearer } = require("../lib/auth");
const ai = require("../lib/ai");
/* Quais recursos de IA estão ativos neste servidor (só o nome do provedor; nunca as chaves). */
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!await userFromToken(bearer(req))) return res.status(401).json({ error: "Não autenticado" });
  return res.status(200).json(ai.status());
};
