"use strict";
const HOL_FIXED = [[1, 1, "Confraternização Universal"], [4, 21, "Tiradentes"], [5, 1, "Dia do Trabalho"], [9, 7, "Independência do Brasil"], [10, 12, "Nossa Senhora Aparecida"], [11, 2, "Finados"], [11, 15, "Proclamação da República"], [11, 20, "Consciência Negra"], [12, 25, "Natal"]];
const holCache = {};
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = (h + l - 7 * m + 114) % 31 + 1;
  return new Date(Date.UTC(y, mo - 1, da));
}
function holidaysOf(y) {
  if (holCache[y]) return holCache[y];
  const p = easter(y), at = (n) => addDays(p, n);
  const L = HOL_FIXED.map(([m, d, name]) => ({ date: new Date(Date.UTC(y, m - 1, d)), name, opt: false }));
  L.push({ date: at(-48), name: "Carnaval", opt: true }, { date: at(-47), name: "Carnaval", opt: true }, { date: at(-2), name: "Sexta-feira Santa", opt: false }, { date: p, name: "Páscoa", opt: true }, { date: at(60), name: "Corpus Christi", opt: true });
  return holCache[y] = L.sort((a, b) => a.date - b.date);
}
const holEvent = (h) => ({ id: "hol:" + ymd(h.date), title: "🎉 " + h.name, tag: "lazer", prio: "baixa", allDay: true, rec: { freq: "none" }, ex: [], start: ymd(h.date) + "T00:00", end: ymd(addDays(h.date, 1)) + "T00:00", remind: null, holiday: true, opt: h.opt, notes: h.opt ? "Ponto facultativo / data comemorativa" : "Feriado nacional" });
function holidayOccs(fromW, toW) {
  if (S.settings.showHolidays === false) return [];
  const out = [], lo = dayStart(fromW);
  for (let y = fromW.getUTCFullYear(); y <= toW.getUTCFullYear(); y++) holidaysOf(y).forEach((h) => {
    if (h.date < lo || h.date >= toW) return;
    const nd = addDays(h.date, 1);
    out.push({ e: holEvent(h), sMs: fromWall(h.date, dtz()), eMs: fromWall(nd, dtz()), key: ymd(h.date), ds: h.date, de: nd, allDay: true });
  });
  return out;
}
function holidayList() {
  const t = wd(todayStr()), y = t.getUTCFullYear();
  return [...holidaysOf(y), ...holidaysOf(y + 1)].filter((h) => h.date >= t && h.date < addDays(t, 366));
}
function openHoliday(key) {
  const d = wd(key), h = holidaysOf(d.getUTCFullYear()).find((x) => ymd(x.date) === key);
  if (!h) return;
  modal(`<h2>🎉 ${esc(h.name)}</h2><p class="muted">${fmtDay(key)}/${key.slice(0, 4)} · ${h.opt ? "ponto facultativo / data comemorativa" : "feriado nacional"}</p>
   <label class="row sm" style="margin:10px 0"><input type="checkbox" data-ch="calHol" checked> Mostrar feriados no calendário</label>
   <div class="foot"><span class="grow"></span><button class="btn" data-act="close">Fechar</button></div>`);
}
INP.calHol = (el) => {
  S.settings.showHolidays = el.checked;
  save();
  closeModal();
  render();
};
ACT.holOpen = (el) => openHoliday(el.dataset.id);
