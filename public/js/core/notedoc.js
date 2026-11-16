"use strict";
/* Estrutura das notas (compartilhada entre desktop e celular).
   n = { id, title, html, body, created, updated, link?, icon?, cover?, font? }
   - n.html: conteúdo do editor rico (fonte da verdade)
   - n.body: texto puro derivado de n.html (busca, prévias, resumo)
   Notas antigas (só markdown em n.body) são convertidas na primeira abertura.
   Reunião: <div class="transcript" data-transcript> com <p data-t="mm:ss"> e, enquanto se fala, <p class="interim">.
   Resumo:  <section class="summary" data-summary>. */
const NoteDoc = (() => {
  const mmss = (ms) => { const s = Math.floor(ms / 1e3); return pad(Math.floor(s / 60)) + ":" + pad(s % 60); };
  function ensure(n) {
    if (n && typeof n.html !== "string") {
      n.html = RT.fromMarkdown(n.body || "");
      n.body = RT.text(n.html);
    }
    return n;
  }
  const meetingHtml = () => "<h2>Pauta</h2><ul><li><br></li></ul><h2>Notas</h2><ul><li><br></li></ul><h2>Decisões</h2><ul><li><br></li></ul><h2>Ações</h2><ul class=\"chk\"><li class=\"todo\" data-done=\"0\"><br></li></ul>";
  const isMeeting = (n) => /data-transcript|class="transcript"/.test(n.html || "") || (n.body || "").includes("## Transcrição");
  function create(o = {}) {
    const n = { id: uid(), title: "", html: "<p><br></p>", body: "", created: Date.now(), updated: Date.now(), ...o };
    S.notes.push(n);
    return n;
  }
  function tbox(root) {
    let t = root.querySelector(".transcript");
    if (!t) {
      t = document.createElement("div");
      t.className = "transcript";
      t.dataset.transcript = "1";
      t.innerHTML = "<h2>Transcrição</h2>";
      root.appendChild(t);
    }
    return t;
  }
  /** Acrescenta um trecho final reconhecido. */
  function addFinal(root, f) {
    const t = tbox(root);
    t.querySelectorAll(".interim").forEach((x) => x.remove());
    let p = [...t.querySelectorAll(":scope > p[data-t]")].pop();
    if (!p || f.newPara) {
      p = document.createElement("p");
      p.dataset.t = mmss(f.t);
      p.textContent = f.text;
      t.appendChild(p);
    } else p.appendChild(document.createTextNode(" " + f.text));
  }
  /** Texto provisório (ainda sendo falado). Não é salvo. */
  function setInterim(root, text) {
    const t = root.querySelector(".transcript");
    if (!t) { if (!text) return; tbox(root); return setInterim(root, text); }
    let p = t.querySelector(".interim");
    if (!text) { p && p.remove(); return; }
    if (!p) { p = document.createElement("p"); p.className = "interim"; p.contentEditable = "false"; t.appendChild(p); }
    p.textContent = text + " …";
  }
  function transcriptText(root) {
    const t = root.querySelector(".transcript");
    return t ? [...t.querySelectorAll(":scope > p[data-t]")].map((p) => p.textContent).join("\n") : "";
  }
  function setSummary(root, r) {
    root.querySelectorAll("section[data-summary]").forEach((x) => x.remove());
    const ul = (a, todo) => a.length ? `<ul${todo ? ' class="chk"' : ""}>${a.map((x) => todo ? `<li class="todo" data-done="0">${esc(x)}</li>` : `<li>${esc(x)}</li>`).join("")}</ul>` : "<p><i>nada identificado</i></p>";
    const s = document.createElement("section");
    s.className = "summary";
    s.dataset.summary = "1";
    s.innerHTML = `<h2>Resumo automático</h2>${ul(r.summary)}<h3>Decisões</h3>${ul(r.decisions)}<h3>Ações</h3>${ul(r.actions, true)}`;
    const t = root.querySelector(".transcript");
    t ? root.insertBefore(s, t) : root.appendChild(s);
  }
  /** Texto-base do resumo: transcrição, ou a nota toda sem o resumo anterior. */
  function sourceText(root) {
    const tt = transcriptText(root);
    if (tt.trim()) return tt;
    const c = root.cloneNode(true);
    c.querySelectorAll("section[data-summary]").forEach((x) => x.remove());
    return RT.text(c.innerHTML);
  }
  /** Aplica fn(root) ao editor ao vivo (se for desta nota) ou ao HTML salvo. */
  function mutate(n, fn, ed) {
    if (ed && ed.el.isConnected && ed.noteId === n.id) {
      fn(ed.el);
      Files.resolve(ed.el);
      ed.changed();
      return;
    }
    ensure(n);
    const d = document.createElement("div");
    d.innerHTML = n.html;
    fn(d);
    n.html = RT.serialize(d);
    n.body = RT.text(n.html);
    n.updated = Date.now();
    save();
  }
  return { ensure, create, mutate, addFinal, setInterim, setSummary, sourceText, transcriptText, meetingHtml, isMeeting, mmss };
})();
