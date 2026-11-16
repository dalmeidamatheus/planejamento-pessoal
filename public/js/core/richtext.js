"use strict";
/* Editor de texto rico (contenteditable) compartilhado por desktop e celular.
   - Formatação: negrito, itálico, sublinhado, riscado, destaque, cor, títulos, listas,
     checklist, citação, código, bloco de destaque, alinhamento, link, tabela, divisor.
   - Mídia: imagem, GIF, vídeo, áudio, YouTube/Vimeo e qualquer arquivo (via core/files.js).
   - Matemática: fórmulas LaTeX (KaTeX) e cálculo simbólico de derivadas/integrais (Nerdamer).
   - O HTML salvo passa por um sanitizador com lista de permissões. */
const RT = (() => {
  const OK = new Set("p div br b strong i em u s strike del mark span h1 h2 h3 h4 ul ol li blockquote pre code hr a img video audio source iframe table thead tbody tr td th sub sup figure figcaption section".split(" "));
  const DROP = new Set(["script", "style", "object", "embed", "form", "link", "meta", "base", "svg", "math", "template", "textarea", "select", "button", "noscript", "frame", "frameset"]);
  const ATTR = new Set("class style href src alt title target rel controls width height colspan rowspan allowfullscreen loading start".split(" "));
  const DATA = new Set("data-fid data-tex data-display data-done data-ico data-name data-size data-type data-t data-summary data-transcript data-kind".split(" "));
  const STY = new Set(["color", "background-color", "background", "text-align", "font-size", "width", "max-width", "height", "text-decoration", "font-weight", "font-style", "font-family"]);
  const EMBED = /^https:\/\/(www\.youtube-nocookie\.com\/embed\/[\w-]{6,}|player\.vimeo\.com\/video\/\d+)/;
  const SRC = /^(https:|blob:|data:image\/(png|jpe?g|gif|webp|avif);base64,|\/)/i;

  function cleanStyle(s) {
    return String(s).split(";").map((d) => d.trim()).filter(Boolean).filter((d) => {
      const i = d.indexOf(":");
      if (i < 1) return false;
      const k = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim();
      return STY.has(k) && /^[#\w\s%.,()'"\-]+$/.test(v) && !/url\(|expression|javascript/i.test(v);
    }).join(";");
  }
  function walk(node) {
    [...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 3) return;
      if (ch.nodeType !== 1) { ch.remove(); return; }
      const t = ch.tagName.toLowerCase();
      if (DROP.has(t)) { ch.remove(); return; }
      walk(ch);
      if (!OK.has(t)) { ch.replaceWith(...ch.childNodes); return; }
      [...ch.attributes].forEach((a) => {
        const n = a.name.toLowerCase(), v = a.value;
        if (n.startsWith("data-")) { if (!DATA.has(n)) ch.removeAttribute(a.name); return; }
        if (n === "contenteditable") { if (v !== "false") ch.removeAttribute(a.name); return; }
        if (!ATTR.has(n)) { ch.removeAttribute(a.name); return; }
        if (n === "style") { const s = cleanStyle(v); s ? ch.setAttribute("style", s) : ch.removeAttribute("style"); }
        else if (n === "href") { if (!/^(https?:|mailto:|#)/i.test(v.trim())) ch.removeAttribute("href"); }
        else if (n === "src") { if (t === "iframe" ? !EMBED.test(v) : !SRC.test(v.trim())) ch.removeAttribute("src"); }
        else if (n === "class") { const c = v.split(/\s+/).filter((x) => /^[\w-]+$/.test(x)).join(" "); c ? ch.setAttribute("class", c) : ch.removeAttribute("class"); }
      });
      if (t === "iframe" && !ch.getAttribute("src")) { ch.remove(); return; }
      if (t === "a") { ch.setAttribute("target", "_blank"); ch.setAttribute("rel", "noopener"); }
    });
  }
  function clean(html) {
    const doc = new DOMParser().parseFromString("<body>" + (html || "") + "</body>", "text/html");
    walk(doc.body);
    return doc.body.innerHTML;
  }
  /** HTML pronto para guardar: tira estado de tela (src temporário, fórmulas renderizadas, texto provisório). */
  function serialize(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll(".interim,.rt-imgbar,[data-ui]").forEach((x) => x.remove());
    c.querySelectorAll(".math").forEach((x) => { x.innerHTML = ""; delete x.dataset.r; });
    c.querySelectorAll("[data-fid]").forEach((x) => { x.removeAttribute("src"); x.removeAttribute("data-fid-done"); x.removeAttribute("data-missing"); x.classList.remove("fmissing", "sel"); });
    c.querySelectorAll(".sel").forEach((x) => x.classList.remove("sel"));
    return clean(c.innerHTML);
  }
  /** Texto puro (para busca, prévia e resumo). */
  function text(html) {
    const d = document.createElement("div");
    d.innerHTML = clean(html);
    d.querySelectorAll(".math").forEach((m) => m.replaceWith("$" + (m.dataset.tex || "") + "$"));
    d.querySelectorAll("img,video,audio").forEach((m) => m.replaceWith("[mídia]"));
    d.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
    d.querySelectorAll("p,div,li,h1,h2,h3,h4,blockquote,tr,pre,section").forEach((b) => b.append("\n"));
    return d.textContent.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }
  /** Converte markdown antigo (md()) para o HTML do editor, incluindo as checklists. */
  function fromMarkdown(src) {
    const d = document.createElement("div");
    d.innerHTML = clean(md(src || ""));
    d.querySelectorAll("ul.chk").forEach((ul) => {
      ul.querySelectorAll(":scope > li").forEach((li) => {
        const cb = li.querySelector("input[type=checkbox]");
        li.className = "todo";
        li.dataset.done = cb && cb.checked ? "1" : "0";
        cb && cb.remove();
      });
    });
    return d.innerHTML;
  }

  const libs = {};
  function load(url, css) {
    if (libs[url]) return libs[url];
    return libs[url] = new Promise((ok, no) => {
      const e = document.createElement(css ? "link" : "script");
      if (css) { e.rel = "stylesheet"; e.href = url; } else e.src = url;
      e.onload = () => ok();
      e.onerror = () => { delete libs[url]; no(new Error("Falha ao carregar " + url)); };
      document.head.appendChild(e);
    });
  }
  const KATEX = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/";
  const loadKatex = () => window.katex ? Promise.resolve() : Promise.all([load(KATEX + "katex.min.css", true), load(KATEX + "katex.min.js")]);
  const NER = "https://cdn.jsdelivr.net/npm/nerdamer@1.1.13/";
  async function loadNerdamer() {
    if (window.nerdamer && window.nerdamer.getCore && window.nerdamer.integrate) return;
    await load(NER + "nerdamer.core.js");
    for (const f of ["Algebra", "Calculus", "Solve"]) await load(NER + f + ".js");
  }
  function renderMath(root) {
    const els = [...(root || document).querySelectorAll(".math")].filter((m) => m.dataset.r !== m.dataset.tex + "|" + m.dataset.display);
    if (!els.length) return;
    const paint = () => els.forEach((m) => {
      try { window.katex.render(m.dataset.tex || "", m, { displayMode: m.dataset.display === "1", throwOnError: false }); }
      catch { m.textContent = m.dataset.tex; }
      m.dataset.r = m.dataset.tex + "|" + m.dataset.display;
    });
    if (window.katex) paint();
    else { els.forEach((m) => { if (!m.textContent) m.textContent = m.dataset.tex; }); loadKatex().then(paint).catch(() => {}); }
  }

  const SW = ["#1d1c1a", "#e5484d", "#f59e0b", "#16a34a", "#2563eb", "#8b5cf6", "#64748b"];
  const HL = ["#fff3a3", "#ffd9d6", "#d4f5dd", "#d6e4ff", "#e6dcff", "#e9eef5"];
  const SYMS = [["∫", "\\int_{a}^{b} f(x)\\,dx"], ["d/dx", "\\frac{d}{dx}\\left(f(x)\\right)"], ["∂", "\\frac{\\partial f}{\\partial x}"], ["lim", "\\lim_{x \\to 0} \\frac{\\sin x}{x}"], ["Σ", "\\sum_{i=1}^{n} i"], ["√", "\\sqrt{x}"], ["a/b", "\\frac{a}{b}"], ["xⁿ", "x^{n}"], ["∞", "\\infty"], ["π", "\\pi"], ["≤", "\\leq"], ["≈", "\\approx"], ["matriz", "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}"]];

  const BTN = [
    ["bold", "B", "Negrito (Ctrl+B)", "font-weight:700"], ["italic", "I", "Itálico (Ctrl+I)", "font-style:italic"], ["underline", "U", "Sublinhado (Ctrl+U)", "text-decoration:underline"], ["strike", "S", "Riscado (Ctrl+Shift+S)", "text-decoration:line-through"],
    ["hilite", "▮", "Destacar (Ctrl+Shift+H)", "background:#fff3a3;border-radius:3px"], ["color", "A", "Cor do texto", "color:#2563eb;font-weight:700"], "|",
    ["h1", "H1", "Título 1 (Ctrl+Shift+1)"], ["h2", "H2", "Título 2 (Ctrl+Shift+2)"], ["h3", "H3", "Título 3 (Ctrl+Shift+3)"], "|",
    ["ul", "•", "Lista (Ctrl+Shift+8)"], ["ol", "1.", "Lista numerada (Ctrl+Shift+7)"], ["todo", ic("checksq", 16), "Checklist (Ctrl+Shift+9)"], ["quote", ic("quote", 16), "Citação"], ["code", "</>", "Bloco de código"], ["callout", ic("bulb", 16), "Bloco de destaque"], "|",
    ["left", ic("aleft", 16), "Alinhar à esquerda"], ["center", ic("acenter", 16), "Centralizar"], ["right", ic("aright", 16), "Alinhar à direita"], "|",
    ["link", ic("link", 16), "Link (Ctrl+Shift+L)"], ["media", ic("image", 16), "Imagem, GIF ou vídeo"], ["file", ic("clip", 16), "Anexar arquivo"], ["url", ic("globe", 16), "Mídia por link (YouTube, GIF…)"], ["ocr", ic("camera", 16), "Foto → texto (tirar foto de uma conta, documento ou anotação)"], ["table", ic("table", 16), "Tabela"], ["hr", "―", "Divisor"], ["math", "∑", "Fórmula / cálculo (Ctrl+Shift+M)"], ["clear", ic("eraser", 16), "Limpar formatação"]
  ];

  function mount(host, opt = {}) {
    host.classList.add("rt");
    host.innerHTML = `<div class="rt-bar" data-ui="1">${BTN.map((b) => b === "|" ? '<i class="rt-sep"></i>' : `<button type="button" class="rt-b" data-c="${b[0]}" title="${b[2]}" style="${b[3] || ""}">${b[1]}</button>`).join("")}</div><div class="rt-pop hidden" data-ui="1"></div><div class="rt-body" contenteditable="true" spellcheck="true" data-placeholder="${opt.placeholder || "Escreva aqui…"}"></div><input type="file" class="rt-file hidden" multiple data-ui="1"><input type="file" class="rt-ocr hidden" accept="image/*" data-ui="1">`;
    const bar = $(".rt-bar", host), el = $(".rt-body", host), pop = $(".rt-pop", host), fin = $(".rt-file", host), focr = $(".rt-ocr", host);
    let range = null, imgSel = null, readonly = false, tm = null;
    const ed = { el, bar, host };
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch {}
    const setHtml = (h) => {
      el.innerHTML = clean(h) || "<p><br></p>";
      Files.resolve(el);
      renderMath(el);
    };
    const changed = () => { clearTimeout(tm); tm = setTimeout(() => opt.onChange && opt.onChange(serialize(el), text(el.innerHTML)), 250); };
    const flush = () => { clearTimeout(tm); opt.onChange && opt.onChange(serialize(el), text(el.innerHTML)); };
    const notify = (m, w) => typeof toast === "function" && toast(m, w);
    const saveRange = () => { const s = getSelection(); if (s.rangeCount && el.contains(s.anchorNode)) range = s.getRangeAt(0).cloneRange(); };
    const restore = () => {
      el.focus();
      const s = getSelection();
      if (s.rangeCount && el.contains(s.anchorNode)) return;
      if (range) { s.removeAllRanges(); s.addRange(range); }
    };
    const onSel = () => {
      if (!el.isConnected) { document.removeEventListener("selectionchange", onSel); document.removeEventListener("mousedown", onDoc); return; }
      if (document.activeElement === el) saveRange();
    };
    const onDoc = (e) => { if (!pop.contains(e.target) && !bar.contains(e.target)) closePop(); };
    document.addEventListener("selectionchange", onSel);
    document.addEventListener("mousedown", onDoc);
    const exec = (c, v) => { restore(); document.execCommand(c, false, v); changed(); saveRange(); };
    const html = (h) => { restore(); document.execCommand("insertHTML", false, h); Files.resolve(el); renderMath(el); changed(); saveRange(); };
    const block = (tag) => {
      restore();
      const cur = document.queryCommandValue("formatBlock").toLowerCase().replace(/[<>]/g, "");
      document.execCommand("formatBlock", false, cur === tag ? "p" : tag);
      changed();
    };
    const selText = () => String(getSelection()).replace(/\n/g, " ");
    const closePop = () => { pop.classList.add("hidden"); pop.innerHTML = ""; };
    const openPop = (btn, inner) => {
      pop.innerHTML = inner;
      pop.classList.remove("hidden");
      const r = btn.getBoundingClientRect(), h = host.getBoundingClientRect();
      pop.style.left = Math.max(0, Math.min(r.left - h.left, h.width - 230)) + "px";
      pop.style.top = r.bottom - h.top + 4 + "px";
    };
    const swatches = (kind) => (kind === "color" ? SW : HL).map((c) => `<button type="button" class="rt-sw" data-sw="${kind}" data-v="${c}" style="background:${c}"></button>`).join("") + `<button type="button" class="rt-sw" data-sw="${kind}" data-v="" title="Remover">⌀</button>`;

    function mediaFromUrl(u) {
      u = u.trim();
      let m;
      if (m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/)) return `<p><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" allowfullscreen></iframe></p>`;
      if (m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)) return `<p><iframe src="https://player.vimeo.com/video/${m[1]}" allowfullscreen></iframe></p>`;
      if (!/^https:\/\//i.test(u)) return "";
      if (/\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(u)) return `<p><video src="${esc(u)}" controls></video></p>`;
      if (/\.(mp3|wav|ogg|m4a)(\?|#|$)/i.test(u)) return `<p><audio src="${esc(u)}" controls></audio></p>`;
      return `<p><img src="${esc(u)}" alt=""></p>`;
    }
    async function insertFiles(files) {
      files = [...files];
      if (!files.length) return;
      notify("Enviando " + files.length + " arquivo" + (files.length > 1 ? "s" : "") + "…");
      for (const f of files) {
        try {
          const m = await Files.put(f), t = f.type || "";
          const a = `data-fid="${m.id}"`;
          let h;
          if (t.startsWith("image/")) h = `<p><img ${a} alt="${esc(m.name)}"></p>`;
          else if (t.startsWith("video/")) h = `<p><video ${a} controls playsinline></video></p>`;
          else if (t.startsWith("audio/")) h = `<p><audio ${a} controls></audio></p>`;
          else h = `<a class="fchip" ${a} data-name="${esc(m.name)}" data-size="${m.size}" data-kind="file" contenteditable="false">${esc(m.name)} <small>${Files.size(m.size)}</small></a>&nbsp;`;
          html(h);
        } catch (e) { notify(e.message || "Não foi possível anexar", true); }
      }
    }
    ed.insertFiles = insertFiles;

    /* ---------- fórmulas e cálculo ---------- */
    function mathDialog(target) {
      const old = $(".rt-dlg");
      old && old.remove();
      const tex0 = target ? target.dataset.tex || "" : selText();
      const disp0 = target ? target.dataset.display === "1" : false;
      const d = document.createElement("div");
      d.className = "rt-dlg";
      d.innerHTML = `<div class="rt-card"><h3>Fórmula e cálculo</h3>
       <div class="rt-tabs"><button type="button" class="on" data-t="tex">Escrever fórmula (LaTeX)</button><button type="button" data-t="calc">Calcular (derivada, integral…)</button></div>
       <div data-p="tex"><div class="rt-syms">${SYMS.map(([l, t]) => `<button type="button" data-tex="${esc(t)}">${l}</button>`).join("")}</div>
        <textarea class="rt-tex" rows="3" placeholder="Ex.: \\int_0^1 x^2\\,dx = \\frac{1}{3}">${esc(tex0)}</textarea>
        <label class="rt-chk"><input type="checkbox" class="rt-disp" ${disp0 ? "checked" : ""}> Fórmula em bloco (centralizada, maior)</label>
        <div class="rt-prev"></div></div>
       <div data-p="calc" class="hidden"><div class="rt-row"><select class="rt-op"><option value="diff">Derivada</option><option value="int">Integral indefinida</option><option value="defint">Integral definida</option><option value="solve">Resolver equação</option><option value="simp">Simplificar / calcular</option></select><input class="rt-var" value="x" size="3" title="Variável"><input class="rt-a" placeholder="de" size="4"><input class="rt-b" placeholder="até" size="4"></div>
        <input class="rt-expr" placeholder="Expressão: x^2*sin(x)   ·   para resolver: x^2-5x+6=0">
        <div class="rt-hint">Use * para multiplicar e ^ para potência. Funções: sin, cos, tan, log, exp, sqrt, abs…</div>
        <div class="rt-prev rt-cprev"></div><div class="rt-err"></div></div>
       <div class="rt-foot"><button type="button" class="btn" data-x="cancel">Cancelar</button><button type="button" class="btn primary" data-x="ok">Inserir</button></div></div>`;
      document.body.appendChild(d);
      let tab = "tex", calcTex = "";
      const tex = $(".rt-tex", d), prev = $(".rt-prev", d), cprev = $(".rt-cprev", d), disp = $(".rt-disp", d), err = $(".rt-err", d);
      const draw = (box, src, display) => loadKatex().then(() => { try { window.katex.render(src || "\\ ", box, { displayMode: display, throwOnError: false }); } catch { box.textContent = src; } }).catch(() => { box.textContent = src; });
      const upd = () => draw(prev, tex.value, disp.checked);
      tex.addEventListener("input", upd); disp.addEventListener("change", upd); upd(); tex.focus();
      d.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (e.target === d) { d.remove(); return; }
        if (!b) return;
        if (b.dataset.t) {
          tab = b.dataset.t;
          $$(".rt-tabs button", d).forEach((x) => x.classList.toggle("on", x === b));
          $$("[data-p]", d).forEach((p) => p.classList.toggle("hidden", p.dataset.p !== tab));
          if (tab === "calc") loadNerdamer().catch(() => { err.textContent = "Não foi possível carregar o motor de cálculo (verifique a internet)."; });
        } else if (b.dataset.tex) {
          const s = tex.selectionStart;
          tex.value = tex.value.slice(0, s) + b.dataset.tex + tex.value.slice(tex.selectionEnd);
          tex.focus(); upd();
        } else if (b.dataset.x === "cancel") d.remove();
        else if (b.dataset.x === "ok") {
          const val = (tab === "calc" ? calcTex : tex.value).trim();
          if (!val) { if (tab === "calc") err.textContent = "Digite uma expressão e aguarde o resultado."; return; }
          const span = `<span class="math" data-tex="${esc(val)}" data-display="${(tab === "calc" ? true : disp.checked) ? 1 : 0}" contenteditable="false"></span>`;
          d.remove();
          if (target) { target.dataset.tex = val; target.dataset.display = tab === "calc" || disp.checked ? "1" : "0"; target.dataset.r = ""; renderMath(el); changed(); }
          else html(span + "&nbsp;");
        }
      });
      const expr = $(".rt-expr", d);
      let ct = null;
      async function compute() {
        err.textContent = "";
        const e = expr.value.trim();
        if (!e) { calcTex = ""; cprev.innerHTML = ""; return; }
        try {
          await loadNerdamer();
          const n = window.nerdamer, v = ($(".rt-var", d).value || "x").trim(), op = $(".rt-op", d).value, a = $(".rt-a", d).value.trim(), b = $(".rt-b", d).value.trim();
          const T = (s) => n(s).toTeX();
          if (op === "diff") calcTex = `\\frac{d}{d${v}}\\left(${T(e)}\\right) = ${T(`diff(${e},${v})`)}`;
          else if (op === "int") calcTex = `\\int ${T(e)}\\,d${v} = ${T(`integrate(${e},${v})`)} + C`;
          else if (op === "defint") {
            if (!a || !b) throw new Error("Informe os limites (de / até).");
            calcTex = `\\int_{${T(a)}}^{${T(b)}} ${T(e)}\\,d${v} = ${T(`defint(${e},${a},${b},${v})`)}`;
          } else if (op === "solve") {
            const sol = n.solveEquations(e.includes("=") ? e : e + "=0", v);
            const arr = (Array.isArray(sol) ? sol : [sol]).map((s) => T(String(s)));
            if (!arr.length) throw new Error("Sem solução encontrada.");
            calcTex = arr.map((s, i) => `${v}_{${i + 1}} = ${s}`).join(",\\quad ");
          } else calcTex = `${T(e)} = ${T(`simplify(${e})`)}`;
          draw(cprev, calcTex, true);
        } catch (x) {
          calcTex = "";
          cprev.innerHTML = "";
          err.textContent = x && x.message ? "Não consegui calcular: " + String(x.message).slice(0, 120) : "Expressão inválida.";
        }
      }
      d.addEventListener("input", (e) => { if (e.target.closest("[data-p=calc]")) { clearTimeout(ct); ct = setTimeout(compute, 450); } });
      d.addEventListener("change", (e) => { if (e.target.closest("[data-p=calc]")) compute(); });
    }
    ed.mathDialog = mathDialog;

    /* ---------- comandos ---------- */
    const CMD = {
      bold: () => exec("bold"), italic: () => exec("italic"), underline: () => exec("underline"), strike: () => exec("strikeThrough"),
      hilite: (b) => openPop(b, swatches("hilite")), color: (b) => openPop(b, swatches("color")),
      h1: () => block("h1"), h2: () => block("h2"), h3: () => block("h3"),
      ul: () => exec("insertUnorderedList"), ol: () => exec("insertOrderedList"),
      todo: () => {
        restore();
        const li = getSelection().anchorNode && (getSelection().anchorNode.nodeType === 1 ? getSelection().anchorNode : getSelection().anchorNode.parentElement).closest("li.todo");
        if (li) { exec("insertUnorderedList"); return; }
        const t = selText();
        html(`<ul class="chk"><li class="todo" data-done="0">${t ? esc(t) : "<br>"}</li></ul>`);
      },
      quote: () => block("blockquote"),
      code: () => { restore(); const t = selText(); html(`<pre><code>${t ? esc(t) : "<br>"}</code></pre><p><br></p>`); },
      callout: () => { restore(); const t = selText(); html(`<div class="callout"><p>${t ? esc(t) : "<br>"}</p></div><p><br></p>`); },
      left: () => exec("justifyLeft"), center: () => exec("justifyCenter"), right: () => exec("justifyRight"),
      link: () => {
        restore();
        const sel = selText();
        const u = window.prompt("Endereço do link (https://…)", "https://");
        if (!u || !/^https?:\/\//i.test(u.trim())) return;
        if (sel) document.execCommand("createLink", false, u.trim());
        else html(`<a href="${esc(u.trim())}" target="_blank" rel="noopener">${esc(u.trim())}</a>&nbsp;`);
        changed();
      },
      media: () => { fin.accept = "image/*,video/*,audio/*"; fin.click(); },
      file: () => { fin.accept = ""; fin.click(); },
      url: () => {
        const u = window.prompt("Cole o link da imagem, GIF, vídeo ou do YouTube/Vimeo (https://…)");
        if (!u) return;
        const h = mediaFromUrl(u);
        h ? html(h) : notify("Use um link https:// válido", true);
      },
      ocr: () => { saveRange(); focr.click(); },
      table: () => html('<table><tbody>' + "<tr><td><br></td><td><br></td><td><br></td></tr>".repeat(3) + "</tbody></table><p><br></p>"),
      hr: () => html("<hr><p><br></p>"),
      math: () => { restore(); mathDialog(null); },
      clear: () => { exec("removeFormat"); exec("formatBlock", "p"); }
    };
    ed.cmd = (n, b) => CMD[n] && CMD[n](b);
    bar.addEventListener("mousedown", (e) => { if (!e.target.closest("input,select")) e.preventDefault(); });
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]");
      if (!b || readonly) return;
      closePop();
      CMD[b.dataset.c](b);
    });
    pop.addEventListener("mousedown", (e) => e.preventDefault());
    pop.addEventListener("click", (e) => {
      const s = e.target.closest("[data-sw]");
      if (!s) return;
      const v = s.dataset.v;
      if (s.dataset.sw === "color") exec(v ? "foreColor" : "removeFormat", v || undefined);
      else exec("hiliteColor", v || "transparent");
      closePop();
    });
    fin.addEventListener("change", () => { insertFiles(fin.files); fin.value = ""; });
    focr.addEventListener("change", async () => {
      const f = focr.files[0];
      focr.value = "";
      if (!f) return;
      notify("Lendo o texto da imagem… (pode levar alguns segundos)");
      try {
        const r = await OCR.run(f), t = r.text;
        if (!t) { notify("Não encontrei texto nessa imagem", true); return; }
        html(OCR.toHtml(t) + "<p><br></p>");
        notify("Texto transcrito para a nota (" + r.provider + ")");
      } catch (e) { notify("Não consegui ler a imagem (verifique a internet)", true); }
    });

    /* ---------- atalhos de teclado ---------- */
    const KEYS = { KeyS: "strike", KeyH: "hilite-last", KeyM: "math", KeyL: "link", Digit1: "h1", Digit2: "h2", Digit3: "h3", Digit7: "ol", Digit8: "ul", Digit9: "todo" };
    el.addEventListener("keydown", (e) => {
      if (readonly) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === "KeyS" && !e.shiftKey) { e.preventDefault(); flush(); notify("Nota salva"); return; }
      if (mod && e.shiftKey && KEYS[e.code]) {
        e.preventDefault();
        const k = KEYS[e.code];
        if (k === "hilite-last") exec("hiliteColor", "#fff3a3"); else CMD[k](bar.querySelector(`[data-c=${k}]`));
        return;
      }
      if (e.key === "Tab") {
        const n = getSelection().anchorNode, p = n && (n.nodeType === 1 ? n : n.parentElement), cell = p && p.closest("td,th"), li = p && p.closest("li");
        if (cell) {
          e.preventDefault();
          let nx = e.shiftKey ? cell.previousElementSibling : cell.nextElementSibling;
          if (!nx) {
            const tr = cell.parentElement, rows = [...tr.parentElement.children];
            if (!e.shiftKey && tr === rows[rows.length - 1]) { const c = tr.cloneNode(true); c.querySelectorAll("td,th").forEach((x) => (x.innerHTML = "<br>")); tr.after(c); nx = c.firstElementChild; }
            else { const r = e.shiftKey ? tr.previousElementSibling : tr.nextElementSibling; nx = r && (e.shiftKey ? r.lastElementChild : r.firstElementChild); }
          }
          if (nx) { const r = document.createRange(); r.selectNodeContents(nx); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
        } else if (li) { e.preventDefault(); document.execCommand(e.shiftKey ? "outdent" : "indent"); changed(); }
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) setTimeout(() => {
        const n = getSelection().anchorNode, li = n && (n.nodeType === 1 ? n : n.parentElement) && (n.nodeType === 1 ? n : n.parentElement).closest("li.todo");
        if (li && li.dataset.done === "1" && !li.textContent.trim()) li.dataset.done = "0";
      }, 0);
    });
    /* markdown ao digitar: "# ", "## ", "- ", "1. ", "> ", "[] ", "---" */
    el.addEventListener("input", (e) => {
      if (e.inputType === "insertText" && e.data && /[\s ]$/.test(e.data)) {
        const s = getSelection(), n = s.anchorNode;
        if (n && n.nodeType === 3) {
          const before = n.textContent.slice(0, s.anchorOffset).replace(/ /g, " ");
          const blk = n.parentElement.closest("p,div");
          const map = { "#": "h1", "##": "h2", "###": "h3", "-": "ul", "*": "ul", "1.": "ol", ">": "quote", "[]": "todo", "[ ]": "todo" };
          const mk = before.trim();
          if (blk && blk.parentElement === el && before === mk + " " && map[mk]) {
            const off = s.anchorOffset;
            setTimeout(() => {
              const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, Math.min(off, n.textContent.length)); r.deleteContents();
              if (!blk.textContent) { blk.innerHTML = "<br>"; }
              const rr = document.createRange(); rr.setStart(blk, 0); rr.collapse(true); s.removeAllRanges(); s.addRange(rr);
              range = null;
              const c = map[mk];
              if (c === "ul" || c === "ol") exec(c === "ul" ? "insertUnorderedList" : "insertOrderedList"); else CMD[c]();
            }, 0);
          }
        }
      }
      changed();
    });
    el.addEventListener("click", (e) => {
      const li = e.target.closest && e.target.closest("li.todo");
      if (li && el.contains(li) && e.offsetX < 28 && e.target === li) { li.dataset.done = li.dataset.done === "1" ? "0" : "1"; changed(); return; }
      const m = e.target.closest && e.target.closest(".math");
      if (m && !readonly) { mathDialog(m); return; }
      const f = e.target.closest && e.target.closest(".fchip");
      if (f) { e.preventDefault(); Files.open(f.dataset.fid, f.dataset.name); return; }
      const a = e.target.closest && e.target.closest("a[href]");
      if (a && (readonly || e.ctrlKey || e.metaKey)) { window.open(a.href, "_blank", "noopener"); return; }
      const im = e.target.closest && e.target.closest("img,video");
      imgBar(im && !readonly ? im : null);
    });
    function imgBar(m) {
      $$(".rt-imgbar", host).forEach((x) => x.remove());
      el.querySelectorAll(".sel").forEach((x) => x.classList.remove("sel"));
      imgSel = m;
      if (!m) return;
      m.classList.add("sel");
      const b = document.createElement("div");
      b.className = "rt-imgbar"; b.dataset.ui = "1";
      b.innerHTML = [25, 50, 75, 100].map((p) => `<button type="button" data-w="${p}">${p}%</button>`).join("") + '<button type="button" data-w="del" title="Remover"></button>';
      const r = m.getBoundingClientRect(), h = host.getBoundingClientRect();
      b.style.top = Math.max(4, r.top - h.top + 6) + "px"; b.style.left = Math.max(4, r.left - h.left + 6) + "px";
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", (e) => {
        const w = e.target.closest("[data-w]");
        if (!w || !imgSel) return;
        if (w.dataset.w === "del") imgSel.remove(); else imgSel.style.width = w.dataset.w + "%";
        imgBar(null); changed();
      });
      host.appendChild(b);
    }
    el.addEventListener("paste", (e) => {
      if (readonly) return;
      const cd = e.clipboardData, fs = cd && [...cd.files];
      if (fs && fs.length) { e.preventDefault(); insertFiles(fs); return; }
      const h = cd && cd.getData("text/html");
      if (h) { e.preventDefault(); document.execCommand("insertHTML", false, clean(h).replace(/<(h[1-4])[^>]*>/g, "<$1>")); Files.resolve(el); changed(); return; }
      const t = cd && cd.getData("text/plain");
      if (t && /^https:\/\/\S+$/.test(t.trim()) && (/(youtu|vimeo)/.test(t) || /\.(gif|png|jpe?g|webp|mp4|webm)(\?|$)/i.test(t))) { e.preventDefault(); html(mediaFromUrl(t)); }
    });
    el.addEventListener("dragover", (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); });
    el.addEventListener("drop", (e) => {
      if (readonly) return;
      const fs = e.dataTransfer && [...e.dataTransfer.files];
      if (fs && fs.length) { e.preventDefault(); const r = document.caretRangeFromPoint && document.caretRangeFromPoint(e.clientX, e.clientY); if (r) range = r; insertFiles(fs); }
    });
    el.addEventListener("blur", () => { flush(); });

    ed.setHtml = setHtml;
    ed.html = () => serialize(el);
    ed.text = () => text(el.innerHTML);
    ed.focus = () => el.focus();
    ed.setReadonly = (v) => { readonly = v; el.contentEditable = v ? "false" : "true"; bar.classList.toggle("hidden", v); imgBar(null); };
    ed.flush = flush;
    ed.changed = changed;
    ed.destroy = () => { clearTimeout(tm); host.innerHTML = ""; };
    setHtml(opt.html || "");
    if (opt.readonly) ed.setReadonly(true);
    return ed;
  }
  return { mount, clean, serialize, text, fromMarkdown, renderMath, load, loadKatex };
})();
