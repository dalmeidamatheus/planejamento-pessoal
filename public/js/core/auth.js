"use strict";
try {
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase) sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
} catch {
}
async function sha(pw, salt) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + pw));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function doAuth(mode, email, pw) {
  email = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("E-mail inválido");
  if (pw.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres");
  if (sb) {
    if (mode === "signup") {
      const { data, error } = await sb.auth.signUp({ email, password: pw });
      if (error) throw error;
      if (!data.session) return "confirm";
      user = { id: data.user.id, email };
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
      if (error) throw new Error(/invalid/i.test(error.message) ? "E-mail ou senha incorretos" : error.message);
      user = { id: data.user.id, email };
    }
  } else {
    const users = JSON.parse(LS.getItem("fox:users") || "{}");
    if (mode === "signup") {
      if (users[email]) throw new Error("E-mail já cadastrado");
      const salt = uid();
      users[email] = { id: "u_" + uid(), salt, hash: await sha(pw, salt) };
      LS.setItem("fox:users", JSON.stringify(users));
    }
    const u = users[email];
    if (!u || u.hash !== await sha(pw, u.salt)) throw new Error("E-mail ou senha incorretos");
    user = { id: u.id, email };
    LS.setItem("fox:session", JSON.stringify(user));
  }
  await loadData();
  startApp();
}
async function logout() {
  if (saveT) {
    clearTimeout(saveT);
    saveT = null;
    await pushCloud();
  }
  if (sb) await sb.auth.signOut();
  LS.removeItem("fox:session");
  user = null;
  S = null;
  ui.cl.sel.clear();
  showLogin();
}
function showLogin(mode = "signin") {
  $("#app").innerHTML = `<div class="auth"><div class="box"><div class="brand"><span class="logo"></span><span>Norte</span></div><p>Calendário, finanças, tarefas, hábitos e notas — num lugar só.</p>
  <form class="card" data-form="auth" data-mode="${mode}">
   <h2 style="margin-bottom:14px">${mode === "signin" ? "Entrar na sua conta" : "Criar conta"}</h2>
   <label class="field"><span>E-mail</span><input type="email" name="email" autocomplete="email" required autofocus></label>
   <label class="field"><span>Senha</span><input type="password" name="pw" autocomplete="${mode === "signin" ? "current-password" : "new-password"}" required minlength="6"></label>
   <div class="err" id="autherr"></div>
   <button class="btn primary" style="width:100%;justify-content:center;height:34px" id="authbtn">${mode === "signin" ? "Entrar" : "Criar conta"}</button>
   <div class="row" style="justify-content:space-between;margin-top:12px;font-size:12.5px">
    <a href="#" data-act="authSwitch" data-mode="${mode === "signin" ? "signup" : "signin"}">${mode === "signin" ? "Criar uma conta" : "Já tenho conta"}</a>
    ${sb && mode === "signin" ? '<a href="#" data-act="authReset">Esqueci a senha</a>' : ""}</div>
  </form>
  ${sb ? "" : '<div class="banner"><b>Modo local:</b> Supabase não configurado. Contas e dados ficam somente neste navegador. Configure <code>CONFIG</code> para ter login real com usuários separados na nuvem.</div>'}
  </div></div>`;
}
SUBMIT.auth = async (f, fd) => {
  const b = $("#authbtn"), er = $("#autherr");
  er.textContent = "";
  b.disabled = true;
  try {
    const r = await doAuth(f.dataset.mode, fd.get("email"), fd.get("pw"));
    if (r === "confirm") {
      er.style.color = "var(--ok)";
      er.textContent = "Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.";
    }
  } catch (e) {
    er.style.color = "";
    er.textContent = e.message || "Erro ao autenticar";
  }
  b.disabled = false;
};
ACT.authSwitch = (el, e) => {
  e.preventDefault();
  showLogin(el.dataset.mode);
};
ACT.authReset = async (el, e) => {
  e.preventDefault();
  const em = $("input[name=email]").value.trim();
  if (!em) {
    $("#autherr").textContent = "Digite seu e-mail acima.";
    return;
  }
  const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin });
  $("#autherr").style.color = error ? "" : "var(--ok)";
  $("#autherr").textContent = error ? error.message : "Enviamos um link de redefinição para o seu e-mail.";
};
ACT.logout = () => logout();
