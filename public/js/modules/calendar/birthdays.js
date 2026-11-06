"use strict";
const BD_BEFORE = [[0, "Só no dia"], [1, "No dia e 1 dia antes"], [3, "No dia e 3 dias antes"], [7, "No dia e 1 semana antes"]];
const isLeap = (y) => y % 4 === 0 && y % 100 !== 0 || y % 400 === 0;
const bdDate = (b, y) => new Date(Date.UTC(y, b.month - 1, b.month === 2 && b.day === 29 && !isLeap(y) ? 28 : b.day));
const bdTitle = (b, y) => "🎂 " + b.name + (b.year ? ` (${y - b.year})` : "");
function bdNext(b) {
  const t = wd(todayStr());
  let y = t.getUTCFullYear(), d = bdDate(b, y);
  if (d < t) {
    y++;
    d = bdDate(b, y);
  }
  return { date: d, year: y, days: Math.round((d - t) / 864e5), age: b.year ? y - b.year : null };
}
function birthdayOccs(fromW, toW) {
  if (S.settings.showBirthdays === false) return [];
  const out = [], lo = dayStart(fromW);
  for (let y = fromW.getUTCFullYear(); y <= toW.getUTCFullYear(); y++) (S.birthdays || []).forEach((b) => {
    const d = bdDate(b, y);
    if (d < lo || d >= toW) return;
    const nd = addDays(d, 1);
    const e = { id: "bd:" + b.id, title: bdTitle(b, y), tag: "lazer", prio: "baixa", allDay: true, rec: { freq: "none" }, ex: [], start: ymd(d) + "T00:00", end: ymd(nd) + "T00:00", remind: null, birthday: true };
    out.push({ e, sMs: fromWall(d, dtz()), eMs: fromWall(nd, dtz()), key: ymd(d), ds: d, de: nd, allDay: true });
  });
  return out;
}
function birthdayTick() {
  (S.birthdays || []).forEach((b) => {
    const n = bdNext(b), who = b.name + (n.age ? ` (${n.age} anos)` : "");
    if (n.days === 0) pushNotif(`🎂 Hoje é aniversário de ${who}! 🎉 Mande os parabéns.`, "bd0:" + b.id + ":" + n.year);
    else if (b.before > 0 && n.days === b.before) pushNotif(`🎁 Aniversário de ${who} em ${n.days === 1 ? "1 dia (amanhã)" : n.days + " dias"} — hora de pensar no presente.`, "bdp:" + b.id + ":" + n.year);
  });
}
function birthdayIcsEvents() {
  const y = wd(todayStr()).getUTCFullYear();
  return (S.birthdays || []).map((b) => {
    const d = bdDate(b, y);
    return { id: "bd" + b.id, title: "🎂 " + b.name, allDay: true, start: ymd(d) + "T00:00", end: ymd(addDays(d, 1)) + "T00:00", rec: { freq: "yearly", interval: 1 }, ex: [], tag: "lazer", prio: "baixa", remind: null, notes: b.notes || "" };
  });
}
function bdCard() {
  const L = (S.birthdays || []).map((b) => ({ b, n: bdNext(b) })).filter((x) => x.n.days <= 30).sort((a, b) => a.n.days - b.n.days).slice(0, 4);
  return `<div class="card"><div class="hd"><h2>🎂 Aniversários</h2><button class="btn sm ghost" data-act="birthdays">Gerenciar</button></div>${L.length ? `<div class="list">${L.map(({ b, n }) => `<div class="it" data-act="bdEdit" data-id="${b.id}"><span class="grow">${esc(b.name)}${n.age ? ` <span class="muted sm">${n.age} anos</span>` : ""}</span><span class="pill ${n.days === 0 ? "ok" : ""}">${n.days === 0 ? "hoje 🎉" : n.days === 1 ? "amanhã" : "em " + n.days + " dias"}</span></div>`).join("")}</div>` : '<div class="empty">Nenhum nos próximos 30 dias.</div>'}</div>`;
}
ACT.birthdays = () => {
  const L = (S.birthdays || []).map((b) => ({ b, n: bdNext(b) })).sort((a, b) => a.n.days - b.n.days);
  modal(`<div class="row" style="margin-bottom:10px"><h2 class="grow" style="margin:0">🎂 Aniversários</h2><button class="btn primary" data-act="bdNew">${ic("plus")}Adicionar</button></div>
   <label class="row sm" style="margin-bottom:8px"><input type="checkbox" data-ch="bdShow" ${S.settings.showBirthdays !== false ? "checked" : ""}> Mostrar aniversários no calendário</label>
   ${L.length ? `<div class="list" style="max-height:50vh;overflow:auto">${L.map(({ b, n }) => `<div class="it" data-act="bdEdit" data-id="${b.id}"><span style="font-size:18px">🎂</span><div class="grow">${esc(b.name)}<div class="muted sm">${pad(b.day)}/${pad(b.month)}${b.year ? "/" + b.year : ""}${b.before ? ` · avisa ${b.before === 7 ? "1 semana" : b.before + " dia(s)"} antes` : ""}${b.notes ? " · " + esc(b.notes.slice(0, 40)) : ""}</div></div><span class="pill ${n.days === 0 ? "ok" : n.days <= 7 ? "blue" : ""}">${n.days === 0 ? "hoje 🎉" : n.days === 1 ? "amanhã" : "em " + n.days + " dias"}</span></div>`).join("")}</div>` : '<div class="empty">Nenhum aniversário cadastrado.</div>'}
   <div class="foot"><button class="btn" data-act="close">Fechar</button></div>`);
};
INP.bdShow = (el) => {
  S.settings.showBirthdays = el.checked;
  save();
  render();
};
ACT.bdNew = () => openBirthday(null);
ACT.bdEdit = (el) => openBirthday(el.dataset.id);
let dBd = null;
function openBirthday(id) {
  const b = id ? S.birthdays.find((x) => x.id === id) : { name: "", day: "", month: wd(todayStr()).getUTCMonth() + 1, year: "", before: 0, notes: "" };
  dBd = id;
  if (id && !b) return;
  modal(`<form data-form="birthday"><h2>${id ? "Editar" : "Novo"} aniversário</h2><label class="field"><span>Nome</span><input type="text" name="name" value="${esc(b.name)}" required placeholder="Ana, Mãe, Chefe…"></label>
   <div class="grid3"><label class="field"><span>Dia</span><input type="number" min="1" max="31" name="day" value="${b.day}" required></label>
    <label class="field"><span>Mês</span><select name="month">${MES.map((m, i) => `<option value="${i + 1}" ${b.month === i + 1 ? "selected" : ""}>${m}</option>`).join("")}</select></label>
    <label class="field"><span>Ano (opcional)</span><input type="number" min="1900" max="2100" name="year" value="${b.year || ""}" placeholder="p/ mostrar idade"></label></div>
   <label class="field"><span>Avisar</span><select name="before">${BD_BEFORE.map(([v, n]) => `<option value="${v}" ${b.before === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
   <label class="field"><span>Notas (ideias de presente…)</span><textarea name="notes" rows="2">${esc(b.notes || "")}</textarea></label>
   <div class="foot">${id ? `<button type="button" class="btn danger" data-act="bdDel">${ic("trash")}Excluir</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
}
SUBMIT.birthday = (f, fd) => {
  const day = +fd.get("day"), month = +fd.get("month");
  if (day < 1 || day > new Date(Date.UTC(2024, month, 0)).getUTCDate()) {
    toast("Dia inválido para este mês", true);
    return;
  }
  const o = { name: fd.get("name").trim(), day, month, year: +fd.get("year") || null, before: +fd.get("before") || 0, notes: fd.get("notes") };
  if (dBd) Object.assign(S.birthdays.find((x) => x.id === dBd), o);
  else S.birthdays.push({ id: uid(), ...o });
  save();
  birthdayTick();
  closeModal();
  render();
  toast("Aniversário salvo 🎂");
};
ACT.bdDel = () => {
  if (!confirmDlg("Excluir este aniversário?")) return;
  S.birthdays = S.birthdays.filter((x) => x.id !== dBd);
  save();
  closeModal();
  render();
};
