"use strict";
const HH = 48;
const etz = (e) => e.allDay ? dtz() : e.tz || dtz();
const tagC = (e) => (TAGS[e.tag] || TAGS.pessoal).c;
function occurrences(e, fromMs, toMs) {
  const tz = etz(e), s = wd(e.start), en = wd(e.end), dur = en - s, out = [];
  const push = (w) => {
    const key = ymd(w);
    if ((e.ex || []).includes(key)) return;
    const sMs = fromWall(w, tz), eMs = fromWall(new Date(w.getTime() + dur), tz);
    if (eMs > fromMs && sMs < toMs) out.push({ e, sMs, eMs, key });
  };
  const r = e.rec || { freq: "none" };
  if (!r.freq || r.freq === "none") {
    push(s);
    return out;
  }
  const iv = Math.max(1, +r.interval || 1), until = r.until ? wd(r.until).getTime() : Infinity;
  const base = dayStart(s), tod = s - base;
  let count = 0, n = 0;
  let it = r.count ? base : new Date(Math.max(base.getTime(), dayStart(new Date(fromMs - 4 * 864e5)).getTime()));
  for (let d = it; d.getTime() <= toMs + 2 * 864e5 && n < 6e3; d = addDays(d, 1), n++) {
    if (d < base) continue;
    if (d.getTime() > until) break;
    const dd = Math.round((d - base) / 864e5);
    let ok = false;
    if (r.freq === "daily") ok = dd % iv === 0;
    else if (r.freq === "weekly") {
      const days = r.days?.length ? r.days : [base.getUTCDay()];
      ok = Math.floor((dd + base.getUTCDay()) / 7) % iv === 0 && days.includes(d.getUTCDay());
    } else if (r.freq === "monthly") {
      const md_ = (d.getUTCFullYear() - base.getUTCFullYear()) * 12 + d.getUTCMonth() - base.getUTCMonth();
      ok = md_ % iv === 0 && d.getUTCDate() === Math.min(base.getUTCDate(), dimOf(d));
    } else if (r.freq === "yearly") {
      ok = (d.getUTCFullYear() - base.getUTCFullYear()) % iv === 0 && d.getUTCMonth() === base.getUTCMonth() && d.getUTCDate() === Math.min(base.getUTCDate(), dimOf(d));
    }
    if (!ok) continue;
    count++;
    if (r.count && count > r.count) break;
    push(new Date(d.getTime() + tod));
  }
  return out;
}
function occs(fromW, toW, { exclude } = {}) {
  const f = fromWall(fromW, dtz()), t = fromWall(toW, dtz()), out = [];
  S.events.forEach((e) => {
    if (e.id === exclude) return;
    occurrences(e, f, t).forEach((o) => {
      o.ds = toWall(o.sMs, dtz());
      o.de = toWall(o.eMs, dtz());
      o.allDay = !!e.allDay;
      out.push(o);
    });
  });
  out.push(...birthdayOccs(fromW, toW), ...holidayOccs(fromW, toW));
  out.sort((a, b) => a.sMs - b.sMs || b.eMs - a.eMs);
  const tm = out.filter((o) => !o.allDay);
  for (let i = 0; i < tm.length; i++) for (let j = i + 1; j < tm.length && tm[j].sMs < tm[i].eMs; j++) {
    tm[i].conflict = tm[j].conflict = true;
    (tm[i].with || (tm[i].with = [])).push(tm[j].e.title);
    (tm[j].with || (tm[j].with = [])).push(tm[i].e.title);
  }
  return out;
}
function findConflicts(sMs, eMs, excludeId) {
  const a = toWall(sMs - 864e5, dtz()), b = toWall(eMs + 864e5, dtz());
  return occs(a, b, { exclude: excludeId }).filter((o) => !o.allDay && o.sMs < eMs && o.eMs > sMs);
}
