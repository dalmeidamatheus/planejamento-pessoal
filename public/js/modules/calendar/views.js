"use strict";
ui.cal.f = { tags: [], prio: "", q: "", hideDone: false, bd: "" };
function occsF(a, b) {
  const f = ui.cal.f, q = norm(f.q);
  return occs(a, b).filter((o) => (f.bd === "hide" ? !o.e.birthday : f.bd === "only" ? o.e.birthday : true)).filter((o) => (!f.tags.length || f.tags.includes(o.e.tag)) && (!f.prio || o.e.prio === f.prio) && (!f.hideDone || !o.e.done) && (!q || norm(o.e.title + " " + (o.e.notes || "")).includes(q)));
}
function calFilters() {
  const f = ui.cal.f, any = f.tags.length || f.prio || f.q || f.hideDone || f.bd;
  return `<div class="toolbar" style="margin-top:-4px">${Object.entries(TAGS).map(([k, v]) => `<button class="fchip ${f.tags.includes(k) ? "on" : ""}" style="--c:${v.c}" data-act="calTag" data-t="${k}"><span class="dot" style="--c:${v.c}"></span>${v.n}</button>`).join("")}
   <select style="width:170px" data-ch="calPrio"><option value="">Toda prioridade</option>${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${f.prio === k ? "selected" : ""}>${v.n}</option>`).join("")}</select>
   <select style="width:240px" data-ch="calBd">${[["", "🎂 Aniversários: mostrar"], ["only", "🎂 Só aniversários"], ["hide", "🎂 Ocultar aniversários"]].map(([k, n]) => `<option value="${k}" ${f.bd === k ? "selected" : ""}>${n}</option>`).join("")}</select>
   <input type="text" style="width:190px" placeholder="Buscar compromissos…" value="${esc(f.q)}" data-in="calQ">
   <label class="row sm"><input type="checkbox" data-ch="calHol" ${S.settings.showHolidays !== false ? "checked" : ""}> Feriados</label>
   <label class="row sm"><input type="checkbox" data-ch="calDone" ${f.hideDone ? "checked" : ""}> Ocultar concluídos</label>${any ? `<button class="btn sm ghost" data-act="calClear">Limpar filtros</button>` : ""}</div>`;
}
ACT.calTag = (el) => {
  const t = ui.cal.f.tags, k = el.dataset.t;
  ui.cal.f.tags = t.includes(k) ? t.filter((x) => x !== k) : [...t, k];
  render();
};
INP.calPrio = (el) => {
  ui.cal.f.prio = el.value;
  render();
};
INP.calBd = (el) => {
  ui.cal.f.bd = el.value;
  render();
};
INP.calDone = (el) => {
  ui.cal.f.hideDone = el.checked;
  render();
};
INP.calQ = (el) => {
  ui.cal.f.q = el.value;
  renderKeep(el);
};
ACT.calClear = () => {
  ui.cal.f = { tags: [], prio: "", q: "", hideDone: false, bd: "" };
  render();
};
ui.cal.d = null;
function calRange() {
  const d = dayStart(ui.cal.d), m = ui.cal.mode;
  if (m === "month") {
    const f = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)), s = addDays(f, -f.getUTCDay());
    return [s, addDays(s, 42)];
  }
  if (m === "week") {
    const s = addDays(d, -d.getUTCDay());
    return [s, addDays(s, 7)];
  }
  if (m === "day") return [d, addDays(d, 1)];
  return [d, addDays(d, 60)];
}
function calTitle() {
  const d = ui.cal.d, [s, e] = calRange();
  if (ui.cal.mode === "month") return MES[d.getUTCMonth()] + " " + d.getUTCFullYear();
  if (ui.cal.mode === "day") return DSEML[d.getUTCDay()] + ", " + d.getUTCDate() + " de " + MES[d.getUTCMonth()];
  const l = addDays(e, -1);
  return `${s.getUTCDate()} ${MES[s.getUTCMonth()].slice(0, 3)} – ${l.getUTCDate()} ${MES[l.getUTCMonth()].slice(0, 3)} ${l.getUTCFullYear()}`;
}
const chipH = (o) => `<div class="chip ${o.conflict ? "conf" : ""} ${o.e.done ? "done" : ""}" data-occ="${o.e.id}|${o.key}" data-sms="${o.sMs}" style="--c:${tagC(o.e)}" data-tip="${esc(o.e.title)}${o.allDay ? "" : "<br>" + hm(o.ds) + "–" + hm(o.de)}${o.conflict ? "<br>⇄ Ao mesmo tempo que: " + esc((o.with || []).join(", ")) : ""}">${o.allDay ? "" : hm(o.ds) + " "}${esc(o.e.title)}</div>`;
VIEWS.calendar = () => {
  if (!ui.cal.d) ui.cal.d = dayStart(todayWall());
  const m = ui.cal.mode;
  const tb = `<div class="toolbar">${m === "list" ? `<div class="cal-title" style="text-transform:none">Todos os compromissos</div>` : `<button class="btn" data-act="calToday">Hoje</button><button class="icon-btn" data-act="calPrev">${ic("left")}</button><button class="icon-btn" data-act="calNext">${ic("right")}</button><div class="cal-title">${calTitle()}</div>`}<div class="grow"></div>
   <div class="seg">${[["month", "Mês"], ["week", "Semana"], ["day", "Dia"], ["agenda", "Agenda"], ["list", "Lista"]].map(([k, n]) => `<button class="${m === k ? "on" : ""}" data-act="calMode" data-m="${k}">${n}</button>`).join("")}</div>
   <button class="btn" data-act="birthdays">🎂 Aniversários</button><button class="btn primary" data-act="newEvent">${ic("plus")}Evento</button></div>`;
  const [rs, re] = calRange();
  let body = "";
  if (m === "month") {
    const os = occsF(rs, re), cm = ui.cal.d.getUTCMonth(), ts = todayStr();
    body = `<div class="cal"><div class="mgrid">${DSEM.map((x) => `<div class="dn">${x}</div>`).join("")}`;
    for (let i = 0; i < 42; i++) {
      const d = addDays(rs, i), k = ymd(d), L = os.filter((o) => o.ds < addDays(d, 1) && o.de > d);
      body += `<div class="mcell ${d.getUTCMonth() !== cm ? "dim" : ""} ${k === ts ? "today" : ""}" data-date="${k}" data-act="newDay"><div class="dd">${d.getUTCDate()}</div>${L.slice(0, 3).map(chipH).join("")}${L.length > 3 ? `<div class="more" data-act="goDay" data-date="${k}">+${L.length - 3} mais</div>` : ""}</div>`;
    }
    body += "</div></div>";
  } else if (m === "week" || m === "day") {
    const days = [];
    for (let d = rs; d < re; d = addDays(d, 1)) days.push(d);
    body = timeGrid(days);
  } else if (m === "list") body = calList();
  else body = agenda(rs);
  return tb + calFilters() + body;
};
function timeGrid(days) {
  const os = occsF(days[0], addDays(days[days.length - 1], 1)), ts = todayStr(), n = days.length, now = todayWall();
  let h = `<div class="cal"><div class="tg-head" style="--n:${n}"><div></div>${days.map((d) => `<div class="hd ${ymd(d) === ts ? "today" : ""}"><span>${DSEM[d.getUTCDay()]}</span><b>${d.getUTCDate()}</b></div>`).join("")}</div>
  <div class="tg-ad" style="--n:${n}"><div class="gut">dia todo</div>${days.map((d) => `<div class="adc" data-date="${ymd(d)}">${os.filter((o) => o.allDay && o.ds < addDays(d, 1) && o.de > d).map(chipH).join("")}</div>`).join("")}</div>
  <div class="tg-scroll"><div class="tg-body" style="--n:${n}"><div class="gutc">${Array.from({ length: 23 }, (_, i) => `<div class="hr" style="top:${(i + 1) * HH}px">${pad(i + 1)}:00</div>`).join("")}</div>`;
  days.forEach((d) => {
    const ds = d, de = addDays(d, 1);
    let items = os.filter((o) => !o.allDay && o.ds < de && o.de > ds).map((o) => ({ o, s: Math.max(0, (o.ds - ds) / 6e4), e: Math.min(1440, (o.de - ds) / 6e4) }));
    items.sort((a, b) => a.s - b.s || b.e - a.e);
    let cols = [], cl = [], cend = 0;
    const flush = () => {
      cl.forEach((x) => x.n = cols.length);
      cols = [];
      cl = [];
    };
    items.forEach((it) => {
      if (cl.length && it.s >= cend) {
        flush();
        cend = 0;
      }
      let c = cols.findIndex((en) => en <= it.s);
      if (c < 0) {
        c = cols.length;
        cols.push(it.e);
      } else cols[c] = it.e;
      it.c = c;
      cl.push(it);
      cend = Math.max(cend, it.e);
    });
    flush();
    h += `<div class="dcol" data-date="${ymd(d)}" data-act="newSlot">` + items.map(({ o, s, e, c, n: n2 }) => {
      const top = s * HH / 60, ht = Math.max(18, (e - s) * HH / 60 - 1);
      return `<div class="ev ${o.conflict ? "conf" : ""} ${o.e.done ? "done" : ""}" data-occ="${o.e.id}|${o.key}" data-sms="${o.sMs}" style="--c:${tagC(o.e)};top:${top}px;height:${ht}px;left:calc(${c / n2 * 100}% + 1px);width:calc(${100 / n2}% - 3px)" data-tip="${o.conflict ? "⇄ Ao mesmo tempo que: " + esc(o.with.join(", ")) : ""}"><div class="t">${o.e.rec && o.e.rec.freq !== "none" ? "↻ " : ""}${esc(o.e.title)}</div><div class="s">${hm(o.ds)}–${hm(o.de)}${o.conflict ? " ⇄" : ""}</div><div class="rz" data-rz></div></div>`;
    }).join("");
    if (ymd(d) === ts) h += `<div class="now" style="top:${(now.getUTCHours() * 60 + now.getUTCMinutes()) * HH / 60}px"></div>`;
    h += "</div>";
  });
  return h + "</div></div></div>";
}
function agenda(rs) {
  const os = occsF(rs, addDays(rs, 60));
  if (!os.length) return `<div class="cal"><div class="empty">Nada agendado nos próximos 60 dias.</div></div>`;
  const by = {};
  os.forEach((o) => {
    for (let d = dayStart(o.ds); d < o.de && d < addDays(rs, 60); d = addDays(d, 1)) {
      if (d < rs) continue;
      (by[ymd(d)] || (by[ymd(d)] = [])).push(o);
      if (o.allDay && addDays(d, 1) >= o.de) break;
      if (!o.allDay) break;
    }
  });
  return `<div class="cal">` + Object.keys(by).sort().map((k) => {
    const d = wd(k);
    return `<div class="ag-day"><div class="dl">${d.getUTCDate()} ${MES[d.getUTCMonth()].slice(0, 3)}<small>${DSEML[d.getUTCDay()]}</small></div><div class="grow">` + by[k].map((o) => `<div class="ag-it" data-act="openOcc" data-id="${o.e.id}" data-key="${o.key}"><span class="dot" style="--c:${tagC(o.e)}"></span><span class="tm">${o.allDay ? "Dia todo" : hm(o.ds) + " – " + hm(o.de)}</span><span class="${o.e.done ? "muted" : ""}" style="${o.e.done ? "text-decoration:line-through" : ""}">${esc(o.e.title)}</span>${o.e.rec && o.e.rec.freq !== "none" ? ic("repeat", 13) : ""}${o.e.prio === "alta" ? '<span class="pill bad">Alta</span>' : ""}${o.conflict ? '<span class="pill info">⇄ ao mesmo tempo</span>' : ""}<span class="grow"></span><span class="muted sm">${TAGS[o.e.tag]?.n || ""}</span></div>`).join("") + "</div></div>";
  }).join("") + "</div>";
}
AFTER.calendar = (sc) => {
  const s = $(".tg-scroll");
  if (s) s.scrollTop = sc ?? Math.max(0, (todayWall().getUTCHours() - 1) * HH);
};
ACT.calToday = () => {
  ui.cal.d = dayStart(todayWall());
  render();
};
ACT.calMode = (el) => {
  ui.cal.mode = el.dataset.m;
  render();
};
function calShift(k) {
  const d = ui.cal.d, m = ui.cal.mode;
  if (m === "month") ui.cal.d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1));
  else ui.cal.d = addDays(d, k * (m === "week" ? 7 : m === "day" ? 1 : 30));
  render();
}
ACT.calPrev = () => calShift(-1);
ACT.calNext = () => calShift(1);
ACT.goDay = (el, e) => {
  e.stopPropagation();
  ui.cal.d = wd(el.dataset.date);
  ui.cal.mode = "day";
  render();
};
ACT.newEvent = () => {
  const t = todayWall();
  const h = Math.min(22, t.getUTCHours() + 1);
  openEvent(null, null, { start: ymd(ui.cal.d || t) + "T" + pad(h) + ":00", end: ymd(ui.cal.d || t) + "T" + pad(h + 1) + ":00" });
};
ACT.newDay = (el, e) => {
  if (justDragged || e.target.closest("[data-occ],[data-act=goDay]")) return;
  openEvent(null, null, { start: el.dataset.date + "T09:00", end: el.dataset.date + "T10:00" });
};
ACT.newSlot = (el, e) => {
  if (justDragged || e.target.closest("[data-occ]")) return;
  const r = el.getBoundingClientRect(), mins = Math.floor((e.clientY - r.top) / (HH / 60) / 30) * 30;
  openEvent(null, null, { start: el.dataset.date + "T" + pad(Math.floor(mins / 60)) + ":" + pad(mins % 60), end: fmtDT(new Date(wd(el.dataset.date).getTime() + (mins + 60) * 6e4)) });
};
ACT.openOcc = (el) => openEvent(el.dataset.id, el.dataset.key);
