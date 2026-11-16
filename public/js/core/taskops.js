"use strict";
/* Regras de dados das tarefas (sem tela) — compartilhadas por desktop e celular.
   t = { id, title, col: todo|doing|done, prio, tag, due, notes, subs:[{id,t,d}], rec, eventId?, pin?, files?:[{id,name,type,size}] }
   Ordem de exibição: dentro de cada coluna, fixadas (pin) primeiro e depois a ordem do array S.tasks.
   Ao CRIAR, a tarefa entra já na posição da sua prioridade (alta > média > baixa); depois a ordem é manual. */
const TaskOps = (() => {
  const RANK = { alta: 0, media: 1, baixa: 2 };
  const rank = (t) => (RANK[t.prio] === undefined ? 1 : RANK[t.prio]);
  const find = (id) => S.tasks.find((x) => x.id === id);

  function insert(t) {
    const i = S.tasks.findIndex((x) => x.col === t.col && !x.pin && rank(x) > rank(t));
    if (t.pin || i < 0) S.tasks.push(t); else S.tasks.splice(i, 0, t);
    return t;
  }
  /** Tarefas de uma coluna na ordem de exibição (fixadas no topo). */
  function colList(col, pred) {
    const L = S.tasks.filter((t) => t.col === col && (!pred || pred(t)));
    return [...L.filter((t) => t.pin), ...L.filter((t) => !t.pin)];
  }
  function spawnNext(t) {
    const r = t.rec;
    if (!r || r.freq === "none") return;
    let nd = nextDate(t.due || todayStr(), r), guard = 0;
    while (nd <= todayStr() && guard++ < 400) nd = nextDate(nd, r);
    if (r.until && nd > r.until) { t.rec = { freq: "none" }; return; }
    const n = { ...clone(t), id: uid(), col: "todo", due: nd, pin: false, subs: (t.subs || []).map((x) => ({ ...x, id: uid(), d: false })) };
    delete n.eventId;
    delete n.nextId;
    const e = t.eventId && S.events.find((x) => x.id === t.eventId);
    if (e) {
      const start = nd + "T" + e.start.slice(11), dur = wd(e.end) - wd(e.start);
      const ne = { ...clone(e), id: uid(), start, end: fmtDT(new Date(wd(start).getTime() + dur)), done: false, taskId: n.id };
      S.events.push(ne);
      n.eventId = ne.id;
    }
    S.tasks.push(n);
    t.rec = { freq: "none" };
    t.nextId = n.id;
    toast("↻ Próxima repetição criada para " + fmtDay(nd) + "/" + nd.slice(2, 4));
  }
  function setCol(id, col, prev) {
    const t = find(id);
    if (!t) return;
    prev = prev ?? t.col;
    t.col = col;
    if (col === "done" && prev !== "done") spawnNext(t);
    if (t.eventId) { const e = S.events.find((x) => x.id === t.eventId); if (e) e.done = col === "done"; }
  }
  const subCount = (t) => ({ n: (t.subs || []).length, d: (t.subs || []).filter((x) => x.d).length });
  function subAuto(t) {
    const { n, d } = subCount(t);
    if (!n) return;
    if (d === n && t.col !== "done") { setCol(t.id, "done"); toast("Todas as subtarefas feitas: tarefa concluída ✓"); }
    else if (d < n && t.col === "done") setCol(t.id, "doing");
    else if (d > 0 && d < n && t.col === "todo") setCol(t.id, "doing");
  }
  /** Move a tarefa para antes/depois de outra (ou para o fim da coluna, se targetId vazio). Ao soltar entre fixadas, fixa; entre as demais, desafixa. */
  function move(id, targetId, after, col) {
    const t = find(id);
    if (!t || id === targetId) return;
    const was = t.col;
    S.tasks.splice(S.tasks.indexOf(t), 1);
    const tg = targetId && find(targetId);
    if (tg) {
      t.pin = !!tg.pin;
      col = tg.col;
      const i = S.tasks.indexOf(tg);
      S.tasks.splice(after ? i + 1 : i, 0, t);
    } else {
      t.pin = false;
      let last = -1;
      S.tasks.forEach((x, i) => { if (x.col === col) last = i; });
      S.tasks.splice(last + 1, 0, t);
    }
    setCol(id, col, was);
  }
  /** Sobe/desce uma posição dentro da coluna (para telas sem arrastar). */
  function nudge(id, dir) {
    const t = find(id);
    if (!t) return;
    const L = colList(t.col).filter((x) => !!x.pin === !!t.pin), i = L.findIndex((x) => x.id === id), tg = L[i + dir];
    if (tg) move(id, tg.id, dir > 0, t.col);
  }
  const togglePin = (id) => { const t = find(id); if (t) t.pin = !t.pin; return t && t.pin; };
  function removeTask(id) {
    const t = find(id);
    if (!t) return;
    if (t.eventId) S.events = S.events.filter((x) => x.id !== t.eventId);
    (t.files || []).forEach((f) => Files.remove(f.id));
    S.tasks = S.tasks.filter((x) => x.id !== id);
  }
  /* Seleção múltipla: chaves "t:<idTarefa>" e "s:<idTarefa>:<idSubtarefa>" */
  const keyT = (id) => "t:" + id, keyS = (tid, sid) => "s:" + tid + ":" + sid;
  function validKeys(keys) {
    return [...keys].filter((k) => { const p = k.split(":"), t = find(p[1]); return t && (p[0] === "t" || (t.subs || []).some((x) => x.id === p[2])); });
  }
  function bulkDone(keys) {
    let n = 0;
    const touched = new Set();
    keys.forEach((k) => { const p = k.split(":"); if (p[0] !== "s") return; const t = find(p[1]), s = t && (t.subs || []).find((x) => x.id === p[2]); if (s && !s.d) { s.d = true; touched.add(t); n++; } });
    keys.forEach((k) => { const p = k.split(":"); if (p[0] !== "t") return; const t = find(p[1]); if (t && t.col !== "done") { (t.subs || []).forEach((x) => (x.d = true)); touched.delete(t); setCol(t.id, "done"); n++; } });
    touched.forEach(subAuto);
    return n;
  }
  function bulkDelete(keys) {
    let n = 0;
    keys.forEach((k) => { const p = k.split(":"); if (p[0] !== "s") return; const t = find(p[1]); if (t && t.subs) { const l = t.subs.length; t.subs = t.subs.filter((x) => x.id !== p[2]); if (t.subs.length < l) n++; } });
    keys.forEach((k) => { const p = k.split(":"); if (p[0] === "t" && find(p[1])) { removeTask(p[1]); n++; } });
    return n;
  }
  return { insert, colList, spawnNext, setCol, subCount, subAuto, move, nudge, togglePin, removeTask, keyT, keyS, validKeys, bulkDone, bulkDelete, rank };
})();
