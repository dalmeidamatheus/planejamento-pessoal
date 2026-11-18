"use strict";
/* Início: resumo do dia */
function dayOccs(ds) {
  const d = wd(ds);
  return occs(d, addDays(d, 1));
}
const timeLbl = (o) => (o.allDay ? "Dia todo" : hm(o.ds) + (hm(o.de) !== hm(o.ds) ? "–" + hm(o.de) : ""));
function occRow(o) {
  const ro = o.e.birthday || String(o.e.id).startsWith("hol:");
  return `<div class="row-it ${o.e.done ? "done" : ""}" ${ro ? "" : `data-act="evOpen" data-id="${o.e.id}" data-key="${o.key}"`}><span class="bar" style="background:${tagC(o.e)}"></span><div class="tm">${timeLbl(o)}</div><div class="grow"><b>${esc(o.e.title)}</b>${o.conflict ? '<div class="sm warn-t">junto com ' + esc((o.with || []).join(", ")) + "</div>" : ""}</div></div>`;
}
MV.home = () => {
  const ts = todayStr(), t = todayWall();
  const evs = dayOccs(ts);
  const tasks = S.tasks.filter((x) => x.col !== "done" && (x.pin || x.due && x.due <= ts)).sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (a.due || "9").localeCompare(b.due || "9")).slice(0, 6);
  const tot = totals(curYm());
  const notes = [...S.notes].sort((a, b) => b.updated - a.updated).slice(0, 3);
  const hab = S.habits;
  const hi = new Date().getHours();
  return `<div class="hello"><div class="muted">${hi < 12 ? "Bom dia" : hi < 18 ? "Boa tarde" : "Boa noite"}</div><h2>${DSEML[t.getUTCDay()]}, ${t.getUTCDate()} de ${MES[t.getUTCMonth()]}</h2></div>
  <section class="msec"><div class="sh"><h3>Hoje na agenda</h3><a href="#/agenda">Ver agenda</a></div>${evs.length ? evs.map(occRow).join("") : '<div class="empty">Nada marcado para hoje</div>'}</section>
  <section class="msec"><div class="sh"><h3>Tarefas em foco</h3><a href="#/tasks">Ver todas</a></div>${tasks.length ? tasks.map((x) => `<div class="row-it"><button class="tk-chk" data-act="homeDone" data-id="${x.id}" aria-label="Concluir"></button><div class="grow" data-act="tkOpen" data-id="${x.id}"><b>${x.pin ? ic("pin", 12) + " " : ""}${esc(x.title)}</b><div class="sm muted">${x.due ? (x.due < ts ? '<span class="neg">atrasada · </span>' : "") + (x.due === ts ? "hoje" : fmtDay(x.due)) : "sem prazo"} ${prioPill(x.prio)}</div></div></div>`).join("") : '<div class="empty">Sem tarefas para hoje.</div>'}</section>
  ${hab.length ? `<section class="msec"><div class="sh"><h3>Hábitos de hoje</h3><a href="#/habits">Ver todos</a></div><div class="chips">${hab.map((h) => `<button class="hchip ${h.log[ts] ? "on" : ""}" style="--c:${h.color}" data-act="habToggle" data-id="${h.id}" data-d="${ts}">${h.log[ts] ? ic("check", 12) + " " : ""}${esc(h.name)}</button>`).join("")}</div></section>` : ""}
  <section class="msec"><div class="sh"><h3>Finanças · ${ymLabel(curYm())}</h3><a href="#/finance">Abrir</a></div><div class="stats"><div><span>Saldo hoje</span><b>${brl(cashAvailable(ts))}</b></div><div><span>Entradas</span><b class="pos">${brl(tot.in)}</b></div><div><span>Saídas</span><b class="neg">${brl(tot.out)}</b></div></div></section>
  ${dietHome()}<section class="msec"><div class="sh"><h3>Notas recentes</h3><a href="#/notes">Ver notas</a></div>${notes.length ? notes.map((n) => `<div class="row-it" data-act="noteOpen" data-id="${n.id}"><span class="emo">${ic(NoteDoc.isMeeting(n) ? "mic" : "notes", 20)}</span><div class="grow"><b>${esc(n.title || "Sem título")}</b><div class="sm muted ell">${prevText(n.body)}</div></div></div>`).join("") : '<div class="empty">Nenhuma nota ainda.</div>'}</section>`;
};
ACT.homeDone = (el) => { TaskOps.setCol(el.dataset.id, "done"); save(); render(); };
