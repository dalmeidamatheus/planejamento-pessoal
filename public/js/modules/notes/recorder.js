"use strict";
/* Gravação de reunião (desktop): o texto aparece NA nota enquanto você fala e você pode continuar editando. */
const REC = { on: false, h: null, start: 0, noteId: null, timer: null, n: 0 };
const mmss = NoteDoc.mmss;
function recWrite(n, fn, transient) {
  const live = NED && NED.el.isConnected && NED.noteId === n.id && view === "notes";
  if (live) {
    const el = NED.el, near = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    fn(el);
    if (near) el.scrollTop = el.scrollHeight;
    if (!transient) NED.changed();
  } else if (!transient) NoteDoc.mutate(n, fn, null);
}
const RECERR = { mic: "Permita o acesso ao microfone para gravar.", unsupported: "Este navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari — ou escolha o motor Whisper.", network: "Sem conexão com o serviço de voz do navegador — tentando de novo…", "whisper-unavailable": "Nenhum serviço de transcrição disponível — usando o reconhecimento de voz do navegador.", "local-loading": "Preparando o Whisper local (download único de ~75 MB). Enquanto isso, o texto provisório continua aparecendo.", "whisper-error": "Falha ao transcrever um trecho (rede). Seguindo com o próximo." };
ACT.recStart = async () => {
  if (REC.on) { toast("Já há uma gravação em andamento"); return; }
  const engine = ui.notes.engine === "whisper" ? "whisper" : "browser";
  if (engine === "browser" && !Transcriber.supported()) { toast(RECERR.unsupported, true); return; }
  let n = curNote();
  if (!n) n = newMeetingNote();
  NoteDoc.ensure(n);
  REC.noteId = n.id; REC.n = 0; REC.start = Date.now();
  let warned = {};
  const h = await Transcriber.start({
    engine, lang: "pt-BR",
    onInterim: (t) => {
      const l = $("#recLive");
      if (l) l.textContent = t || "Ouvindo… pode continuar digitando";
      recWrite(n, (root) => NoteDoc.setInterim(root, t), true);
    },
    onFinal: (f) => { REC.n++; recWrite(n, (root) => NoteDoc.addFinal(root, f)); },
    onError: (e) => {
      if (e === "mic") { REC.on = false; render(); }
      if (!warned[e]) { warned[e] = 1; toast(RECERR[e] || "Erro na transcrição", e === "mic" || e === "unsupported"); setTimeout(() => delete warned[e], 15000); }
    }
  });
  if (!h) return;
  REC.on = true; REC.h = h;
  ui.notes.sel = n.id; ui.notes.mode = "edit";
  if (view !== "notes") go("notes"); else render();
  clearInterval(REC.timer);
  REC.timer = setInterval(() => { const t = $("#recT"); if (t) t.textContent = mmss(Date.now() - REC.start); }, 500);
  toast("Gravando — fale normalmente. O texto entra na nota em tempo real e você pode ir corrigindo.");
};
async function stopRec() {
  const h = REC.h, n = S.notes.find((x) => x.id === REC.noteId);
  REC.on = false; REC.h = null;
  clearInterval(REC.timer);
  if (h) await h.stop();
  if (n) recWrite(n, (root) => NoteDoc.setInterim(root, ""), true);
}
ACT.recStop = async () => {
  const id = REC.noteId;
  await stopRec();
  render();
  if (REC.n >= 3 && curNote() && curNote().id === id) {
    toast("Gerando resumo…");
    await ACT.noteSummary();
  } else toast("Gravação encerrada");
};
