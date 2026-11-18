"use strict";
/* Dieta: importa o plano alimentar (texto, PDF ou foto), sugere o cardápio do dia e confere o que foi comido.
   Dados em S.diet = { plan, log, over }:
   plan = { name, start:"YYYY-MM-DD" (dia 1 do ciclo), source, meals:[{id,name,time}], days:[{n, m:{<idRefeição>:texto}}],
            options:{<idRefeição>:[texto]}, add:[], avoid:[], tips:[] }
   log[YYYY-MM-DD] = [{ id, meal, text, verdict:"dentro|parcial|fora", items:[{food,status,note}], summary, tip, source, ts }]
   over[YYYY-MM-DD] = { <idRefeição>: texto }   (sugestão trocada pelo usuário)
   IA (/api/diet) é opcional; sem ela, tudo funciona com leitura e conferência locais (mais simples). */
const Diet = (() => {
  const D = () => S.diet || (S.diet = { plan: null, log: {}, over: {} });
  const MEALS = [
    [/^(cafe da manha|desjejum|cafe)$/, "cafe", "Café da manhã", "07:30"],
    [/^(lanche da manha|colacao)\b/, "lanche_m", "Lanche da manhã", "10:00"],
    [/^(almoco)\b/, "almoco", "Almoço", "12:30"],
    [/^(cafe da tarde|lanche da tarde|lanche)\b/, "lanche", "Café da tarde", "16:00"],
    [/^(jantar)\b/, "jantar", "Jantar", "19:30"],
    [/^(ceia)\b/, "ceia", "Ceia", "21:30"]
  ];
  const ORDER = MEALS.map((m) => m[1]);
  const mealOf = (label) => { const n = norm(label).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim(); const m = MEALS.find((x) => x[0].test(n)); return m ? { id: m[1], name: m[2], time: m[3] } : null; };
  const AVOID_DEFAULT = ["refrigerante", "acucar", "bolo", "biscoito", "bolacha", "pizza", "hamburguer", "frito", "frita", "fritura", "sorvete", "chocolate", "cerveja", "doce", "salgadinho", "suco de caixinha", "maionese", "ketchup", "bacon", "linguica", "salsicha"];
  const STOP = new Set("de da do das dos com sem e ou a o as os um uma uns umas na no nas nos para por em ao à + mais menos pouco pouca porcao porcoes colher colheres sopa cha xicara copo fatia fatias unidade unidades grama gramas g ml fio".split(" "));
  const words = (s) => norm(s).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  const stem = (w) => w.replace(/(es|s)$/, "");

  /* ---------- leitura local do texto do plano ---------- */
  const splitCells = (raw) => (raw.includes("\t") ? raw.split("\t") : raw.includes("|") ? raw.split("|") : raw.split(/ {2,}/)).map((c) => c.trim()).filter((c, i, a) => c || (i > 0 && i < a.length - 1));
  const unbullet = (l) => l.replace(/^[\s*•\-–·>]+/, "").replace(/^\d+[.)]\s+/, "").trim();
  function parseLocal(text) {
    const plan = { name: "Minha dieta", meals: [], days: [], options: {}, add: [], avoid: [], tips: [] };
    let cols = null, sect = null;
    const addMeal = (m) => { if (!plan.meals.some((x) => x.id === m.id)) plan.meals.push({ ...m }); };
    for (const raw of String(text || "").replace(/\r/g, "").split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const cells = splitCells(raw);
      if (cells.length >= 3 && /^dia$/.test(norm(cells[0]))) { cols = cells.slice(1).map(mealOf); cols.forEach((c) => c && addMeal(c)); sect = null; continue; }
      if (cells.length >= 3 && /^\d{1,3}$/.test(cells[0])) {
        let cs = cols;
        if (!cs) { const std = ["cafe", "almoco", "lanche", "jantar"]; cs = cells.slice(1).map((_, i) => mealOf(std[i] === "cafe" ? "café da manhã" : std[i] === "lanche" ? "café da tarde" : std[i]) || null); cs.forEach((c) => c && addMeal(c)); cols = cs; }
        const m = {};
        cells.slice(1).forEach((c, i) => { if (cs[i] && c) m[cs[i].id] = c; });
        if (Object.keys(m).length) plan.days.push({ n: +cells[0], m });
        sect = null;
        continue;
      }
      const body = unbullet(line), head = body.replace(/\s*\([^)]*\)\s*/g, " ").replace(/[:：]\s*$/, "").trim(), nh = norm(head);
      if (/^(o que )?(adicionar|incluir)\b/.test(nh)) { sect = { t: "add" }; continue; }
      if (/^(o que )?(remover|evitar|tirar)\b|remover \/ evitar|remover evitar/.test(nh)) { sect = { t: "avoid" }; continue; }
      if (/^(ajustes|dicas|otimiza|formas de otimiza|observa)/.test(nh) || /^\d+\.\s*ajustes/.test(nh)) { sect = { t: "tip" }; continue; }
      const mm = head.length < 48 && (/[:：]\s*$/.test(body) || /\)\s*:?\s*$/.test(body) || !/[,;+]/.test(body)) ? mealOf(head) : null;
      if (mm && !/^opc/.test(nh)) { addMeal(mm); sect = { t: "meal", id: mm.id }; plan.options[mm.id] = plan.options[mm.id] || []; continue; }
      if (/^semana \d+|^dias? \d+/.test(nh) || /^\d+\.\s/.test(line) && !sect) { sect = null; continue; }
      if (!sect) continue;
      const item = body.replace(/^op[cç][aã]o\s*\d+\s*[:.\-]\s*/i, "").trim();
      if (!item || item.length < 3) continue;
      if (sect.t === "meal") plan.options[sect.id].push(item);
      else if (sect.t === "add") plan.add.push(item);
      else if (sect.t === "avoid") plan.avoid.push(item);
      else plan.tips.push(item);
    }
    plan.meals.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
    Object.keys(plan.options).forEach((k) => { if (!plan.options[k].length) delete plan.options[k]; });
    plan.days.sort((a, b) => a.n - b.n);
    return plan;
  }
  const planOk = (p) => p && Array.isArray(p.meals) && p.meals.length && ((p.days && p.days.length) || (p.options && Object.keys(p.options).length));

  /* ---------- chamadas ao servidor (opcionais) ---------- */
  async function api(body) {
    const tk = typeof sb !== "undefined" && sb ? ((await sb.auth.getSession()).data.session || {}).access_token : "";
    const r = await fetch("/api/diet", { method: "POST", headers: { "Content-Type": "application/json", ...(tk ? { Authorization: "Bearer " + tk } : {}) }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }
  /** Texto do plano -> plano estruturado. IA (se houver) com reserva na leitura local. */
  async function importText(text) {
    text = String(text || "").trim();
    if (text.length < 20) throw new Error("Texto muito curto");
    try {
      const r = await api({ action: "parse", text: text.slice(0, 40000) });
      if (planOk(r.plan)) return { plan: normPlan(r.plan), source: "ai", provider: r.provider };
    } catch {}
    const p = parseLocal(text);
    return { plan: normPlan(p), source: "local", ok: !!planOk(p) };
  }
  function normPlan(p) {
    const meals = (p.meals || []).map((m) => { const k = mealOf(m.name || m.id || ""); return { id: String(m.id || (k && k.id) || norm(m.name).replace(/\W+/g, "_")).slice(0, 24), name: String(m.name || (k && k.name) || m.id), time: /^\d{1,2}:\d{2}$/.test(m.time || "") ? m.time : k ? k.time : "12:00" }; });
    const days = (p.days || []).map((d, i) => ({ n: +d.n || i + 1, m: Object.fromEntries(Object.entries(d.m || {}).map(([k, v]) => [k, String(v)])) }));
    const options = Object.fromEntries(Object.entries(p.options || {}).map(([k, v]) => [k, (v || []).map(String).filter(Boolean)]).filter(([, v]) => v.length));
    return { name: String(p.name || "Minha dieta").slice(0, 60), meals, days, options, add: (p.add || []).map(String), avoid: (p.avoid || []).map(String), tips: (p.tips || []).map(String) };
  }
  function setPlan(plan, source, start) {
    D().plan = { ...plan, source, start: start || todayStr(), created: Date.now() };
    D().over = {};
    save();
  }

  /* ---------- arquivo -> texto (txt, PDF, foto) ---------- */
  async function pdfText(file) {
    const B = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/";
    await RT.load(B + "pdf.min.js");
    if (!Diet._worker) Diet._worker = URL.createObjectURL(new Blob([await (await fetch(B + "pdf.worker.min.js")).text()], { type: "text/javascript" }));
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = Diet._worker;
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const c = await (await pdf.getPage(i)).getTextContent(), rows = [];
      c.items.forEach((it) => {
        const y = Math.round(it.transform[5]);
        let r = rows.find((x) => Math.abs(x.y - y) <= 3);
        if (!r) rows.push(r = { y, t: [] });
        r.t.push({ x: it.transform[4], s: it.str, w: it.width || 0 });
      });
      rows.sort((a, b) => b.y - a.y).forEach((r) => {
        r.t.sort((a, b) => a.x - b.x);
        let line = "", end = null;
        r.t.forEach((t) => { line += (end !== null && t.x - end > 8 ? "\t" : end !== null && !/\s$/.test(line) ? " " : "") + t.s; end = t.x + t.w; });
        out += line.trim() + "\n";
      });
    }
    return out;
  }
  /** Lê .txt/.md/.csv, PDF ou imagem (foto da dieta, via OCR). */
  async function readFile(file, onStatus) {
    const t = file.type || "", n = (file.name || "").toLowerCase();
    if (t === "application/pdf" || n.endsWith(".pdf")) { onStatus && onStatus("Lendo o PDF…"); const x = await pdfText(file); if (x.trim().length > 30) return x; onStatus && onStatus("PDF escaneado: lendo as imagens…"); throw new Error("PDF sem texto selecionável. Envie uma foto/captura da página."); }
    if (t.startsWith("image/")) { onStatus && onStatus("Lendo a foto…"); const r = await OCR.run(file); return r.text; }
    if (t.startsWith("text/") || /\.(txt|md|csv|tsv)$/.test(n)) return file.text();
    throw new Error("Formato não suportado. Use texto, PDF ou foto.");
  }

  /* ---------- cardápio do dia ---------- */
  const dayIdx = (date) => { const p = D().plan; return p ? Math.round((wd(date) - wd(p.start)) / 864e5) : 0; };
  const mod = (n, m) => ((n % m) + m) % m;
  function menu(date) {
    const p = D().plan;
    if (!p) return null;
    const n = dayIdx(date), day = p.days.length ? p.days[mod(n, p.days.length)] : null, ov = D().over[date] || {};
    const items = p.meals.map((meal) => {
      let text = ov[meal.id], src = "troca";
      if (!text && day && day.m[meal.id]) { text = day.m[meal.id]; src = "plano"; }
      if (!text) { const o = p.options[meal.id] || []; if (o.length) { text = o[mod(n, o.length)]; src = "opção"; } }
      return { meal, text: text || "", src };
    });
    return { items, dayNo: day ? day.n : null, total: p.days.length, before: n < 0 };
  }
  function alternatives(mealId) {
    const p = D().plan, set = new Set([...(p.options[mealId] || []), ...p.days.map((d) => d.m[mealId]).filter(Boolean)]);
    return [...set];
  }
  function swap(date, mealId) {
    const cur = (menu(date).items.find((i) => i.meal.id === mealId) || {}).text, alts = alternatives(mealId);
    if (alts.length < 2) return false;
    const next = alts[(alts.indexOf(cur) + 1) % alts.length];
    (D().over[date] = D().over[date] || {})[mealId] = next;
    save();
    return true;
  }

  /* ---------- conferência do que foi comido ---------- */
  function planContext(date) {
    const p = D().plan, m = menu(date), cut = (a) => (a || []).join("; ").slice(0, 900);
    return [
      "REFEIÇÕES PLANEJADAS PARA HOJE: " + m.items.map((i) => i.meal.name + ": " + i.text).join(" || "),
      "OUTRAS OPÇÕES PERMITIDAS: " + p.meals.map((x) => (p.options[x.id] ? x.name + ": " + p.options[x.id].slice(0, 6).join(" | ") : "")).filter(Boolean).join(" || ").slice(0, 2500),
      "ADICIONAR/INCENTIVAR: " + cut(p.add),
      "EVITAR/REMOVER: " + cut(p.avoid),
      "DICAS DO PLANO: " + cut(p.tips)
    ].join("\n").slice(0, 6000);
  }
  /* Equivalência dentro do mesmo tipo de carne: se o plano tem "patinho" ou "carne", almôndega/bife também contam. */
  const GROUPS = [
    ["carne", ["carne", "patinho", "bife", "almondega", "acem", "coxao", "alcatra", "maminha", "file", "moida", "carne moida", "cubos", "tiras", "hamburguer caseiro", "bovina"]],
    ["frango", ["frango", "peito", "sobrecoxa", "coxa", "galinha", "desfiado"]],
    ["peixe", ["tilapia", "peixe", "salmao", "merluza", "atum", "sardinha", "pescada"]]
  ].map(([g, ws]) => [g, new Set(ws.map((w) => stem(norm(w))))]);
  function checkLocal(mealId, text, date) {
    const p = D().plan, m = menu(date), allow = new Set(), avoidW = new Set(AVOID_DEFAULT);
    const feed = (s) => words(s).forEach((w) => allow.add(stem(w)));
    m.items.forEach((i) => { if (i.meal.id === mealId) feed(i.text); });
    (p.options[mealId] || []).forEach(feed);
    p.days.forEach((d) => d.m[mealId] && feed(d.m[mealId]));
    p.add.forEach(feed);
    p.avoid.forEach((a) => words(a).forEach((w) => avoidW.add(stem(w))));
    p.avoid.forEach((a) => { const h = norm(a).replace(/\([^)]*\)/g, "").split(/[:,;]/)[0].trim(); if (h.length > 3 && h.split(" ").length <= 3) avoidW.add(h); });
    const foods = String(text).split(/[,;+\n]| e (?=\w)| com | \+ /i).map((s) => s.trim()).filter((s) => s.length > 1);
    const items = foods.map((food) => {
      const nf = norm(food), ws = words(food).map(stem);
      const bad = [...avoidW].find((a) => nf.includes(a) || ws.includes(a));
      if (bad) return { food, status: "fora", note: "Está na lista do que evitar (" + bad + ")." };
      if (ws.some((w) => allow.has(w))) return { food, status: "dentro", note: "Consta no plano." };
      for (const [g, set] of GROUPS) {
        if (!ws.some((w) => set.has(w))) continue;
        const inPlan = [...allow].find((w) => set.has(w));
        if (inPlan) return { food, status: "dentro", note: "Mesmo tipo de proteína do plano (" + g + ", como " + inPlan + ")." };
      }
      return { food, status: "nao_consta", note: "Não aparece no seu plano para essa refeição." };
    });
    const out = items.filter((i) => i.status === "fora").length, ok = items.filter((i) => i.status === "dentro").length;
    const verdict = out ? "fora" : ok === items.length && items.length ? "dentro" : ok ? "parcial" : "parcial";
    const suggested = (m.items.find((i) => i.meal.id === mealId) || {}).text;
    return {
      verdict, items, source: "local",
      summary: verdict === "dentro" ? "Tudo o que você citou consta no plano." : verdict === "fora" ? "Há item que o plano manda evitar." : "Parte dos itens não consta no plano.",
      tip: suggested && verdict !== "dentro" ? "Sugestão do plano para essa refeição: " + suggested : ""
    };
  }
  /** Confere o que foi comido (texto e/ou foto). IA (se houver) com reserva local para texto. */
  async function check({ meal, text, file, date }) {
    date = date || todayStr();
    const mealName = (D().plan.meals.find((x) => x.id === meal) || {}).name || meal, body = { action: "check", plan: planContext(date), meal: mealName, text: text || "" };
    if (file) { const blob = await OCR.shrink(file); body.image = await OCR.b64(blob); body.mime = "image/jpeg"; }
    try {
      const r = await api(body);
      if (r && r.verdict) return { ...r, source: "ai" };
    } catch {}
    if (file && !text) { const e = new Error("Para ler foto de comida é preciso ativar uma IA de visão (Ajustes → Recursos de IA). Você pode descrever o que comeu."); e.code = "needs-ai"; throw e; }
    return checkLocal(meal, text || "", date);
  }
  function addLog(date, entry) { const L = (D().log[date] = D().log[date] || []); L.push({ id: uid(), ts: Date.now(), ...entry }); save(); return L; }
  function delLog(date, id) { D().log[date] = (D().log[date] || []).filter((x) => x.id !== id); save(); }
  /** Aderência dos últimos 7 dias: % de refeições conferidas que ficaram dentro do plano. */
  function week() {
    const t = wd(todayStr()), days = [];
    for (let i = 6; i >= 0; i--) { const d = ymd(addDays(t, -i)), L = D().log[d] || []; days.push({ d, n: L.length, ok: L.filter((x) => x.verdict === "dentro").length, bad: L.filter((x) => x.verdict === "fora").length }); }
    const n = days.reduce((a, x) => a + x.n, 0), ok = days.reduce((a, x) => a + x.ok, 0);
    return { days, n, pct: n ? Math.round((ok / n) * 100) : null };
  }
  const VERDICT = { dentro: ["Dentro da dieta", "ok"], parcial: ["Parcialmente", "warn"], fora: ["Fora da dieta", "bad"] };
  const chip = (v) => (VERDICT[v] ? `<span class="pill ${VERDICT[v][1]}">${VERDICT[v][0]}</span>` : "");
  const ST = { dentro: "dentro", fora: "fora do plano", nao_consta: "não consta no plano" };
  const resultHtml = (r) => `<div class="dres ${r.verdict}">${chip(r.verdict)} <span class="muted sm">${r.source === "ai" ? "conferido por IA" + (r.provider ? " · " + esc(r.provider) : "") : "conferência simples, sem IA"}</span>
    ${r.summary ? `<p>${esc(r.summary)}</p>` : ""}<ul>${(r.items || []).map((i) => `<li class="${i.status}"><b>${esc(i.food)}</b> · ${ST[i.status] || ""}${i.note ? ` <span class="muted">${esc(i.note)}</span>` : ""}</li>`).join("")}</ul>${r.tip ? `<div class="dtip">${esc(r.tip)}</div>` : ""}</div>`;
  /** Primeira refeição do dia ainda sem registro (para pré-selecionar). */
  const nextMeal = (date) => { const m = menu(date), L = D().log[date] || []; const f = m.items.find((i) => !L.some((x) => x.meal === i.meal.id)); return (f || m.items[0] || { meal: { id: "" } }).meal.id; };
  return { D, parseLocal, importText, setPlan, readFile, menu, swap, alternatives, check, addLog, delLog, week, VERDICT, planOk, chip, resultHtml, nextMeal };
})();
