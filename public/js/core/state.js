"use strict";
let S = null, user = null, sb = null, view = "home", saveT = null;
const ui = { cal: { mode: "week", d: null }, fin: { tab: "geral", ym: null, f: { type: "", status: "", cat: "", q: "" } }, notes: { sel: null, mode: "both", q: "" }, tasks: { filter: "all" } };
const emptyData = () => ({ v: 1, _ts: 0, settings: { tz: TZ0, clocks: ["America/New_York", "Europe/Lisbon"], opening: 0 }, events: [], tx: [], recur: [], cards: [], budgets: [], goals: [], assets: [], divs: [], tasks: [], habits: [], notes: [], notifs: [], fired: {}, birthdays: [], wishlist: [], trips: [] });
const ACT = {}, SUBMIT = {}, INP = {}, VIEWS = {}, AFTER = {}, TITLES = { home: "Início", calendar: "Calendário", tasks: "Tarefas", finance: "Finanças", habits: "Hábitos", notes: "Notas", wishlist: "Lista de desejos", trips: "Viagens" };
const LS = (() => {
  try {
    localStorage.setItem("_t", "1");
    localStorage.removeItem("_t");
    return localStorage;
  } catch {
    const m = {};
    return { getItem: (k) => m[k] ?? null, setItem: (k, v) => {
      m[k] = v;
    }, removeItem: (k) => {
      delete m[k];
    } };
  }
})();
function setSync(s) {
  const el = $("#sync");
  if (el) el.textContent = { local: "Salvo neste navegador", saving: "Salvando…", saved: "Sincronizado ✓", error: "Erro ao sincronizar" }[s] || "";
}
function save() {
  S._ts = Date.now();
  try {
    LS.setItem("fox:data:" + user.id, JSON.stringify(S));
  } catch {
  }
  setSync("saving");
  clearTimeout(saveT);
  saveT = setTimeout(pushCloud, 700);
}
async function pushCloud() {
  if (!sb) {
    setSync("local");
    return;
  }
  try {
    const { error } = await sb.from("user_data").upsert({ user_id: user.id, data: S, updated_at: (new Date()).toISOString() });
    setSync(error ? "error" : "saved");
  } catch {
    setSync("error");
  }
}
async function loadData() {
  let local = null, remote = null;
  try {
    local = JSON.parse(LS.getItem("fox:data:" + user.id));
  } catch {
  }
  if (sb) {
    try {
      const { data } = await sb.from("user_data").select("data").eq("user_id", user.id).maybeSingle();
      remote = data?.data && Object.keys(data.data).length ? data.data : null;
    } catch {
    }
  }
  const d = remote && (!local || (remote._ts || 0) >= (local._ts || 0)) ? remote : local;
  const base = emptyData();
  S = Object.assign(base, d || {});
  S.settings = Object.assign(base.settings, S.settings || {});
  normAssets();
  if (sb && d === local && local) pushCloud();
}
window.addEventListener("beforeunload", () => {
  if (S && user) try {
    LS.setItem("fox:data:" + user.id, JSON.stringify(S));
  } catch {
  }
});
