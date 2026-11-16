"use strict";
/* Comando por voz: "nota comprar pão", "tarefa enviar proposta", "reunião amanhã 14h", "gasto 45 mercado"…
   Converte a fala em texto, normaliza para o formato que o criador por texto (parseNL) entende e executa. */
const VoiceCmd = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = () => !!SR;
  const ADD = "(?:por favor\\s+)?(?:adicionar|adicione|adiciona|criar|crie|cria|nova|novo|fazer|faca|registrar|registre|anotar|anote)?";
  const RULES = [
    [new RegExp("^" + ADD + "\\s*(?:uma?\\s+)?(?:nota|anotacao)\\s*(?:que|sobre|de|:)?\\s+(.+)$"), 1, () => "nota: "],
    [/^(?:anote|anotar)\s+(?:que\s+)?(.+)$/, 1, () => "nota: "],
    [new RegExp("^" + ADD + "\\s*(?:uma?\\s+)?tarefa\\s*(?:de|para|:)?\\s+(.+)$"), 1, () => "tarefa: "],
    [/^(?:lembrar|lembre-me|me lembre)\s+(?:de\s+)?(.+)$/, 1, () => "tarefa: lembrar de "],
    [new RegExp("^" + ADD + "\\s*(?:uma?\\s+)?(?:lista de desejos|desejo)\\s*(?:de|:)?\\s+(.+)$"), 1, () => "desejo: "],
    [new RegExp("^" + ADD + "\\s*(?:um\\s+)?(gasto|despesa|receita|entrada)\\s+(?:de\\s+)?(.+)$"), 2, (m) => m[1] + " "],
    [/^(?:adicionar|adicione|criar|crie|novo|nova|agendar|agende|marcar|marque)\s+(?:um\s+|uma\s+)?(?:(evento|compromisso|reuniao|consulta|aula|call)(?:\s+(?:de|para))?[\s:]+)?(.+)$/, 2, (m) => "agendar " + (m[1] && !/^(evento|compromisso)$/.test(m[1]) ? m[1] + " " : "")]
  ];
  function normalize(text) {
    const t = String(text || "").trim().replace(/[.!?,]+$/, ""), n = norm(t);
    for (const [re, k, pre] of RULES) {
      const m = n.match(re);
      if (m && m[k]) return pre(m) + t.slice(t.length - m[k].length);
    }
    return t;
  }
  /** Escuta uma frase (para sozinho ao parar de falar). Devolve o reconhecedor (r.stop() cancela). */
  function listen({ onInterim, onFinal, onEnd, onError }) {
    if (!SR) { onError && onError("unsupported"); return null; }
    const r = new SR();
    r.lang = "pt-BR"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    let got = "";
    r.onresult = (ev) => {
      let it = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) got += res[0].transcript + " "; else it += res[0].transcript;
      }
      onInterim && onInterim((got + it).trim());
    };
    r.onerror = (e) => onError && onError(e.error);
    r.onend = () => { onEnd && onEnd(); got.trim() && onFinal && onFinal(got.trim()); };
    try { r.start(); } catch (e) { onError && onError("busy"); return null; }
    return r;
  }
  /** Interpreta e executa. Devolve o resultado do parser ou null se não entendeu. */
  function execute(text) {
    const cmd = normalize(text), r = typeof parseNL === "function" ? parseNL(cmd) : null;
    if (r && r.g === "Criar") { r.run(); return r; }
    return null;
  }
  const ERR = { "not-allowed": "Permita o acesso ao microfone para usar comandos de voz.", "service-not-allowed": "Permita o acesso ao microfone para usar comandos de voz.", unsupported: "Este navegador não suporta reconhecimento de voz (use Chrome, Edge ou Safari).", network: "Sem conexão com o serviço de voz.", "audio-capture": "Nenhum microfone encontrado." };
  return { supported, normalize, listen, execute, ERR };
})();
