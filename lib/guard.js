/* BARREIRA DE FINANÇAS: nenhum dado financeiro pode chegar a um provedor de IA.
   Três camadas independentes:
   1. Arquitetura: só estes endpoints falam com IA (summarize, ocr, transcribe, diet) e cada um aceita uma lista FIXA de
      campos (only()). Os dados de finanças (lançamentos, cartões, orçamentos, metas, investimentos, saldo, renda) nunca são
      lidos por esses endpoints nem pelos módulos de IA do navegador — o scripts/check.js falha o build se isso mudar.
   2. Filtro de conteúdo (scrub): todo texto livre é limpo antes de sair para a IA — cartões (Luhn), CPF, CNPJ,
      agência/conta/Pix/CVV/senha/saldo/fatura/limite com número e valores em reais viram marcadores.
   3. Limite conhecido: imagens (foto → texto, foto de refeição) são enviadas como estão e não dá para inspecioná-las;
      não envie extratos, faturas ou documentos financeiros nesses recursos. */
const luhn = (d) => {
  let s = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; }
  return s % 10 === 0;
};

function scrub(text) {
  let s = String(text == null ? "" : text);
  s = s.replace(/\b(?:\d[ -]?){12,18}\d\b/g, (m) => { const d = m.replace(/\D/g, ""); return d.length >= 13 && d.length <= 19 && luhn(d) ? "[cartão]" : m; });
  s = s.replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[cnpj]");
  s = s.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]");
  s = s.replace(/\b(ag[eê]ncia|ag\.?|conta(?:\s+corrente|\s+poupan[cç]a)?|c\/c|iban|cvv|cvc|senha|chave\s+pix|pix|saldo|fatura|limite)\b\s*(?:n[º°o.]*\s*)?[:\-]?\s*[\d.\-\/xX]{3,}/gi, "$1: [oculto]");
  s = s.replace(/R\$\s*\d[\d.]*(?:,\d{1,2})?/gi, "[valor]");
  s = s.replace(/\b\d[\d.]*(?:,\d{1,2})?\s*(?:mil\s+)?(?:reais|real)\b/gi, "[valor]");
  return s;
}

/** Rejeita campos fora da lista permitida (evita que alguém passe dados extras, como finanças, para a IA). */
function only(body, allowed) {
  if (!body || typeof body !== "object") return ["corpo"];
  return Object.keys(body).filter((k) => !allowed.includes(k));
}

module.exports = { scrub, only };
