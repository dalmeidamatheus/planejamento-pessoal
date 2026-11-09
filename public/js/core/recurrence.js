"use strict";
const REC_PRESETS = [["none", "Não repete"], ["daily", "Diariamente"], ["weekly", "Semanalmente"], ["monthly", "Mensalmente"], ["yearly", "Anualmente"], ["custom", "Personalizado…"]];
const REC_UNITS = [["daily", "dia(s)"], ["weekly", "semana(s)"], ["monthly", "mês(es)"], ["yearly", "ano(s)"]];
function recLabel(r) {
  if (!r || r.freq === "none") return "";
  const iv = r.interval || 1, names = r.days && r.days.length ? " (" + r.days.map((d) => DSEM[d]).join(", ") + ")" : "";
  if (r.freq === "daily") return iv === 1 ? "Todo dia" : `A cada ${iv} dias`;
  if (r.freq === "weekly") return (iv === 1 ? "Toda semana" : `A cada ${iv} semanas`) + names;
  if (r.freq === "monthly") return iv === 1 ? "Todo mês" : `A cada ${iv} meses`;
  return iv === 1 ? "Todo ano" : `A cada ${iv} anos`;
}
const REC_UNIT_TEXT = { daily: "dia(s)", weekly: "semana(s)", monthly: "mês(es)", yearly: "ano(s)" };
function recSummary(r, until) {
  if (!r || r.freq === "none") return "Não repete";
  return "↻ " + recLabel(r) + (until ? " · até " + fmtDay(until) + "/" + until.slice(0, 4) : "");
}
function recFields(r) {
  r = r || { freq: "none" };
  const p = r.freq || "none", on = p !== "none", unit = on ? p : "daily";
  return `<div class="repeat">
   <div class="repeat-row">
    <label class="field"><span>Repetir</span><select name="rec_p" data-ch="recPreset">${REC_PRESETS.map(([k, n]) => `<option value="${k}" ${p === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="field rec-iv ${on ? "" : "hidden"}"><span>A cada</span><div class="iv-wrap"><input type="number" name="rec_n" min="1" max="999" value="${r.interval || 1}" data-in="recUpd"><span class="iv-unit">${REC_UNIT_TEXT[unit]}</span></div></label>
    <label class="field rec-until ${on ? "" : "hidden"}"><span>Até (opcional)</span><input type="date" name="rec_until" value="${esc(r.until || "")}" data-in="recUpd"></label>
   </div>
   <label class="field rec-unit hidden"><span>Unidade do intervalo</span><select name="rec_u" data-ch="recUnit">${REC_UNITS.map(([k, n]) => `<option value="${k}" ${unit === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
   <div class="field rec-wk ${p === "weekly" ? "" : "hidden"}"><span>Nos dias da semana</span><div class="wdays">${DSEM.map((n, i) => `<label class="wd"><input type="checkbox" name="rec_wd" value="${i}" data-ch="recUpd" ${(r.days || []).includes(i) ? "checked" : ""}><span>${n}</span></label>`).join("")}</div><small class="muted">Deixe sem marcar para repetir no mesmo dia da semana do início. Para quinzenal, use “A cada 2”.</small></div>
   <p class="rec-sum">${recSummary(r, r.until)}</p></div>`;
}
function recFromForm(fd) {
  const p = fd.get("rec_p") || "none", until = fd.get("rec_until") || "";
  if (p === "none") return { freq: "none" };
  const freq = p === "custom" ? fd.get("rec_u") || "daily" : p;
  return { freq, interval: Math.max(1, +fd.get("rec_n") || 1), days: freq === "weekly" ? fd.getAll("rec_wd").map(Number) : [], until };
}
const recSync = (el) => {
  const box = el.closest(".repeat"), p = $("[name=rec_p]", box).value, unit = p === "custom" ? $("[name=rec_u]", box).value : p;
  $(".rec-iv", box).classList.toggle("hidden", p === "none");
  $(".rec-until", box).classList.toggle("hidden", p === "none");
  $(".rec-unit", box).classList.toggle("hidden", p !== "custom");
  $(".rec-wk", box).classList.toggle("hidden", unit !== "weekly");
  $(".iv-unit", box).textContent = REC_UNIT_TEXT[unit] || "";
  const fd = new FormData(el.closest("form"));
  $(".rec-sum", box).textContent = recSummary(recFromForm(fd), fd.get("rec_until"));
};
INP.recPreset = recSync;
INP.recUnit = recSync;
INP.recUpd = recSync;
function nextDate(baseStr, r) {
  const base = wd(baseStr), iv = Math.max(1, +r.interval || 1), dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  if (r.freq === "daily") return ymd(addDays(base, iv));
  if (r.freq === "weekly") {
    const days = r.days && r.days.length ? [...r.days].sort((a, b) => a - b) : null, dow = base.getUTCDay();
    if (!days) return ymd(addDays(base, 7 * iv));
    if (iv === 1) {
      let k = 1;
      while (!days.includes(addDays(base, k).getUTCDay())) k++;
      return ymd(addDays(base, k));
    }
    const later = days.find((x) => x > dow);
    return ymd(addDays(base, later !== void 0 ? later - dow : 7 * iv - dow + days[0]));
  }
  if (r.freq === "monthly") {
    const y = base.getUTCFullYear(), m = base.getUTCMonth() + iv;
    return ymd(new Date(Date.UTC(y, m, Math.min(base.getUTCDate(), dim(y, m)))));
  }
  const y = base.getUTCFullYear() + iv, m = base.getUTCMonth();
  return ymd(new Date(Date.UTC(y, m, Math.min(base.getUTCDate(), dim(y, m)))));
}
