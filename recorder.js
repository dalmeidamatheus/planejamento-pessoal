"use strict";
const REC = { on: false, r: null, start: 0, noteId: null, interim: "", timer: null, n: 0 };
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const mmss = (ms) => {
  const s = Math.floor(ms / 1e3);
  return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
};
function addLine(text) {
  const n = S.notes.find((x) => x.id === REC.noteId);
  if (!n || !text) return;
  if (!n.body.includes("## Transcrição")) n.body += (n.body.endsWith("\n") ? "" : "\n") + "\n## Transcrição\n";
  n.body += `
- [${mmss(Date.now() - REC.start)}] ${text}`;
  n.updated = Date.now();
  REC.n++;
  save();
  if (ui.notes.sel === n.id && view === "notes") {
    const ta = $("#nb");
    if (ta) {
      ta.value = n.body;
      ta.scrollTop = ta.scrollHeight;
    }
    const p = $("#prev");
    if (p) {
      p.innerHTML = md(n.body);
      p.scrollTop = p.scrollHeight;
    }
  }
}
ACT.recStart = async () => {
  if (!SR) {
    toast("Este navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.", true);
    return;
  }
  if (REC.on) {
    toast("Já há uma gravação em andamento");
    return;
  }
  let n = curNote();
  if (!n) n = newMeetingNote();
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
  } catch {
    toast("Permita o acesso ao microfone para gravar.", true);
    return;
  }
  const r = new SR();
  r.lang = "pt-BR";
  r.continuous = true;
  r.interimResults = true;
  REC.r = r;
  REC.on = true;
  REC.noteId = n.id;
  REC.start = Date.now();
  REC.n = 0;
  REC.interim = "";
  r.onresult = (ev) => {
    let it = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const res = ev.results[i];
      if (res.isFinal) addLine(res[0].transcript.trim());
      else it += res[0].transcript;
    }
    REC.interim = it;
    const l = $("#recLive");
    if (l) l.textContent = it || "Ouvindo…";
  };
  r.onend = () => {
    if (REC.on) try {
      r.start();
    } catch {
    }
  };
  r.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      REC.on = false;
      toast("Permissão do microfone negada", true);
      render();
    }
  };
  try {
    r.start();
  } catch {
  }
  ui.notes.sel = n.id;
  if (view !== "notes") go("notes");
  else render();
  clearInterval(REC.timer);
  REC.timer = setInterval(() => {
    const t = $("#recT");
    if (t) t.textContent = mmss(Date.now() - REC.start);
  }, 500);
  toast("Gravando — fale normalmente. Os trechos entram na nota em tempo real.");
};
function stopRec() {
  REC.on = false;
  try {
    REC.r?.stop();
  } catch {
  }
  clearInterval(REC.timer);
}
ACT.recStop = async () => {
  stopRec();
  render();
  if (REC.n >= 3) {
    toast("Gerando resumo…");
    await ACT.noteSummary();
  } else toast("Gravação encerrada");
};
