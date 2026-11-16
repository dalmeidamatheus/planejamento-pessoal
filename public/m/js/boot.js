"use strict";
/* Inicialização do app mobile: sessão (Supabase ou local) → dados → shell */
(async function init() {
  try {
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (data.session) {
        user = { id: data.session.user.id, email: data.session.user.email };
        await loadData();
        startApp();
        return;
      }
    } else {
      const s = JSON.parse(LS.getItem("fox:session") || "null");
      if (s) {
        user = s;
        await loadData();
        startApp();
        return;
      }
    }
  } catch (e) {
    console.error(e);
  }
  showLogin();
})();
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost"))
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
