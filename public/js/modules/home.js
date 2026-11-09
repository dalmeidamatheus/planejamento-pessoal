"use strict";
VIEWS.home = () => {
  const t = todayWall(), ts = todayStr(), h = t.getUTCHours(), g = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const os = occs(dayStart(t), addDays(dayStart(t), 1)), tasks = S.tasks.filter((x) => x.col !== "done" && x.due && x.due <= ts).slice(0, 6), T = totals(curYm()), cur = curYm();
  const up = [...monthTx(cur), ...monthTx(addM(cur, 1))].filter((x) => x.type === "out" && x.status !== "paid").slice(0, 4);
  const notes = [...S.notes].sort((a, b) => b.updated - a.updated).slice(0, 4);
  return `<div style="margin-bottom:16px"><h2 style="font-size:20px">${g}, ${esc(user.email.split("@")[0])}</h2><div class="muted">${DSEML[t.getUTCDay()]}, ${t.getUTCDate()} de ${MES[t.getUTCMonth()]} · ${os.length} compromisso(s) hoje</div></div>
  ${!S.events.length && !S.tx.length && !S.tasks.length ? `<div class="card flat" style="margin-bottom:14px;display:flex;align-items:center;gap:12px"><div class="grow"><b>Bem-vindo ao Norte</b><div class="muted sm">Pressione <kbd>Ctrl</kbd> <kbd>K</kbd> e digite, por exemplo: <i>reunião amanhã 14h</i>, <i>gasto 45 mercado</i>, <i>tarefa enviar proposta</i>.</div></div><button class="btn" data-act="seed">Carregar exemplo</button></div>` : ""}
  <div class="cols c4" style="margin-bottom:14px"><div class="card stat"><div class="l">Saldo do mês</div><div class="v ${T.in - T.out < 0 ? "neg" : ""}">${brl(T.in - T.out)}</div><div class="s">${brl(T.in)} entradas · ${brl(T.out)} saídas</div></div>
   ${statCash()}${statInv()}${statNet()}</div>
  <div class="cols c2"><div class="card"><div class="hd"><h2>Hoje na agenda</h2><button class="btn sm ghost" data-act="goCal">Abrir calendário</button></div>
   ${os.length ? `<div class="list">${os.map((o) => `<div class="it" data-act="openOcc" data-id="${o.e.id}" data-key="${o.key}"><span class="dot" style="--c:${tagC(o.e)}"></span><span class="muted sm" style="width:92px">${o.allDay ? "Dia todo" : hm(o.ds) + "–" + hm(o.de)}</span><span class="grow">${esc(o.e.title)}</span>${o.conflict ? '<span class="pill info">⇄ ao mesmo tempo</span>' : ""}</div>`).join("")}</div>` : '<div class="empty">Dia livre.</div>'}</div>
   <div class="card"><div class="hd"><h2>Tarefas de hoje</h2><button class="btn sm ghost" data-act="goTasks">Ver quadro</button></div>${tasks.length ? `<div class="list">${tasks.map((x) => `<div class="it" data-act="openTask" data-id="${x.id}"><span class="grow">${esc(x.title)}</span>${x.due < todayStr() ? '<span class="pill bad">atrasada</span>' : ""}${x.prio === "alta" ? '<span class="pill bad">Alta</span>' : ""}</div>`).join("")}</div>` : '<div class="empty">Nada para hoje 🎉</div>'}</div>
   ${bdCard()}<div class="card"><div class="hd"><h2>Hábitos de hoje</h2></div>${S.habits.length ? `<div class="list">${S.habits.map((x) => `<div class="it" style="cursor:default"><button class="hc ${x.log[ts] ? "on" : ""}" style="--c:${x.color}" data-act="habitToggle" data-id="${x.id}" data-d="${ts}">${x.log[ts] ? ic("check", 13) : ""}</button><span class="grow">${esc(x.name)}</span><span class="muted sm">${streak(x)} 🔥</span></div>`).join("")}</div>` : '<div class="empty">Sem hábitos.</div>'}</div>
   <div class="card"><div class="hd"><h2>Contas a vencer</h2><button class="btn sm ghost" data-act="goFin">Finanças</button></div>${up.length ? `<div class="list">${up.map((x) => `<div class="it" data-act="openTx" data-id="${x.id}"><div class="grow">${esc(x.desc)}<div class="muted sm">${fmtDayL(x.date)}</div></div><div class="num">${brl(x.amount)}</div></div>`).join("")}</div>` : '<div class="empty">Tudo em dia.</div>'}</div></div>
  ${notes.length ? `<div class="card" style="margin-top:14px"><div class="hd"><h2>Notas recentes</h2><button class="btn sm ghost" data-act="goNotes">Abrir notas</button></div><div class="list">${notes.map((n) => `<div class="it" data-act="goNote" data-id="${n.id}"><span class="grow">${esc(n.title || "Sem título")}</span><span class="muted sm">${fmtTs(n.updated)}</span></div>`).join("")}</div></div>` : ""}`;
};
ACT.goCal = () => go("calendar");
ACT.goTasks = () => go("tasks");
ACT.goFin = () => go("finance");
ACT.goNotes = () => go("notes");
ACT.goNote = (el) => {
  ui.notes.sel = el.dataset.id;
  go("notes");
};
