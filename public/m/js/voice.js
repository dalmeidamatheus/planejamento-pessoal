"use strict";
/* Comando por voz (celular): toque no 🎙 da barra superior e diga "nota comprar pão", "tarefa enviar proposta",
   "reunião amanhã 14h", "gasto 45 mercado"… O parser de texto é o mesmo do desktop (palette/nl-parser.js). */
(() => {
  // o parser navega com go("calendar"/"finance"/…): traduz para as telas do app mobile
  const ROUTES = { calendar: "agenda", finance: "more", habits: "more", wishlist: "more", trips: "more" };
  const go0 = go;
  go = (v) => go0(ROUTES[v] || v);
})();
let vReco = null;
const vStop = () => { if (vReco) { try { vReco.stop(); } catch {} vReco = null; } };
function voiceListen() {
  const box = $("#vbox");
  if (!box) return;
  box.classList.add("on");
  $("#vtxt").textContent = "Ouvindo…";
  $("#vretry").classList.add("hidden");
  vReco = VoiceCmd.listen({
    onInterim: (t) => { $("#vtxt") && ($("#vtxt").textContent = t || "Ouvindo…"); },
    onFinal: (t) => {
      let r = null;
      try { r = VoiceCmd.execute(t); } catch (e) { console.error(e); }
      if (r) { closeModal(); toast("🎙 " + r.label); return; }
      if ($("#vtxt")) { $("#vtxt").textContent = "Não entendi “" + t + "”"; $("#vretry").classList.remove("hidden"); }
    },
    onEnd: () => { vReco = null; const b = $("#vbox"); b && b.classList.remove("on"); },
    onError: (e) => {
      if (e === "no-speech" || e === "aborted") { if ($("#vtxt")) { $("#vtxt").textContent = "Não ouvi nada"; $("#vretry").classList.remove("hidden"); } return; }
      toast(VoiceCmd.ERR[e] || "Não consegui ouvir", true);
    }
  });
}
ACT.voiceOpen = () => {
  if (!VoiceCmd.supported()) { toast(VoiceCmd.ERR.unsupported, true); return; }
  openLayer(`<h2>Comando por voz</h2><div class="vbox" id="vbox"><button class="vmic" data-act="voiceRetry" aria-label="Falar">${mIc("mic", 34)}</button></div><p class="vtxt" id="vtxt">Ouvindo…</p><div class="stack"><button class="btn big hidden" id="vretry" data-act="voiceRetry">Tentar de novo</button><button class="btn big" data-act="layerClose">Fechar</button></div>`, { cls: "ask" });
  voiceListen();
};
ACT.voiceRetry = () => { vStop(); voiceListen(); };
