"use strict";
let pal = { res: [], i: 0 };
function openPalette(q = "") {
  $("#overlay").innerHTML = `<div class="scrim" data-act="scrim" style="padding-top:12vh"><div class="pal"><input type="text" id="palIn" placeholder="Buscar ou criar… ex.: reunião amanhã 14h · gasto 45 mercado · toda terça e quinta 19h academia" autocomplete="off" value="${esc(q)}"><div class="res" id="palRes"></div><div class="hint"><kbd>↑</kbd> <kbd>↓</kbd> navegar · <kbd>Enter</kbd> executar · <kbd>Esc</kbd> fechar</div></div></div>`;
  const inp = $("#palIn");
  inp.focus();
  palUpdate();
  inp.addEventListener("input", palUpdate);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      pal.i = Math.min(pal.res.length - 1, pal.i + 1);
      palDraw();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      pal.i = Math.max(0, pal.i - 1);
      palDraw();
    } else if (e.key === "Enter") {
      e.preventDefault();
      palRun(pal.i);
    }
  });
}
function palCommands() {
  return [
    ...NAV.map(([k, n, i]) => ({ g: "Ir para", label: n, ic: i, run: () => go(k) })),
    { g: "Ações", label: "Novo compromisso", ic: "calendar", run: () => {
      go("calendar");
      setTimeout(ACT.newEvent, 30);
    } },
    { g: "Ações", label: "Nova transação", ic: "wallet", run: () => {
      ui.fin.tab = "tx";
      go("finance");
      setTimeout(() => openTx(null), 30);
    } },
    { g: "Ações", label: "Compra no cartão parcelada", ic: "card", run: () => {
      ui.fin.tab = "cards";
      go("finance");
      setTimeout(() => openTx(null, { method: "credit" }), 30);
    } },
    { g: "Ações", label: "Nova tarefa", ic: "tasks", run: () => {
      go("tasks");
      setTimeout(() => openTask(null), 30);
    } },
    { g: "Ações", label: "Novo hábito", ic: "habits", run: () => {
      go("habits");
      setTimeout(() => openHabit(), 30);
    } },
    { g: "Ações", label: "Nova nota", ic: "notes", run: ACT.newNote },
    { g: "Ações", label: "Novo item na lista de desejos", ic: "gift", run: () => {
      go("wishlist");
      setTimeout(ACT.newWish, 30);
    } },
    { g: "Ações", label: "Nova caixinha de viagem", ic: "plane", run: () => {
      go("trips");
      setTimeout(ACT.newTrip, 30);
    } },
    { g: "Ações", label: "Aniversários", ic: "calendar", run: () => ACT.birthdays() },
    { g: "Ações", label: "Gravar reunião (transcrever e resumir)", ic: "mic", run: ACT.newMeeting },
    { g: "Finanças", label: "Cartões e faturas", ic: "card", run: () => {
      ui.fin.tab = "cards";
      go("finance");
    } },
    { g: "Finanças", label: "Investimentos", ic: "trend", run: () => {
      ui.fin.tab = "inv";
      go("finance");
    } },
    { g: "Finanças", label: "Orçamentos e metas", ic: "target", run: () => {
      ui.fin.tab = "bud";
      go("finance");
    } },
    { g: "Calendário", label: "Visão de mês", ic: "calendar", run: () => {
      ui.cal.mode = "month";
      go("calendar");
    } },
    { g: "Calendário", label: "Visão de semana", ic: "calendar", run: () => {
      ui.cal.mode = "week";
      go("calendar");
    } },
    { g: "Calendário", label: "Agenda em lista", ic: "calendar", run: () => {
      ui.cal.mode = "agenda";
      go("calendar");
    } },
    { g: "Sistema", label: "Ajustes, fusos e backup", ic: "settings", run: () => ACT.settings() },
    { g: "Sistema", label: "Sair", ic: "logout", run: logout }
  ];
}
function palUpdate() {
  const q = $("#palIn").value.trim(), nq = norm(q);
  let res = [];
  const nl = q ? parseNL(q) : null;
  if (nl) res.push(nl);
  const cmds = palCommands().filter((c) => !nq || norm(c.label + " " + c.g).includes(nq));
  if (!nq) res = res.concat(cmds.filter((c) => c.g !== "Ir para" || true).slice(0, 14));
  else {
    res = res.concat(cmds.slice(0, 5));
    const has = (...a) => norm(a.join(" ")).includes(nq);
    S.events.filter((e) => has(e.title)).slice(0, 5).forEach((e) => res.push({ g: "Compromissos", label: e.title, sub: fmtDay(e.start.slice(0, 10)), ic: "calendar", run: () => {
      ui.cal.d = wd(e.start.slice(0, 10));
      go("calendar");
      setTimeout(() => openEvent(e.id, e.start.slice(0, 10)), 40);
    } }));
    S.tx.filter((t) => has(t.desc, t.cat, t.sub)).slice(0, 5).forEach((t) => res.push({ g: "Transações", label: t.desc, sub: brl(t.amount) + " · " + fmtDay(t.date), ic: "wallet", run: () => {
      ui.fin.tab = "tx";
      ui.fin.ym = t.date.slice(0, 7);
      go("finance");
      setTimeout(() => openTx(t.id), 40);
    } }));
    S.tasks.filter((t) => has(t.title, t.notes)).slice(0, 5).forEach((t) => res.push({ g: "Tarefas", label: t.title, sub: KCOLS.find((c) => c[0] === t.col)[1], ic: "tasks", run: () => {
      go("tasks");
      setTimeout(() => openTask(t.id), 40);
    } }));
    S.notes.filter((t) => has(t.title, t.body)).slice(0, 5).forEach((t) => res.push({ g: "Notas", label: t.title || "Sem título", sub: fmtTs(t.updated), ic: "notes", run: () => {
      ui.notes.sel = t.id;
      go("notes");
    } }));
    S.habits.filter((t) => has(t.name)).slice(0, 3).forEach((t) => res.push({ g: "Hábitos", label: t.name, sub: streak(t) + " dias seguidos", ic: "habits", run: () => go("habits") }));
    S.wishlist.filter((t) => has(t.name, t.notes)).slice(0, 4).forEach((t) => res.push({ g: "Desejos", label: t.name, sub: brl(curPrice(t)), ic: "gift", run: () => {
      go("wishlist");
      setTimeout(() => openWish(t.id), 40);
    } }));
    S.trips.filter((t) => has(t.name, t.dest)).slice(0, 3).forEach((t) => res.push({ g: "Viagens", label: t.name, sub: t.dest || "", ic: "plane", run: () => {
      go("trips");
      setTimeout(() => openTrip(t.id), 40);
    } }));
    (S.birthdays || []).filter((t) => has(t.name)).slice(0, 3).forEach((t) => res.push({ g: "Aniversários", label: "🎂 " + t.name, sub: pad(t.day) + "/" + pad(t.month), ic: "calendar", run: () => openBirthday(t.id) }));
  }
  pal.res = res;
  pal.i = 0;
  palDraw();
}
function palDraw() {
  let g = "", h = "";
  pal.res.forEach((r, i) => {
    if (r.g !== g) {
      g = r.g;
      h += `<div class="g">${esc(g)}</div>`;
    }
    h += `<div class="r ${i === pal.i ? "on" : ""}" data-act="palPick" data-i="${i}">${ic(r.ic || "plus", 15)}<span>${esc(r.label)}</span><small>${esc(r.sub || "")}</small></div>`;
  });
  $("#palRes").innerHTML = h || '<div class="empty">Nada encontrado. Tente “reunião amanhã 14h” ou “gasto 30 padaria”.</div>';
  $("#palRes .r.on")?.scrollIntoView({ block: "nearest" });
}
function palRun(i) {
  const r = pal.res[i];
  if (!r) return;
  closeModal();
  r.run();
}
ACT.palPick = (el) => palRun(+el.dataset.i);
ACT.palette = () => openPalette();
ACT.quick = () => openPalette();
