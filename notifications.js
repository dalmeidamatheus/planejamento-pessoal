"use strict";
function pushNotif(msg, key) {
  if (key) {
    if (S.fired[key]) return;
    S.fired[key] = Date.now();
  }
  S.notifs.unshift({ id: uid(), msg, ts: Date.now(), read: false });
  S.notifs = S.notifs.slice(0, 60);
  toast("🔔 " + msg);
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification("Norte", { body: msg });
  } catch {
  }
  save();
  updateBell();
}
function tick() {
  if (!S || !user) return;
  const now = Date.now(), t = todayWall();
  occs(addDays(dayStart(t), -1), addDays(dayStart(t), 3)).forEach((o) => {
    const e = o.e;
    if (e.remind == null || e.done || e.allDay) return;
    const at = o.sMs - e.remind * 6e4;
    if (now >= at && now < o.sMs + 3e5) pushNotif(`${e.title} — ${e.remind ? "em " + (e.remind >= 60 ? e.remind / 60 + "h" : e.remind + " min") : "agora"} (${hm(o.ds)})`, "ev:" + e.id + o.sMs);
  });
  const ts = todayStr(), lim = ymd(addDays(wd(ts), 2));
  S.tx.forEach((x) => {
    if (x.type === "out" && x.status !== "paid" && x.date >= ts && x.date <= lim) pushNotif(`Vence ${x.date === ts ? "hoje" : fmtDay(x.date)}: ${x.desc} (${brl(x.amount)})`, "tx:" + x.id + x.date);
  });
  Object.keys(S.fired).forEach((k) => {
    if (now - S.fired[k] > 6 * 864e5) delete S.fired[k];
  });
  birthdayTick();
  wishTick();
  renderClocks();
}
const updateBell = () => {
  const n = S.notifs.filter((x) => !x.read).length, b = $("#bellN");
  if (b) {
    b.textContent = n;
    b.classList.toggle("hidden", !n);
  }
};
ACT.notifs = (el, e) => {
  e.stopPropagation();
  if ($("#notifPop")) {
    $("#notifPop").remove();
    return;
  }
  const p = document.createElement("div");
  p.id = "notifPop";
  p.innerHTML = (S.notifs.length ? S.notifs.slice(0, 25).map((n) => `<div class="n ${n.read ? "" : "u"}">${esc(n.msg)}<div class="muted sm">${new Date(n.ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div></div>`).join("") : '<div class="empty">Sem notificações</div>') + `<div class="row" style="padding:6px">${"Notification" in window && Notification.permission === "default" ? '<button class="btn sm" data-act="notifPerm">Ativar alertas do navegador</button>' : ""}<span class="grow"></span><button class="btn sm ghost" data-act="notifClear">Limpar</button></div>`;
  document.body.appendChild(p);
  S.notifs.forEach((n) => n.read = true);
  save();
  updateBell();
};
ACT.notifPerm = async () => {
  try {
    await Notification.requestPermission();
  } catch {
  }
  $("#notifPop")?.remove();
};
ACT.notifClear = () => {
  S.notifs = [];
  save();
  $("#notifPop")?.remove();
  updateBell();
};
