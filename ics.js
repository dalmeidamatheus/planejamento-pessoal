"use strict";
(function() {
  const esc2 = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const day = (s) => s.slice(0, 10).replace(/-/g, "");
  const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  function rrule(r) {
    if (!r || r.freq === "none") return null;
    const p = ["FREQ=" + { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY", yearly: "YEARLY" }[r.freq]];
    if ((r.interval || 1) > 1) p.push("INTERVAL=" + r.interval);
    if (r.freq === "weekly" && r.days?.length) p.push("BYDAY=" + r.days.map((d) => BYDAY[d]).join(","));
    if (r.until) p.push("UNTIL=" + day(r.until) + "T235959Z");
    return p.join(";");
  }
  function toIcs(events) {
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Norte//PT-BR//", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Norte"];
    events.forEach((e) => {
      L.push("BEGIN:VEVENT", "UID:" + e.id + "@norte", "DTSTAMP:" + stamp(Date.now()), "SUMMARY:" + esc2(e.title));
      if (e.allDay) {
        L.push("DTSTART;VALUE=DATE:" + day(e.start), "DTEND;VALUE=DATE:" + day(e.end));
      } else {
        const tz = etz(e);
        L.push("DTSTART:" + stamp(fromWall(wd(e.start), tz)), "DTEND:" + stamp(fromWall(wd(e.end), tz)));
      }
      const rr = rrule(e.rec);
      if (rr) L.push("RRULE:" + rr);
      if (e.ex?.length && !e.allDay) {
        const tz = etz(e), t = e.start.slice(11, 16);
        e.ex.forEach((k) => L.push("EXDATE:" + stamp(fromWall(wd(k + "T" + t), tz))));
      }
      const d = [e.notes, ...(e.subtasks || []).map((s) => (s.d ? "[x] " : "[ ] ") + s.t), ...(e.links || []).map((l) => l.url)].filter(Boolean).join("\n");
      if (d) L.push("DESCRIPTION:" + esc2(d));
      L.push("CATEGORIES:" + esc2((TAGS[e.tag] || {}).n || "Pessoal"), "PRIORITY:" + ({ alta: 1, media: 5, baixa: 9 }[e.prio] || 5));
      if (e.remind != null) L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc2(e.title), "TRIGGER:-PT" + e.remind + "M", "END:VALARM");
      L.push("END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.join("\r\n");
  }
  window.toIcs = toIcs;
  ACT.exportIcs = () => {
    const all = [...S.events, ...birthdayIcsEvents()];
    if (!all.length) {
      toast("Nenhum compromisso para exportar", true);
      return;
    }
    downloadFile("norte-agenda-" + todayStr() + ".ics", toIcs(all), "text/calendar;charset=utf-8");
    toast(all.length + " itens exportados (compromissos e aniversários)");
  };
})();
