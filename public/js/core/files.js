"use strict";
/* Anexos (imagens, vídeos, PDFs, qualquer arquivo) usados em notas e tarefas.
   - Os bytes ficam no IndexedDB do navegador (rápido e offline).
   - Com Supabase configurado, uma cópia vai para o bucket privado "attachments"
     (caminho <user_id>/<id>), então o arquivo aparece em todos os aparelhos.
   - No JSON de dados (S) guardamos só os metadados: { id, name, type, size }. */
const Files = (() => {
  const MAX = 50 * 1024 * 1024;
  const urls = new Map();
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((ok, no) => {
    try {
      const r = indexedDB.open("norte-files", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("f", { keyPath: "id" });
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    } catch (e) { no(e); }
  }));
  const tx = async (mode, fn) => {
    const d = await db();
    return new Promise((ok, no) => {
      const t = d.transaction("f", mode), s = t.objectStore("f"), q = fn(s);
      t.oncomplete = () => ok(q && q.result);
      t.onerror = () => no(t.error);
    });
  };
  const idbGet = (id) => tx("readonly", (s) => s.get(id)).catch(() => null);
  const idbPut = (rec) => tx("readwrite", (s) => s.put(rec)).catch(() => null);
  const idbDel = (id) => tx("readwrite", (s) => s.delete(id)).catch(() => null);
  const path = (id) => (typeof user !== "undefined" && user ? user.id : "anon") + "/" + id;
  const cloudOn = () => typeof sb !== "undefined" && sb && typeof user !== "undefined" && user;

  async function put(file) {
    if (file.size > MAX) throw new Error("Arquivo maior que 50 MB");
    const id = uid() + uid();
    const meta = { id, name: file.name || "arquivo", type: file.type || "application/octet-stream", size: file.size };
    await idbPut({ ...meta, blob: file });
    if (cloudOn()) sb.storage.from("attachments").upload(path(id), file, { contentType: meta.type, upsert: true }).then(({ error }) => {
      if (error) console.warn("Upload do anexo falhou (fica só neste aparelho):", error.message);
    }).catch(() => {});
    return meta;
  }
  async function blob(id) {
    const rec = await idbGet(id);
    if (rec && rec.blob) return rec.blob;
    if (!cloudOn()) return null;
    try {
      const { data, error } = await sb.storage.from("attachments").download(path(id));
      if (error || !data) return null;
      idbPut({ id, name: "", type: data.type, size: data.size, blob: data });
      return data;
    } catch { return null; }
  }
  async function url(id) {
    if (urls.has(id)) return urls.get(id);
    const b = await blob(id);
    if (!b) return "";
    const u = URL.createObjectURL(b);
    urls.set(id, u);
    return u;
  }
  async function remove(id) {
    if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
    await idbDel(id);
    if (cloudOn()) sb.storage.from("attachments").remove([path(id)]).catch(() => {});
  }
  /** Preenche src dos elementos [data-fid] (img/video/audio) dentro de root. */
  async function resolve(root) {
    const els = [...(root || document).querySelectorAll("[data-fid]")];
    await Promise.all(els.map(async (el) => {
      if (el.tagName === "A" || el.dataset.fidDone === el.dataset.fid) return;
      const u = await url(el.dataset.fid);
      if (u) { el.src = u; el.dataset.fidDone = el.dataset.fid; }
      else if (!el.dataset.missing) { el.dataset.missing = "1"; el.title = "Arquivo indisponível neste aparelho"; el.classList.add("fmissing"); }
    }));
  }
  async function open(id, name) {
    const u = await url(id);
    if (!u) { toast("Arquivo indisponível neste aparelho", true); return; }
    const a = document.createElement("a");
    a.href = u; a.target = "_blank"; a.rel = "noopener";
    if (name) a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  const size = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  const icon = (t = "") => ic(t.startsWith("image/") ? "image" : t.startsWith("video/") ? "video" : t.startsWith("audio/") ? "music" : "file", 18);
  return { put, url, blob, remove, resolve, open, size, icon, MAX };
})();
