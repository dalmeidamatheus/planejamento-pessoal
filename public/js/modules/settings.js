"use strict";
ACT.settings = () => {
  const zs = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : ["America/Sao_Paulo", "UTC"];
  modal(`<form data-form="settings"><h2>Ajustes</h2><label class="field"><span>Seu fuso horário (exibição do calendário)</span><input type="text" name="tz" list="tzl" value="${esc(S.settings.tz)}"></label><datalist id="tzl">${zs.map((z) => `<option>${z}</option>`).join("")}</datalist>
  <label class="field"><span>Relógios extras (fusos separados por vírgula)</span><input type="text" name="clocks" value="${esc((S.settings.clocks || []).join(", "))}" placeholder="America/New_York, Europe/Lisbon"></label>
  <label class="field"><span>Dinheiro disponível hoje (R$) — quanto você realmente tem em conta agora</span><input type="number" step="0.01" name="cashNow" value="${R2(cashAvailable(todayStr()))}"></label><input type="hidden" name="cashOrig" value="${R2(cashAvailable(todayStr()))}">
  <label class="field"><span>Ajuste de saldo inicial (R$) — preenchido sozinho quando você corrige o valor acima</span><input type="number" step="0.01" name="opening" value="${S.settings.opening || 0}"></label>
  <label class="field"><span>Renda mensal líquida (R$) — usada em “% do salário” (vazio = estimada pelas entradas recorrentes)</span><input type="number" step="0.01" name="salary" value="${S.settings.salary || ""}"></label>
  <div class="row wrap" style="margin-bottom:10px"><button type="button" class="btn" data-act="exportData">Exportar backup (.json)</button><button type="button" class="btn" data-act="exportIcs">Exportar agenda (.ics)</button><label class="btn">Importar backup<input type="file" accept=".json" data-ch="importFile" hidden></label><button type="button" class="btn" data-act="seed">Carregar dados de exemplo</button></div>
  <div class="muted sm">Conta: ${esc(user.email)} · ${sb ? "dados na nuvem (Supabase, isolados por usuário)" : "modo local (somente neste navegador)"}</div>
  <div class="foot"><button type="button" class="btn danger" data-act="wipe">Apagar todos os meus dados</button><span class="grow"></span><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
};
SUBMIT.settings = (f, fd) => {
  const tz = fd.get("tz").trim();
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: tz });
  } catch {
    toast("Fuso inválido", true);
    return;
  }
  const clocks = fd.get("clocks").split(",").map((x) => x.trim()).filter(Boolean);
  for (const c of clocks) {
    try {
      new Intl.DateTimeFormat("pt-BR", { timeZone: c });
    } catch {
      toast("Fuso inválido: " + c, true);
      return;
    }
  }
  S.settings.tz = tz;
  S.settings.clocks = clocks;
  S.settings.opening = +fd.get("opening") || 0;
  if (fd.get("cashNow") !== fd.get("cashOrig") && fd.get("cashNow") !== "") S.settings.opening = R2((S.settings.opening || 0) + +fd.get("cashNow") - cashAvailable(todayStr()));
  S.settings.salary = +fd.get("salary") || 0;
  ui.cal.d = null;
  save();
  closeModal();
  render();
  toast("Ajustes salvos");
};
ACT.exportData = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }));
  a.download = "norte-backup-" + todayStr() + ".json";
  a.click();
};
INP.importFile = (el) => {
  const f = el.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!confirm("Substituir seus dados atuais pelo backup?")) return;
      S = Object.assign(emptyData(), d);
      save();
      closeModal();
      render();
      toast("Backup importado");
    } catch {
      toast("Arquivo inválido", true);
    }
  };
  r.readAsText(f);
};
ACT.wipe = () => {
  if (!confirm("Apagar TODOS os seus dados? Esta ação não pode ser desfeita.")) return;
  const s = S.settings;
  S = emptyData();
  S.settings = s;
  save();
  closeModal();
  render();
  toast("Dados apagados");
};
