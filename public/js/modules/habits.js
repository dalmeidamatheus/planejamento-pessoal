"use strict";
const HCOL = ["#2f9e6b", "#3b6fd4", "#d9822b", "#7b61b8", "#c8644f", "#4a9bb0"];
function streak(h) {
  let d = wd(todayStr());
  if (!h.log[ymd(d)]) d = addDays(d, -1);
  let n = 0;
  while (h.log[ymd(d)]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
function bestStreak(h) {
  const ks = Object.keys(h.log).filter((k) => h.log[k]).sort();
  let b = 0, c = 0, p = null;
  ks.forEach((k) => {
    c = p && Math.round((wd(k) - wd(p)) / 864e5) === 1 ? c + 1 : 1;
    p = k;
    b = Math.max(b, c);
  });
  return b;
}
const adh = (h, n = 30) => {
  let c = 0;
  const t = wd(todayStr());
  for (let i = 0; i < n; i++) if (h.log[ymd(addDays(t, -i))]) c++;
  return Math.round(c / n * 100);
};
ACT.habitToggle = (el) => {
  const h = S.habits.find((x) => x.id === el.dataset.id);
  if (!h) return;
  const d = el.dataset.d;
  if (h.log[d]) delete h.log[d];
  else h.log[d] = true;
  save();
  render();
};
VIEWS.habits = () => {
  if (!S.habits.length) return `<div class="card"><div class="empty">Nenhum hábito ainda.<br><br><button class="btn primary" data-act="newHabit">${ic("plus")}Criar hábito</button></div></div>`;
  const t = wd(todayStr()), days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
  const grid = `<div class="hgrid"><div></div>${days.map((d) => `<div class="h">${DSEM[d.getUTCDay()][0]}<br><b>${d.getUTCDate()}</b></div>`).join("")}<div class="h">Sequência</div><div class="h">30 dias</div>` + S.habits.map((h) => `<div class="row" style="cursor:pointer" data-act="editHabit" data-id="${h.id}"><span class="dot" style="--c:${h.color}"></span><span>${esc(h.name)}</span></div>${days.map((d) => `<button class="hc ${h.log[ymd(d)] ? "on" : ""}" style="--c:${h.color}" data-act="habitToggle" data-id="${h.id}" data-d="${ymd(d)}">${h.log[ymd(d)] ? ic("check", 13) : ""}</button>`).join("")}<div class="num"><b>${streak(h)}</b> 🔥</div><div class="num">${adh(h)}%</div>`).join("") + "</div>";
  const bars = Array.from({ length: 30 }, (_, i) => {
    const d = ymd(addDays(t, i - 29));
    const p = S.habits.filter((h) => h.log[d]).length / S.habits.length * 100;
    return { d, p };
  });
  const W = 620, H = 140, bw = W / 30;
  const svg = `<svg class="chartbox" viewBox="0 0 ${W} ${H + 20}">${[0, 50, 100].map((v) => `<line x1="0" x2="${W}" y1="${H - v * H / 100}" y2="${H - v * H / 100}" stroke="#efede7"/>`).join("")}${bars.map((b, i) => `<rect x="${i * bw + 3}" y="${H - b.p * H / 100}" width="${bw - 6}" height="${Math.max(2, b.p * H / 100)}" rx="2" fill="${b.p >= 80 ? "#2f9e6b" : b.p >= 40 ? "#9cc9b3" : "#dcd9d1"}" data-tip="${fmtDay(b.d)}: ${b.p.toFixed(0)}% dos hábitos"/>`).join("")}<text x="0" y="${H + 14}" font-size="10" fill="#97938a">${fmtDay(bars[0].d)}</text><text x="${W}" y="${H + 14}" font-size="10" fill="#97938a" text-anchor="end">hoje</text></svg>`;
  const start = addDays(t, -(7 * 13 - 1)), pre = start.getUTCDay();
  return `<div class="toolbar"><span class="muted">Toque nos quadrados para marcar. Mantenha a sequência!</span><div class="grow"></div><button class="btn primary" data-act="newHabit">${ic("plus")}Hábito</button></div>
  <div class="card" style="margin-bottom:14px;overflow-x:auto">${grid}</div>
  <div class="cols c21"><div class="card"><div class="hd"><h2>Aderência diária (30 dias)</h2></div>${svg}</div>
  <div class="card"><div class="hd"><h2>Consistência (13 semanas)</h2></div>${S.habits.map((h) => `<div style="margin-bottom:12px"><div class="row sm" style="margin-bottom:4px"><span class="dot" style="--c:${h.color}"></span><b class="grow">${esc(h.name)}</b><span class="muted">melhor sequência ${bestStreak(h)}</span></div><div class="heat" style="--c:${h.color}">${'<i style="visibility:hidden"></i>'.repeat(pre)}${Array.from({ length: 91 }, (_, i) => {
    const d = ymd(addDays(start, i));
    return `<i class="${h.log[d] ? "on" : ""}" data-tip="${fmtDay(d)}"></i>`;
  }).join("")}</div></div>`).join("")}</div></div>`;
};
let dHab = null;
ACT.newHabit = () => openHabit();
ACT.editHabit = (el) => openHabit(el.dataset.id);
function openHabit(id) {
  const h = id ? S.habits.find((x) => x.id === id) : { name: "", color: HCOL[S.habits.length % HCOL.length] };
  dHab = id;
  modal(`<form data-form="habit"><h2>${id ? "Editar" : "Novo"} hábito</h2><label class="field"><span>Nome</span><input type="text" name="name" value="${esc(h.name)}" required placeholder="Beber 2L de água, Meditar, Exercício…"></label>
  <label class="field"><span>Cor</span><select name="color">${HCOL.map((c) => `<option value="${c}" style="color:${c}" ${h.color === c ? "selected" : ""}>■ ${c}</option>`).join("")}</select></label>
  <div class="foot">${id ? `<button type="button" class="btn danger" data-act="habDel">Excluir</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
}
SUBMIT.habit = (f, fd) => {
  const o = { name: fd.get("name").trim(), color: fd.get("color") };
  if (dHab) Object.assign(S.habits.find((x) => x.id === dHab), o);
  else S.habits.push({ id: uid(), log: {}, ...o });
  save();
  closeModal();
  render();
};
ACT.habDel = () => {
  if (!confirmDlg("Excluir hábito e histórico?")) return;
  S.habits = S.habits.filter((x) => x.id !== dHab);
  save();
  closeModal();
  render();
};
