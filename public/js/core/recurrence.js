"use strict";
const REC_PRESETS = [["none", "Não repete"], ["d1", "Todo dia"], ["wd", "Dias úteis (seg a sex)"], ["w1", "Toda semana"], ["d15", "A cada 15 dias"], ["m1", "Todo mês"], ["y1", "Todo ano"], ["custom", "Personalizado…"]];
const REC_DEF = {
  d1: { freq: "daily", interval: 1, days: [] },
  wd: { freq: "weekly", interval: 1, days: [1, 2, 3, 4, 5] },
  w1: { freq: "weekly", interval: 1, days: [] },
  d15: { freq: "daily", interval: 15, days: [] },
  m1: { freq: "monthly", interval: 1, days: [] },
  y1: { freq: "yearly", interval: 1, days: [] }
};
function recToPreset(r) {
  if (!r || r.freq === "none") return "none";
  const iv = r.interval || 1, days = [...r.days || []].sort().join(",");
  if (r.freq === "daily" && iv === 1) return "d1";
  if (r.freq === "daily" && iv === 15) return "d15";
  if (r.freq === "weekly" && iv === 1 && days === "1,2,3,4,5") return "wd";
  if (r.freq === "weekly" && iv === 1 && !days) return "w1";
  if (r.freq === "monthly" && iv === 1) return "m1";
  if (r.freq === "yearly" && iv === 1) return "y1";
  return "custom";
}
function recLabel(r) {
  if (!r || r.freq === "none") return "";
  const iv = r.interval || 1, names = r.days && r.days.length ? " (" + r.days.map((d) => DSEM[d]).join(", ") + ")" : "";
  if (r.freq === "daily") return iv === 1 ? "Todo dia" : `A cada ${iv} dias`;
  if (r.freq === "weekly") return (iv === 1 ? "Toda semana" : `A cada ${iv} semanas`) + names;
  if (r.freq === "monthly") return iv === 1 ? "Todo mês" : `A cada ${iv} meses`;
  return iv === 1 ? "Todo ano" : `A cada ${iv} anos`;
}
function recFields(r) {
  r = r || { freq: "none" };
  const p = recToPreset(r), custom = p === "custom", unit = r.freq === "none" ? "daily" : r.freq;
  return `<div class="recbox">
   <div class="grid2"><label class="field"><span>Repetir</span><select name="rec_p" data-ch="recPreset">${REC_PRESETS.map(([k, n]) => `<option value="${k}" ${p === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
   <label class="field rec-until ${p === "none" ? "hidden" : ""}"><span>Repetir até (opcional)</span><input type="date" name="rec_until" value="${esc(r.until || "")}"></label></div>
   <div class="rec-custom ${custom ? "" : "hidden"}"><div class="grid2"><label class="field"><span>A cada</span><input type="number" min="1" max="999" name="rec_n" value="${r.interval || 1}"></label>
    <label class="field"><span>Unidade</span><select name="rec_u" data-ch="recUnit">${[["daily", "dia(s)"], ["weekly", "semana(s)"], ["monthly", "mês(es)"], ["yearly", "ano(s)"]].map(([k, n]) => `<option value="${k}" ${unit === k ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
    <div class="field rec-wk ${custom && unit === "weekly" ? "" : "hidden"}"><span>Nos dias da semana (opcional)</span><div class="wdays">${DSEM.map((n, i) => `<label class="wd"><input type="checkbox" name="rec_wd" value="${i}" ${(r.days || []).includes(i) ? "checked" : ""}><span>${n[0]}</span></label>`).join("")}</div></div></div></div>`;
}
function recFromForm(fd) {
  const p = fd.get("rec_p") || "none", until = fd.get("rec_until") || "";
  if (p === "none") return { freq: "none" };
  if (p === "custom") {
    const freq = fd.get("rec_u") || "daily";
    return { freq, interval: Math.max(1, +fd.get("rec_n") || 1), days: freq === "weekly" ? fd.getAll("rec_wd").map(Number) : [], until };
  }
  return { ...REC_DEF[p], days: [...REC_DEF[p].days], until };
}
const recSync = (el) => {
  const box = el.closest(".recbox"), p = $("[name=rec_p]", box).value, unit = $("[name=rec_u]", box).value;
  $(".rec-until", box).classList.toggle("hidden", p === "none");
  $(".rec-custom", box).classList.toggle("hidden", p !== "custom");
  $(".rec-wk", box).classList.toggle("hidden", !(p === "custom" && unit === "weekly"));
};
INP.recPreset = recSync;
INP.recUnit = recSync;
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
