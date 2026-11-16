"use strict";
/* Transcrição de voz em tempo real (independente de tela).
   Motor "browser": Web Speech API — instantâneo, mostra texto provisório enquanto você fala.
   Motor "whisper": grava trechos de ~12 s e envia para /api/transcribe (mais preciso; requer OPENAI_API_KEY no servidor).
   No modo whisper o texto provisório do navegador continua aparecendo, e o texto final vem do Whisper. */
/* Whisper rodando no próprio navegador (Transformers.js): grátis, sem chave, funciona offline depois do 1º download (~75 MB). */
const LocalWhisper = (() => {
  let pipe = null, loading = null;
  const LANG = { pt: "portuguese", en: "english", es: "spanish", fr: "french", de: "german", it: "italian" };
  async function load() {
    if (pipe) return pipe;
    if (!loading) loading = (async () => {
      const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
      pipe = await pipeline("automatic-speech-recognition", "Xenova/whisper-base");
      return pipe;
    })().catch((e) => { loading = null; throw e; });
    return loading;
  }
  async function pcm(blob) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    try { return (await ctx.decodeAudioData(await blob.arrayBuffer())).getChannelData(0); } finally { ctx.close(); }
  }
  async function run(blob, lang) {
    const p = await load();
    const r = await p(await pcm(blob), { language: LANG[lang] || "portuguese", task: "transcribe", chunk_length_s: 30 });
    return String(r.text || "").trim();
  }
  return { run, ready: () => !!pipe };
})();

const Transcriber = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = () => !!SR;
  const CMDS = [[/\b(ponto de interrogação|interrogação)\b/gi, "?"], [/\bponto de exclamação\b/gi, "!"], [/\b(ponto final)\b/gi, "."], [/\bvírgula\b/gi, ","], [/\bdois pontos\b/gi, ":"], [/\bponto e vírgula\b/gi, ";"], [/\b(nova linha|próximo parágrafo|novo parágrafo)\b/gi, "\n"]];
  function polish(t) {
    t = String(t || "").trim();
    CMDS.forEach(([r, s]) => (t = t.replace(r, s)));
    t = t.replace(/\s+([,.;:?!])/g, "$1").replace(/([,.;:?!])(?=[^\s\d,.;:?!])/g, "$1 ").replace(/ *\n */g, "\n").trim();
    if (!t) return "";
    t = t.charAt(0).toUpperCase() + t.slice(1);
    return /[.!?:]$/.test(t) ? t : t + (t.length > 25 ? "." : "");
  }
  function b64(blob) {
    return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(blob); });
  }
  async function start(o) {
    const h = { on: true, t0: Date.now(), lastFinal: "", lastAt: 0, whisper: o.engine === "whisper", rec: null, stream: null, mr: null, q: Promise.resolve(), cut: null };
    const emit = (text) => {
      text = polish(text);
      if (!text) return;
      const now = Date.now();
      const gap = h.lastAt ? now - h.lastAt : Infinity;
      h.lastAt = now;
      o.onFinal({ text, t: now - h.t0, newPara: gap > 7000 });
    };
    try {
      h.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      o.onError && o.onError("mic");
      return null;
    }
    if (SR) {
      const r = new SR();
      r.lang = o.lang || "pt-BR"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
      r.onresult = (ev) => {
        let it = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (!res.isFinal) { it += res[0].transcript; continue; }
          if (h.whisper && !h.whisperFailed) continue;
          let t = res[0].transcript.trim();
          const prev = h.lastFinal;
          if (prev && t.toLowerCase() === prev.toLowerCase()) continue;
          if (prev && prev.length > 3 && t.toLowerCase().startsWith(prev.toLowerCase())) t = t.slice(prev.length).trim();
          if (!t) continue;
          h.lastFinal = res[0].transcript.trim();
          emit(t);
        }
        o.onInterim && o.onInterim(it);
      };
      r.onend = () => { if (h.on) setTimeout(() => { if (h.on) try { r.start(); } catch {} }, 250); };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") { h.on = false; o.onError && o.onError("mic"); }
        else if (e.error === "network") o.onError && o.onError("network");
      };
      h.rec = r;
      try { r.start(); } catch {}
    } else if (!h.whisper) {
      h.stream.getTracks().forEach((t) => t.stop());
      o.onError && o.onError("unsupported");
      return null;
    }
    if (h.whisper) {
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
      if (!mime) { h.whisper = false; o.onError && o.onError("whisper-unavailable"); }
      else {
        const viaServer = async (blob) => {
          const tk = sb ? ((await sb.auth.getSession()).data.session || {}).access_token : "";
          const res = await fetch((typeof CONFIG !== "undefined" && CONFIG.TRANSCRIBE_ENDPOINT) || "/api/transcribe", { method: "POST", headers: { "Content-Type": "application/json", ...(tk ? { Authorization: "Bearer " + tk } : {}) }, body: JSON.stringify({ audio: await b64(blob), mime: blob.type, lang: (o.lang || "pt-BR").slice(0, 2) }) });
          if (res.status === 501 || res.status === 404) { h.serverDead = true; throw new Error("sem servidor"); }
          if (!res.ok) throw new Error(String(res.status));
          return String((await res.json()).text || "");
        };
        const send = (blob) => {
          if (blob.size < 2000) return;
          h.q = h.q.then(async () => {
            let t = null;
            if (!h.serverDead) { try { t = await viaServer(blob); } catch {} }
            if (t === null && !h.localDead) {
              try {
                if (!LocalWhisper.ready()) o.onError && o.onError("local-loading");
                t = await LocalWhisper.run(blob, (o.lang || "pt-BR").slice(0, 2));
              } catch { h.localDead = true; }
            }
            if (t === null) {
              if (!h.whisperFailed) { h.whisperFailed = true; o.onError && o.onError("whisper-unavailable"); }
              return;
            }
            if (t.trim()) emit(t);
          });
        };
        const cycle = () => {
          if (!h.on) return;
          const mr = new MediaRecorder(h.stream, { mimeType: mime }), parts = [];
          mr.ondataavailable = (e) => e.data && e.data.size && parts.push(e.data);
          mr.onstop = () => send(new Blob(parts, { type: mime }));
          mr.start();
          h.mr = mr;
          h.cut = setTimeout(() => { try { mr.stop(); } catch {} cycle(); }, 12000);
        };
        cycle();
      }
    }
    h.stop = async () => {
      h.on = false;
      clearTimeout(h.cut);
      try { h.rec && h.rec.stop(); } catch {}
      try { h.mr && h.mr.state !== "inactive" && h.mr.stop(); } catch {}
      await new Promise((r) => setTimeout(r, 300));
      await h.q;
      h.stream && h.stream.getTracks().forEach((t) => t.stop());
    };
    return h;
  }
  return { start, supported, polish };
})();
