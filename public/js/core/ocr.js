"use strict";
/* Foto de um documento/anotação → texto.
   1) /api/ocr (fila de provedores gratuitos com visão, do melhor ao pior) quando houver alguma chave configurada;
   2) caso contrário, Tesseract.js (roda no próprio navegador, sem chave; mais fraco para manuscrito). */
const OCR = (() => {
  async function shrink(file, max = 1800) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    let blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.86));
    // alguns provedores gratuitos (OCR.space) só aceitam até ~1 MB
    for (let q = 0.72; blob.size > 950 * 1024 && q > 0.3; q -= 0.14) blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", q));
    return blob;
  }
  const b64 = (blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(blob); });
  async function viaApi(blob) {
    try {
      const tk = typeof sb !== "undefined" && sb ? ((await sb.auth.getSession()).data.session || {}).access_token : "";
      const res = await fetch("/api/ocr", { method: "POST", headers: { "Content-Type": "application/json", ...(tk ? { Authorization: "Bearer " + tk } : {}) }, body: JSON.stringify({ image: await b64(blob), mime: "image/jpeg" }) });
      if (!res.ok) return null;
      const j = await res.json();
      return typeof j.text === "string" ? { text: j.text, provider: j.provider || "IA" } : null;
    } catch { return null; }
  }
  async function viaTesseract(blob) {
    await RT.load("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
    const r = await window.Tesseract.recognize(blob, "por");
    return (r.data.text || "").trim();
  }
  /** Devolve { text, provider } ("" se não achou texto). Ordem: provedores do servidor (do melhor ao pior) -> Tesseract no navegador. */
  async function run(file) {
    const blob = await shrink(file);
    const r = await viaApi(blob);
    if (r) return { text: r.text.trim(), provider: r.provider };
    return { text: await viaTesseract(blob), provider: "Tesseract (no navegador)" };
  }
  /** Texto → HTML do editor (parágrafos separados por linha em branco, quebras simples viram <br>). */
  const toHtml = (t) => t.split(/\n{2,}/).map((p) => "<p>" + p.split("\n").map((l) => esc(l.trim())).filter(Boolean).join("<br>") + "</p>").filter((p) => p !== "<p></p>").join("");
  return { run, toHtml, shrink, b64 };
})();
