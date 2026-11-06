"use strict";
const WD_IDX = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const numRe = /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/;
const toNum = (s) => {
  s = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  return parseFloat(s);
};
const CATGUESS = [[/mercado|supermercado|ifood|restaurante|padaria|lanche|almoco|jantar|cafe/, "Alimentação"], [/uber|99|gasolina|combustivel|onibus|metro|estacionamento|pedagio/, "Transporte"], [/aluguel|condominio|luz|energia|agua|internet|gas\b/, "Moradia"], [/farmacia|medico|consulta|dentista|exame|plano de saude/, "Saúde"], [/netflix|spotify|assinatura|youtube|prime|icloud/, "Assinaturas"], [/cinema|bar\b|viagem|show|jogo|passeio/, "Lazer"], [/curso|livro|faculdade|escola|mensalidade/, "Educação"], [/imposto|iptu|ipva|irpf|taxa/, "Impostos"]];
function dateTok(n, s) {
  let m, base = wd(todayStr());
  const cut = (m2) => {
    const b = " ".repeat(m2[0].length);
    n = n.slice(0, m2.index) + b + n.slice(m2.index + m2[0].length);
    s = s.slice(0, m2.index) + b + s.slice(m2.index + m2[0].length);
  };
  if (m = n.match(/\bdepois de amanha\b/)) {
    cut(m);
    return { date: ymd(addDays(base, 2)), n, s };
  }
  if (m = n.match(/\bamanha\b/)) {
    cut(m);
    return { date: ymd(addDays(base, 1)), n, s };
  }
  if (m = n.match(/\bhoje\b/)) {
    cut(m);
    return { date: ymd(base), n, s };
  }
  if (m = n.match(/\bontem\b/)) {
    cut(m);
    return { date: ymd(addDays(base, -1)), n, s };
  }
  if (m = n.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)) {
    cut(m);
    let y = m[3] ? +m[3] : base.getUTCFullYear();
    if (y < 100) y += 2e3;
    return { date: y + "-" + pad(+m[2]) + "-" + pad(+m[1]), n, s };
  }
  if (m = n.match(/\bdia (\d{1,2})\b/)) {
    cut(m);
    let mo = base.getUTCMonth(), y = base.getUTCFullYear();
    if (+m[1] < base.getUTCDate()) {
      mo++;
      if (mo > 11) {
        mo = 0;
        y++;
      }
    }
    return { date: y + "-" + pad(mo + 1) + "-" + pad(+m[1]), n, s };
  }
  if (m = n.match(/\b(?:proxima |proximo |na |no )?(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:-feira)?\b/)) {
    cut(m);
    const w = WD_IDX[m[1]];
    let d = 1;
    while ((base.getUTCDay() + d) % 7 !== w) d++;
    return { date: ymd(addDays(base, d)), n, s };
  }
  return { date: null, n, s };
}
function finNL(type, rest) {
  const n = norm(rest);
  const dt = dateTok(n, rest);
  let s = dt.s, nn = dt.n;
  const m = nn.match(numRe);
  if (!m) return null;
  const amount = toNum(m[1]);
  if (!(amount > 0)) return null;
  s = (s.slice(0, m.index) + " ".repeat(m[0].length) + s.slice(m.index + m[0].length)).replace(/r\$|reais?|\bde\b|\bno\b|\bna\b|\bem\b/gi, " ").replace(/\s+/g, " ").trim();
  const desc = s ? s[0].toUpperCase() + s.slice(1) : type === "in" ? "Receita" : "Despesa", dn = norm(desc);
  let cat = type === "in" ? /salario/.test(dn) ? "Salário" : /freela/.test(dn) ? "Freela" : "Outros" : "Outros";
  if (type === "out") {
    for (const [r, c] of CATGUESS) if (r.test(dn)) {
      cat = c;
      break;
    }
  }
  const date = dt.date || todayStr();
  return { g: "Criar", label: `${type === "in" ? "Registrar entrada" : "Registrar saída"}: ${brl(amount)} — ${desc}`, sub: `${cat} · ${fmtDay(date)} · pago`, run() {
    S.tx.push({ id: uid(), type, desc, amount, date, cat, sub: "", method: "pix", status: "paid" });
    save();
    toast("Transação registrada");
    ui.fin.ym = date.slice(0, 7);
    ui.fin.tab = "tx";
    go("finance");
  } };
}
function evNL(raw, force) {
  let n = norm(raw), s = raw;
  const cut = (m2) => {
    const b = " ".repeat(m2[0].length);
    n = n.slice(0, m2.index) + b + n.slice(m2.index + m2[0].length);
    s = s.slice(0, m2.index) + b + s.slice(m2.index + m2[0].length);
  };
  let m, rec = null, hit = force, dur = 60, time = null;
  if (m = n.match(/\b(toda|todo|todas|todos)\s+((?:(?:segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:-feira)?(?:\s*(?:,|e)\s*)?)+|dia|dias|semana|mes|ano)\b/)) {
    cut(m);
    hit = true;
    const w = m[2].trim();
    if (/dia/.test(w)) rec = { freq: "daily", interval: 1 };
    else if (w === "semana") rec = { freq: "weekly", interval: 1, days: [] };
    else if (w === "mes") rec = { freq: "monthly", interval: 1 };
    else if (w === "ano") rec = { freq: "yearly", interval: 1 };
    else rec = { freq: "weekly", interval: 1, days: [...new Set((w.match(/segunda|terca|quarta|quinta|sexta|sabado|domingo/g) || []).map((x) => WD_IDX[x]))] };
  }
  if (m = n.match(/\b(?:por|durante)\s+(\d+)\s*(h|horas?|min|minutos?)\s*(?:e\s*)?(\d+)?/)) {
    cut(m);
    dur = /^h/.test(m[2]) ? +m[1] * 60 + (+m[3] || 0) : +m[1];
  }
  const dt = dateTok(n, s);
  n = dt.n;
  s = dt.s;
  if (dt.date) hit = true;
  if (m = n.match(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?(?!\d)/)) {
    cut(m);
    time = pad(Math.min(23, +m[1])) + ":" + pad(+(m[2] || 0));
    hit = true;
  } else if (m = n.match(/\bas\s+(\d{1,2})\b/)) {
    cut(m);
    time = pad(Math.min(23, +m[1])) + ":00";
    hit = true;
  }
  if (/\b(evento|reuniao|agendar|marcar|consulta|call|aula)\b/.test(n)) hit = true;
  if (!hit) return null;
  let title = s.replace(/\b(agendar|marcar|criar evento|evento|as|às|para|no|na|em|de)\b(?=\s|$)/gi, (m2) => /^(agendar|marcar|criar evento|evento)$/i.test(m2) ? "" : m2).replace(/\s+/g, " ").replace(/^(as|às|para|no|na|em|de|dia)\s+|\s+(as|às|para|no|na|em|de|dia)$/gi, "").trim();
  title = title ? title[0].toUpperCase() + title.slice(1) : "Compromisso";
  let date = dt.date;
  if (!date) {
    const b = wd(todayStr());
    if (rec?.days?.length) {
      let d = 0;
      while (!rec.days.includes(addDays(b, d).getUTCDay())) d++;
      date = ymd(addDays(b, d));
    } else date = time && time > hm(todayWall()) || !time ? ymd(b) : ymd(addDays(b, 1));
  }
  const st = time || "09:00", en = fmtDT(new Date(wd(date + "T" + st).getTime() + dur * 6e4)), tn = norm(title);
  const tag = /academia|treino|medico|consulta|dentista|corrida|yoga/.test(tn) ? "saude" : /aula|curso|estudo|prova/.test(tn) ? "estudos" : /reuniao|call|cliente|projeto|alinhamento/.test(tn) ? "trabalho" : /jantar|cinema|festa|churrasco|almoco/.test(tn) ? "lazer" : "pessoal";
  return { g: "Criar", label: `Agendar “${title}”`, sub: `${fmtDayL(date)} · ${st}–${en.slice(11)}${rec ? " · repete" : ""}`, run() {
    S.events.push({ id: uid(), title, start: date + "T" + st, end: en, tz: dtz(), tag, prio: "media", allDay: false, rec: rec || { freq: "none" }, ex: [], subtasks: [], links: [], notes: "", remind: 15 });
    save();
    toast("Compromisso agendado");
    ui.cal.d = wd(date);
    go("calendar");
  } };
}
function parseNL(q) {
  const raw = q.trim();
  if (raw.length < 3) return null;
  const n = norm(raw);
  let m;
  if (m = n.match(/^(gasto|gastei|despesa|paguei|compra|comprei|saida)\s+(.*)$/)) return finNL("out", raw.slice(m[1].length).trim());
  if (m = n.match(/^(receita|recebi|entrada|ganhei|salario|freela)\s*(.*)$/)) return finNL("in", (/^(salario|freela)$/.test(m[1]) ? raw : raw.slice(m[1].length)).trim());
  if (m = raw.match(/^(?:anivers[aá]rio|niver)\s+(?:de\s+|do\s+|da\s+)?(.+?)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*$/i)) {
    const name = m[1].trim(), day = +m[2], month = +m[3];
    let year = m[4] ? +m[4] : null;
    if (year && year < 100) year += year > 30 ? 1900 : 2e3;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { g: "Criar", label: `Aniversário: ${name} — ${pad(day)}/${pad(month)}${year ? "/" + year : ""}`, sub: "🎂 avisa no dia", run() {
      S.birthdays.push({ id: uid(), name, day, month, year, before: 0, notes: "" });
      save();
      toast("Aniversário salvo 🎂");
      ui.cal.mode = "month";
      go("calendar");
    } };
  }
  if (m = raw.match(/^(?:desejo|wishlist|quero comprar|lista de desejos)[:\s]+(.+)$/i)) {
    const rest = m[1], url = (rest.match(/https?:\/\/\S+/) || [""])[0], r2 = rest.replace(url, " "), nm = r2.match(numRe), price = nm ? toNum(nm[1]) : 0;
    const name = r2.replace(nm ? nm[0] : "", "").replace(/r\$|reais?/gi, " ").replace(/\s+/g, " ").trim() || (url ? hostOf(url) : "");
    if (name) return { g: "Criar", label: `Desejo: ${name}${price ? " — " + brl(price) : ""}`, sub: url ? "com link" : "lista de desejos", run() {
      if (price > 0) {
        const it = { id: uid(), name, url, price: 0, prio: "media", inst: 1, rate: 0, monitor: false, notes: "", img: "", hist: [] };
        addPoint(it, price);
        it.seenPrice = price;
        S.wishlist.push(it);
        save();
        toast("Adicionado à lista de desejos");
        go("wishlist");
      } else {
        go("wishlist");
        setTimeout(() => openWishForm(null, { name, url }), 30);
      }
    } };
  }
  if (m = n.match(/^(tarefa|todo|fazer)[:\s]+(.+)$/)) {
    const t = raw.slice(m[1].length).replace(/^[:\s]+/, "").trim();
    return { g: "Criar", label: `Nova tarefa: ${t}`, sub: "A fazer", run() {
      S.tasks.push({ id: uid(), title: t, col: "todo", prio: "media", tag: "", due: "", notes: "" });
      save();
      toast("Tarefa criada");
      go("tasks");
    } };
  }
  if (m = n.match(/^(nota|anotar|anotacao)[:\s]+(.+)$/)) {
    const t = raw.slice(m[1].length).replace(/^[:\s]+/, "").trim();
    return { g: "Criar", label: `Nova nota: ${t.slice(0, 50)}`, sub: "Notas", run() {
      const x = { id: uid(), title: t.slice(0, 60), body: t, created: Date.now(), updated: Date.now() };
      S.notes.push(x);
      ui.notes.sel = x.id;
      save();
      toast("Nota criada");
      go("notes");
    } };
  }
  return evNL(raw);
}
