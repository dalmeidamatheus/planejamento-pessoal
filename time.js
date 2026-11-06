"use strict";
const TZ0 = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
const dtfC = {};
function tzParts(ms, tz) {
  const f = dtfC[tz] || (dtfC[tz] = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  const p = {};
  f.formatToParts(ms).forEach((x) => p[x.type] = x.value);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
}
const toWall = (ms, tz) => new Date(tzParts(ms, tz));
function fromWall(w, tz) {
  const t = w.getTime();
  let g = t - (tzParts(t, tz) - t);
  g = t - (tzParts(g, tz) - g);
  return g;
}
const wd = (s) => {
  const m = String(s).match(/^(\d{4})-(\d\d)-(\d\d)(?:T(\d\d):(\d\d))?/);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)));
};
const ymd = (d) => d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
const hm = (d) => pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
const fmtDT = (d) => ymd(d) + "T" + hm(d);
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
const dayStart = (d) => new Date(Math.floor(d.getTime() / 864e5) * 864e5);
const dimOf = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
const dtz = () => S.settings.tz;
const todayWall = () => toWall(Date.now(), dtz());
const todayStr = () => ymd(todayWall());
const fmtDay = (s) => {
  const d = wd(s);
  return pad(d.getUTCDate()) + "/" + pad(d.getUTCMonth() + 1);
};
const fmtDayL = (s) => {
  const d = wd(s);
  return DSEM[d.getUTCDay()] + ", " + d.getUTCDate() + " " + MES[d.getUTCMonth()].slice(0, 3);
};
const curYm = () => todayStr().slice(0, 7);
const addM = (ym, n) => {
  let [y, m] = ym.split("-").map(Number);
  m += n;
  y += Math.floor((m - 1) / 12);
  m = ((m - 1) % 12 + 12) % 12 + 1;
  return y + "-" + pad(m);
};
const daysIn = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
const ymLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return MES[m - 1] + " " + y;
};
const ymShort = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return MES[m - 1].slice(0, 3) + (ym.slice(2, 4) !== curYm().slice(2, 4) ? "/" + String(y).slice(2) : "");
};
