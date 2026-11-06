"use strict";
document.addEventListener("keydown", (e) => {
  if (!user || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t.closest?.("input,textarea,select,[contenteditable]") || $("#overlay .scrim")) return;
  const k = e.key.toLowerCase();
  if (k === "?") {
    modal(`<h2>Atalhos de teclado</h2><table class="tb"><tbody>${[["Ctrl + K", "Buscar / criar por texto"], ["Alt + 1…8", "Ir para cada aba"], ["N", "Novo (compromisso, transação, tarefa ou nota conforme a aba)"], ["T", "Calendário: hoje"], ["← →", "Calendário: período anterior / próximo"], ["M  S  D  A", "Calendário: mês, semana, dia, agenda"], ["Esc", "Fechar / cancelar arrasto"]].map(([a, b]) => `<tr><td><kbd>${a}</kbd></td><td>${b}</td></tr>`).join("")}</tbody></table><div class="foot"><button class="btn" data-act="close">Fechar</button></div>`);
    return;
  }
  if (k === "n") {
    e.preventDefault();
    ({ calendar: () => ACT.newEvent(), finance: () => ACT.newTx(), tasks: () => ACT.newTask(), habits: () => ACT.newHabit(), notes: () => ACT.newNote(), wishlist: () => ACT.newWish(), trips: () => ACT.newTrip(), home: () => openPalette() }[view] || (() => {
    }))();
    return;
  }
  if (view !== "calendar") return;
  if (k === "t") ACT.calToday();
  else if (e.key === "ArrowLeft") ACT.calPrev();
  else if (e.key === "ArrowRight") ACT.calNext();
  else if ({ m: "month", s: "week", d: "day", a: "agenda" }[k]) {
    ui.cal.mode = { m: "month", s: "week", d: "day", a: "agenda" }[k];
    render();
  }
});
