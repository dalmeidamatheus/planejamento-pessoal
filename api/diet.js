const { userFromToken, bearer } = require("../lib/auth");
const ai = require("../lib/ai");
/* Dieta com IA (fila de provedores gratuitos de lib/ai.js):
   - action "parse": texto do plano alimentar -> plano estruturado (refeições, cardápio por dia, opções, regras)
   - action "check": compara o que foi comido (texto e/ou foto) com o plano
   Sem chave configurada responde 501 e o app usa a leitura/conferência local. Não substitui nutricionista. */
const J = (raw) => JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
const VERDICTS = ["dentro", "parcial", "fora"];

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!ai.configured("text")) return res.status(501).json({ error: "IA não configurada" });
  if (!await userFromToken(bearer(req))) return res.status(401).json({ error: "Não autenticado" });
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "JSON inválido" });
  }
  try {
    if (body && body.action === "parse") {
      const text = String(body.text || "").trim().slice(0, 40000);
      if (text.length < 20) return res.status(400).json({ error: "Texto muito curto" });
      const prompt = `Extraia o plano alimentar do texto abaixo. Responda SOMENTE com JSON válido, sem markdown, neste formato:
{"name":"nome curto do plano","meals":[{"id":"cafe","name":"Café da manhã","time":"07:30"}],"days":[{"n":1,"m":{"cafe":"...","almoco":"..."}}],"options":{"cafe":["opção 1","opção 2"]},"add":["..."],"avoid":["..."],"tips":["..."]}
Regras:
- "days": só se o texto trouxer cardápio por dia (um ciclo de N dias). "options": só se trouxer opções por refeição. Pode haver ambos.
- ids curtos, sem acento: cafe, lanche_m, almoco, lanche, jantar, ceia. "time" em HH:MM (estime um horário usual se não houver).
- Em "days.m" use o id da refeição como chave.
- "add" = o que adicionar/incentivar; "avoid" = o que evitar/remover; "tips" = ajustes e dicas de preparo.
- Preserve alimentos e quantidades exatamente como escritos. Não invente nada que não esteja no texto.

TEXTO:
${text}`;
      const valid = (raw) => { const p = J(raw); if (!Array.isArray(p.meals) || !p.meals.length) throw new Error("sem refeições"); };
      const r = await ai.run("text", { prompt, max: 8000, validate: valid });
      return res.status(200).json({ plan: J(r.text), provider: r.name });
    }
    if (body && body.action === "check") {
      const plan = String(body.plan || "").slice(0, 6000), meal = String(body.meal || "refeição").slice(0, 60), text = String(body.text || "").slice(0, 1500);
      if (!text && !body.image) return res.status(400).json({ error: "Informe o que foi comido" });
      const common = `Você é um assistente de acompanhamento de dieta (não é médico nem nutricionista). Compare o que a pessoa comeu com o plano alimentar dela.
Responda SOMENTE com JSON válido, sem markdown:
{"verdict":"dentro|parcial|fora","items":[{"food":"alimento","status":"dentro|fora|nao_consta","note":"explicação curta"}],"summary":"1 a 2 frases","tip":"sugestão prática do que ajustar na próxima refeição (vazio se estiver tudo certo)"}
Critérios: "dentro" = condiz com o plano (mesmo grupo alimentar ou substituição razoável); "fora" = conflita com o plano ou com a lista EVITAR; "nao_consta" = não está no plano mas não é claramente proibido. "verdict" = "fora" se algum item for "fora"; "dentro" se todos forem "dentro"; senão "parcial". Só considere porções se forem informadas. Não invente alimentos.

PLANO DA PESSOA:
${plan}

REFEIÇÃO: ${meal}
`;
      const valid = (raw) => { const p = J(raw); if (!VERDICTS.includes(p.verdict) || !Array.isArray(p.items)) throw new Error("formato"); };
      let r;
      if (body.image) {
        const image = String(body.image), mime = ["image/jpeg", "image/png", "image/webp"].includes(body.mime) ? body.mime : "image/jpeg";
        if (image.length > 6e6) return res.status(400).json({ error: "Imagem grande demais" });
        if (!ai.configured("vision")) return res.status(501).json({ error: "Visão não configurada" });
        r = await ai.run("vision", { prompt: common + "A pessoa enviou uma FOTO da refeição" + (text ? " e escreveu: " + text : "") + ". Identifique os alimentos visíveis (liste-os em items) e avalie.", b64: image, mime, max: 1500, validate: valid });
      } else {
        r = await ai.run("text", { prompt: common + "COMIDO: " + text, max: 1500, validate: valid });
      }
      const p = J(r.text);
      const st = ["dentro", "fora", "nao_consta"];
      return res.status(200).json({ verdict: p.verdict, items: p.items.slice(0, 20).map((i) => ({ food: String(i.food || "").slice(0, 80), status: st.includes(i.status) ? i.status : "nao_consta", note: String(i.note || "").slice(0, 200) })), summary: String(p.summary || "").slice(0, 400), tip: String(p.tip || "").slice(0, 400), provider: r.name });
    }
    return res.status(400).json({ error: "Ação inválida" });
  } catch {
    return res.status(502).json({ error: "Falha ou resposta inválida da IA" });
  }
};
