"use strict";
let drag = null;
document.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || $("#overlay .scrim")) return;
  const el = e.target.closest("[data-occ]");
  if (!el) return;
  const [id, key] = el.dataset.occ.split("|");
  drag = { el, id, key, sms: +el.dataset.sms, x0: e.clientX, y0: e.clientY, rz: !!e.target.closest("[data-rz]"), moved: false, grid: el.classList.contains("ev"), h0: el.offsetHeight, dMin: 0, target: null };
});
document.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    drag.el.classList.add("dragging");
    document.body.classList.add("dnd");
  }
  const step = HH / 60 * 15;
  if (drag.rz) {
    drag.dMin = Math.round(dy / step) * 15;
    drag.el.style.height = Math.max(18, drag.h0 + drag.dMin * HH / 60) + "px";
    return;
  }
  drag.dMin = drag.grid ? Math.round(dy / step) * 15 : 0;
  drag.el.style.pointerEvents = "none";
  drag.el.style.transform = `translate(${dx}px,${drag.dMin * HH / 60}px)`;
  const t = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-date]");
  $$(".drop").forEach((x) => x.classList.remove("drop"));
  t?.classList.add("drop");
  drag.target = t ? t.dataset.date : null;
});
document.addEventListener("pointerup", () => {
  if (!drag) return;
  const d = drag;
  drag = null;
  document.body.classList.remove("dnd");
  $$(".drop").forEach((x) => x.classList.remove("drop"));
  if (!d.moved) {
    openEvent(d.id, d.key);
    return;
  }
  justDragged = true;
  setTimeout(() => justDragged = false, 80);
  commitDrag(d);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drag) {
    const d = drag;
    drag = null;
    d.el.style.transform = "";
    d.el.style.pointerEvents = "";
    d.el.classList.remove("dragging");
    document.body.classList.remove("dnd");
    $$(".drop").forEach((x) => x.classList.remove("drop"));
    justDragged = true;
    setTimeout(() => justDragged = false, 80);
    render();
  }
});
const shiftWall = (str, tz, ms) => fmtDT(toWall(fromWall(wd(str), tz) + ms, tz));
function commitDrag(d) {
  const e = S.events.find((x) => x.id === d.id);
  if (!e) {
    render();
    return;
  }
  const tz = etz(e), ds = toWall(d.sms, dtz());
  if (d.rz) {
    const ns = wd(e.start), ne = new Date(wd(e.end).getTime() + d.dMin * 6e4);
    if (ne - ns < 15 * 6e4) {
      render();
      return;
    }
    e.end = fmtDT(ne);
    afterMove(e, d.sms);
    return;
  }
  const dayDelta = d.target ? Math.round((wd(d.target) - dayStart(ds)) / 864e5) : 0;
  if (!dayDelta && !d.dMin) {
    render();
    return;
  }
  const newMs = fromWall(new Date(ds.getTime() + dayDelta * 864e5 + d.dMin * 6e4), dtz()), delta = newMs - d.sms;
  if (e.rec && e.rec.freq !== "none") {
    const only = confirm("Evento recorrente.\n\nOK = mover somente esta ocorrência\nCancelar = mover toda a série");
    if (only) {
      e.ex = [...e.ex || [], d.key];
      const dur = fromWall(wd(e.end), tz) - fromWall(wd(e.start), tz);
      const n = Object.assign(clone(e), { id: uid(), rec: { freq: "none" }, ex: [], start: fmtDT(toWall(d.sms + delta, tz)), end: fmtDT(toWall(d.sms + delta + dur, tz)) });
      S.events.push(n);
      afterMove(n, newMs);
      return;
    }
    if (e.rec.freq === "weekly" && e.rec.days?.length && dayDelta) e.rec.days = e.rec.days.map((x) => ((x + dayDelta) % 7 + 7) % 7);
  }
  e.start = shiftWall(e.start, tz, delta);
  e.end = shiftWall(e.end, tz, delta);
  afterMove(e, newMs);
}
function afterMove(e, ms) {
  save();
  render();
  const o = occurrences(e, ms - 1, ms + 1)[0];
  if (o && !e.allDay) {
    const c = findConflicts(o.sMs, o.eMs, e.id);
    if (c.length) toast("⚠ Conflito de horário com: " + c.map((x) => x.e.title).join(", "), true);
  }
}
