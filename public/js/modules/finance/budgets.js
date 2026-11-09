"use strict";
function finBud() {
  const ym = ui.fin.ym, L = monthTx(ym).filter((t) => t.type === "out"), sp = (c) => L.filter((t) => t.cat === c).reduce((s, t) => s + t.amount, 0);
  const B = S.budgets.length ? S.budgets.map((b) => {
    const s = sp(b.cat), p = s / b.limit * 100;
    return `<div class="it" data-act="editBudget" data-id="${b.id}" style="display:block"><div class="row" style="margin-bottom:6px"><span class="dot" style="--c:${catColor(b.cat)}"></span><b class="grow">${esc(b.cat)}</b><span class="${p >= 100 ? "neg" : ""}">${brl(s)}</span><span class="muted">/ ${brl(b.limit)}</span><span class="pill ${p >= 100 ? "bad" : p >= 80 ? "warn" : "ok"}">${p.toFixed(0)}%</span></div><div class="bar-t ${p >= 100 ? "r" : p >= 80 ? "w" : ""}"><i style="width:${Math.min(100, p)}%"></i></div>${p >= 100 ? `<div class="sm neg" style="margin-top:4px">Teto estourado em ${brl(s - b.limit)}</div>` : p >= 80 ? `<div class="sm" style="margin-top:4px;color:var(--warn)">Atenção: restam ${brl(b.limit - s)}</div>` : ""}</div>`;
  }).join("") : '<div class="empty">Defina tetos de gasto por categoria.</div>';
  const year = ym.slice(0, 4);
  const G = S.goals.length ? S.goals.map((g) => {
    let saved = g.saved || 0, target = g.target;
    if (g.kind === "mensal") {
      const T = totals(ym);
      saved = Math.max(0, T.inP - T.outP);
    }
    if (g.kind === "anual") {
      saved = 0;
      for (let m = 1; m <= 12; m++) {
        const T = totals(year + "-" + pad(m));
        saved += T.inP - T.outP;
      }
      saved = Math.max(0, saved);
    }
    const p = Math.min(100, saved / target * 100);
    return `<div class="it" data-act="editGoal" data-id="${g.id}" style="display:block"><div class="row" style="margin-bottom:6px"><span>${ic("target", 15)}</span><b class="grow">${esc(g.name)}</b><span class="pill">${{ mensal: "Economia mensal", anual: "Economia anual", obj: "Objetivo" }[g.kind]}</span></div>
     <div class="row sm" style="margin-bottom:4px"><span>${brl(saved)} de ${brl(target)}</span><span class="grow"></span><b>${p.toFixed(0)}%</b></div><div class="bar-t"><i style="width:${p}%"></i></div>${g.deadline ? `<div class="sm muted" style="margin-top:4px">Prazo: ${fmtDay(g.deadline)}/${g.deadline.slice(0, 4)}</div>` : ""}</div>`;
  }).join("") : '<div class="empty">Crie metas de economia.</div>';
  return `<div class="cols c2"><div class="card"><div class="hd"><h2>Orçamentos do mês</h2></div><div class="list">${B}</div></div><div class="card"><div class="hd"><h2>Metas</h2></div><div class="list">${G}</div></div></div>`;
}
let dBud = null, dGoal = null;
ACT.newBudget = () => openBudget();
ACT.editBudget = (el) => openBudget(el.dataset.id);
function openBudget(id) {
  const b = id ? S.budgets.find((x) => x.id === id) : { cat: CATS_OUT[0], limit: "" };
  dBud = id;
  modal(`<form data-form="budget"><h2>${id ? "Editar" : "Novo"} orçamento</h2><label class="field"><span>Categoria</span><select name="cat">${CATS_OUT.map((c) => `<option ${b.cat === c ? "selected" : ""}>${c}</option>`).join("")}</select></label><label class="field"><span>Teto mensal (R$)</span><input type="number" step="0.01" min="1" name="limit" value="${b.limit}" required></label>
  <div class="muted sm">A barra fica amarela em 80% e vermelha em 100% do teto.</div><div class="foot">${id ? `<button type="button" class="btn danger" data-act="budDel">Excluir</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
}
SUBMIT.budget = (f, fd) => {
  const o = { cat: fd.get("cat"), limit: +fd.get("limit") };
  if (dBud) Object.assign(S.budgets.find((x) => x.id === dBud), o);
  else {
    if (S.budgets.some((b) => b.cat === o.cat)) {
      toast("Já existe orçamento para esta categoria", true);
      return;
    }
    S.budgets.push({ id: uid(), ...o });
  }
  save();
  closeModal();
  render();
};
ACT.budDel = () => {
  S.budgets = S.budgets.filter((x) => x.id !== dBud);
  save();
  closeModal();
  render();
};
ACT.newGoal = () => openGoal();
ACT.editGoal = (el) => openGoal(el.dataset.id);
function openGoal(id) {
  const g = id ? S.goals.find((x) => x.id === id) : { name: "", kind: "mensal", target: "", saved: 0, deadline: "" };
  dGoal = id;
  modal(`<form data-form="goal"><h2>${id ? "Editar" : "Nova"} meta</h2><label class="field"><span>Nome</span><input type="text" name="name" value="${esc(g.name)}" required placeholder="Reserva de emergência, Viagem…"></label>
  <div class="grid2"><label class="field"><span>Tipo</span><select name="kind"><option value="mensal" ${g.kind === "mensal" ? "selected" : ""}>Economia mensal</option><option value="anual" ${g.kind === "anual" ? "selected" : ""}>Economia anual</option><option value="obj" ${g.kind === "obj" ? "selected" : ""}>Objetivo</option></select></label><label class="field"><span>Valor alvo (R$)</span><input type="number" step="0.01" min="1" name="target" value="${g.target}" required></label></div>
  <div class="grid2"><label class="field"><span>Já guardado (objetivo)</span><input type="number" step="0.01" name="saved" value="${g.saved || 0}"></label><label class="field"><span>Prazo (opcional)</span><input type="date" name="deadline" value="${g.deadline || ""}"></label></div>
  <div class="muted sm">Economia mensal e anual são calculadas sozinhas pelas suas transações; Objetivo você atualiza em “Já guardado”.</div>
  <div class="foot">${id ? `<button type="button" class="btn danger" data-act="goalDel">Excluir</button>` : ""}<span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
}
SUBMIT.goal = (f, fd) => {
  const o = { name: fd.get("name").trim(), kind: fd.get("kind"), target: +fd.get("target"), saved: +fd.get("saved") || 0, deadline: fd.get("deadline") };
  if (dGoal) Object.assign(S.goals.find((x) => x.id === dGoal), o);
  else S.goals.push({ id: uid(), ...o });
  save();
  closeModal();
  render();
};
ACT.goalDel = () => {
  S.goals = S.goals.filter((x) => x.id !== dGoal);
  save();
  closeModal();
  render();
};
