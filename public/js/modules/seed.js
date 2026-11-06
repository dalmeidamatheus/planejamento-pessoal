"use strict";
ACT.seed = () => {
  const T = dayStart(todayWall()), d = (n) => ymd(addDays(T, n)), cur = curYm();
  const ev = (title, n, s, e, tag, x = {}) => S.events.push({ id: uid(), title, start: d(n) + "T" + s, end: d(n) + "T" + e, tz: dtz(), tag, prio: "media", allDay: false, rec: { freq: "none" }, ex: [], subtasks: [], links: [], notes: "", remind: 15, ...x });
  ev("Planejamento semanal", 0, "10:00", "11:00", "trabalho", { prio: "alta", subtasks: [{ t: "Revisar metas", d: true }, { t: "Priorizar backlog", d: false }], links: [{ label: "Pauta", url: "https://docs.google.com" }] });
  ev("Call com cliente", 0, "10:30", "11:30", "trabalho");
  ev("Academia", 0, "18:30", "19:30", "saude", { rec: { freq: "weekly", interval: 1, days: [1, 3, 5], until: "" } });
  ev("Aula de inglês", 1, "20:00", "21:00", "estudos", { rec: { freq: "weekly", interval: 1, days: [2, 4], until: "" } });
  ev("Almoço em família", 3, "12:30", "14:00", "lazer");
  ev("Consulta médica", 2, "15:00", "16:00", "saude", { prio: "alta" });
  ev("Retrospectiva quinzenal", 1, "14:00", "15:00", "trabalho", { rec: { freq: "weekly", interval: 2, days: [], until: "" } });
  ev("Aniversário da Ana", 5, "00:00", "00:00", "pessoal", { allDay: true, start: d(5) + "T00:00", end: d(6) + "T00:00", remind: null });
  S.cards.push({ id: "c1", name: "Nubank", limit: 8e3, closing: 25, due: 5, color: "#6b3f8c" });
  const rc = (type, desc, amount, day, cat) => S.recur.push({ id: uid(), type, desc, amount, cat, sub: "", method: type === "in" ? "transfer" : "boleto", day, start: addM(cur, -3) + "-01", every: 1, until: "", skip: [] });
  rc("in", "Salário", 6500, 5, "Salário");
  rc("out", "Aluguel", 1800, 10, "Moradia");
  rc("out", "Internet", 119.9, 15, "Moradia");
  rc("out", "Netflix + Spotify", 64.8, 20, "Assinaturas");
  for (let i = 3; i >= 0; i--) {
    const m = addM(cur, -i), paid = i > 0 ? "paid" : "pending", dd = (x) => m + "-" + pad(Math.min(x, daysIn(m)));
    S.recur.forEach((r) => {
      if (i > 0) S.tx.push({ id: uid(), type: r.type, desc: r.desc, amount: r.amount, cat: r.cat, sub: "", method: r.method, date: dd(r.day), status: "paid", tpl: r.id, tplYm: m });
    });
    [["Supermercado", 420 + i * 37, "Alimentação", 3], ["iFood", 86.5, "Alimentação", 9], ["Uber", 54.9, "Transporte", 12], ["Farmácia", 73.2, "Saúde", 14], ["Cinema", 58, "Lazer", 18], ["Gasolina", 210, "Transporte", 21]].forEach(([desc, a, cat, day]) => {
      if (i > 0 || day <= todayWall().getUTCDate()) S.tx.push({ id: uid(), type: "out", desc, amount: a, cat, sub: "", method: "pix", date: dd(day), status: "paid" });
    });
    if (i === 1) S.tx.push({ id: uid(), type: "in", desc: "Projeto freelance", amount: 1800, cat: "Freela", sub: "", method: "pix", date: dd(20), status: "paid" });
  }
  const c = S.cards[0], mk = (desc, total, n, pd, cat, paidN) => {
    const cents = Math.round(total * 100), b = Math.floor(cents / n), rem = cents - b * n, grp = uid(), first = invYm(c, pd);
    for (let i = 0; i < n; i++) {
      const inv = addM(first, i);
      S.tx.push({ id: uid(), type: "out", desc, amount: (b + (i < rem ? 1 : 0)) / 100, cat, sub: "", method: "credit", date: dueDate(c, inv), status: i < paidN ? "paid" : "pending", cardId: c.id, invoice: inv, purchase: pd, grp, no: i + 1, of: n });
    }
  };
  mk("Notebook", 4800, 12, addM(cur, -2) + "-10", "Compras", 2);
  mk("Tênis de corrida", 459.9, 3, d(-6), "Compras", 0);
  mk("Curso online", 1200, 6, d(-20), "Educação", 1);
  mk("Restaurante", 187.4, 1, d(-2), "Alimentação", 0);
  S.budgets.push({ id: uid(), cat: "Alimentação", limit: 900 }, { id: uid(), cat: "Lazer", limit: 300 }, { id: uid(), cat: "Transporte", limit: 400 });
  S.goals.push({ id: uid(), name: "Economizar no mês", kind: "mensal", target: 1500, saved: 0, deadline: "" }, { id: uid(), name: "Reserva de emergência", kind: "obj", target: 3e4, saved: 8200, deadline: "" });
  const mv = (m, v) => ({ id: uid(), d: addM(cur, -m) + "-06", a: v, cash: true });
  const ck = (m, day, v) => ({ id: uid(), d: addM(cur, -m) + "-" + day, v });
  S.assets.push(
    { id: "a1", name: "Tesouro Selic", type: "rf", moves: [mv(5, 1500), mv(3, 1500), mv(1, 1e3)], checks: [ck(5, "20", 1512.4), ck(4, "20", 1531.1), ck(3, "28", 3052.8), ck(2, "20", 3081.3), ck(1, "28", 4103.9), ck(0, "01", 4128.5)] },
    { id: "a2", name: "PETR4", type: "acoes", moves: [mv(4, 800), mv(2, 600)], checks: [ck(4, "25", 812), ck(3, "25", 776), ck(2, "25", 1391), ck(1, "25", 1430), ck(0, "02", 1388)] },
    { id: "a3", name: "Bitcoin", type: "cripto", moves: [mv(3, 500)], checks: [ck(3, "20", 505), ck(2, "20", 590), ck(1, "20", 540), ck(0, "03", 612)] },
    { id: "a4", name: "HGLG11", type: "fii", moves: [mv(4, 1200), mv(1, 700)], checks: [ck(4, "28", 1204), ck(3, "28", 1211), ck(2, "28", 1218), ck(1, "28", 1925), ck(0, "03", 1936)] }
  );
  S.divs.push({ id: uid(), assetId: "a4", date: d(-30), amount: 11.4 }, { id: uid(), assetId: "a4", date: d(-3), amount: 15.8 }, { id: uid(), assetId: "a2", date: d(-40), amount: 32 });
  S.tasks.push({ id: uid(), title: "Enviar proposta ao cliente", col: "todo", prio: "alta", tag: "trabalho", due: d(0), notes: "" }, { id: uid(), title: "Renovar seguro do carro", col: "todo", prio: "media", tag: "pessoal", due: d(2), notes: "" }, { id: uid(), title: "Preparar apresentação", col: "doing", prio: "alta", tag: "trabalho", due: d(1), notes: "" }, { id: uid(), title: "Ler capítulo 4", col: "doing", prio: "baixa", tag: "estudos", due: "", notes: "" }, { id: uid(), title: "Marcar dentista", col: "done", prio: "baixa", tag: "saude", due: "", notes: "" });
  ["Beber 2L de água", "Meditar 10 min", "Exercício", "Ler 20 páginas"].forEach((name, k) => {
    const log = {};
    for (let i = 0; i < 60; i++) {
      if ((i * 7 + k * 13) % 10 < 7 - k) log[d(-i)] = true;
    }
    S.habits.push({ id: uid(), name, color: HCOL[k], log });
  });
  S.notes.push({ id: uid(), title: "Bem-vindo ao Norte", body: "# Bem-vindo 👋\n\nEsta é uma nota em **Markdown**.\n\n- Use `Ctrl+K` para buscar ou criar com linguagem natural\n- Vincule notas a eventos e transações\n- Clique em **Gravar reunião** para transcrever por voz e gerar resumo\n\n- [ ] Explorar o calendário\n- [x] Carregar dados de exemplo", created: Date.now(), updated: Date.now() });
  const bd = (name, off, year, before, notes) => {
    const x = addDays(T, off);
    S.birthdays.push({ id: uid(), name, day: x.getUTCDate(), month: x.getUTCMonth() + 1, year, before, notes });
  };
  bd("Carlos (amigo)", 0, 1988, 0, "Levar um vinho");
  bd("Ana (irmã)", 5, 1994, 3, "Ideia: livro de receitas");
  bd("Mãe", 19, 1962, 7, "");
  bd("Pedro (chefe)", 41, null, 1, "");
  const wi = (name, price, hist, x = {}) => {
    const it = { id: uid(), name, url: "", price, prio: "media", inst: 1, rate: 0, target: 0, by: "", monitor: false, notes: "", img: "", hist: hist.map(([o, p]) => ({ d: d(o), p })), ...x };
    it.seenPrice = price;
    S.wishlist.push(it);
  };
  wi("Fone com cancelamento de ruído", 1299, [[-75, 1499], [-40, 1399], [-12, 1349], [-3, 1299]], { url: "https://www.exemplo.com.br/fone-ruido", prio: "alta", inst: 10, rate: 0, target: 1100, monitor: true, notes: "Esperar a Black Friday" });
  wi("Cadeira ergonômica", 1890, [[-50, 1890], [-20, 1990], [-2, 1890]], { url: "https://www.exemplo.com.br/cadeira", prio: "media", inst: 12, rate: 1.99, by: ymd(addDays(T, 120)), monitor: true });
  wi("Câmera mirrorless", 4200, [[-10, 4200]], { prio: "baixa", inst: 12, rate: 2.5 });
  S.trips.push({ id: uid(), name: "Férias em Lisboa", dest: "Lisboa, Portugal", emoji: "✈️", start: ymd(addDays(T, 240)), end: ymd(addDays(T, 250)), people: 2, notes: "Pesquisar seguro viagem", items: [{ id: uid(), name: "Passagem aérea", cat: "passagem", amount: 3200, mult: "pessoa" }, { id: uid(), name: "Hotel", cat: "hospedagem", amount: 380, mult: "dia" }, { id: uid(), name: "Refeições", cat: "alimentacao", amount: 120, mult: "pessoa_dia" }, { id: uid(), name: "Passeios", cat: "passeios", amount: 900, mult: "fixo" }, { id: uid(), name: "Seguro viagem", cat: "seguro", amount: 210, mult: "pessoa" }], deposits: [{ id: uid(), date: d(-30), amount: 1500 }, { id: uid(), date: d(-2), amount: 800 }] });
  S.trips.push({ id: uid(), name: "Fim de semana na serra", dest: "Campos do Jordão", emoji: "🏔️", start: ymd(addDays(T, 75)), end: ymd(addDays(T, 77)), people: 2, notes: "", items: [{ id: uid(), name: "Pousada", cat: "hospedagem", amount: 450, mult: "dia" }, { id: uid(), name: "Gasolina e pedágio", cat: "transporte", amount: 280, mult: "fixo" }, { id: uid(), name: "Alimentação", cat: "alimentacao", amount: 150, mult: "pessoa_dia" }], deposits: [{ id: uid(), date: d(-5), amount: 300 }] });
  save();
  closeModal();
  render();
  toast("Dados de exemplo carregados");
};
