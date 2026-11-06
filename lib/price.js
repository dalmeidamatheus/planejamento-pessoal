const dns = require("dns").promises;
const net = require("net");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_BYTES = 15e5;
function fail(code, msg) {
  const e = new Error(msg);
  e.code = code;
  return e;
}
function isPrivate(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase();
    return s === "::1" || s === "::" || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe80") || s.startsWith("::ffff:127.") || s.startsWith("::ffff:10.") || s.startsWith("::ffff:192.168.") || s.startsWith("::ffff:169.254.");
  }
  return true;
}
async function assertPublic(u) {
  if (!/^https?:$/.test(u.protocol)) throw fail("BAD_URL", "URL inválida (use http ou https)");
  if (u.port && !["80", "443"].includes(u.port)) throw fail("BAD_URL", "Porta não permitida");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^localhost$|\.local$|\.internal$/i.test(host)) throw fail("BAD_URL", "Endereço não permitido");
  let ips;
  try {
    ips = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
  } catch {
    throw fail("BAD_URL", "Domínio não encontrado");
  }
  if (!ips.length || ips.some(isPrivate)) throw fail("BAD_URL", "Endereço não permitido");
}
async function fetchHtml(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw fail("BAD_URL", "URL inválida");
  }
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(u);
    const res = await fetch(u, {
      redirect: "manual",
      signal: AbortSignal.timeout(1e4),
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "pt-BR,pt;q=0.9,en;q=0.5" }
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      u = new URL(res.headers.get("location"), u);
      continue;
    }
    if (!res.ok) throw fail("HTTP_" + res.status, "A loja respondeu " + res.status + " (pode estar bloqueando consultas automáticas)");
    const reader = res.body.getReader();
    const dec = new TextDecoder("utf-8");
    let html = "", n = 0;
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.length;
      html += dec.decode(value, { stream: true });
      if (n > MAX_BYTES) {
        reader.cancel();
        break;
      }
    }
    return html;
  }
  throw fail("BAD_URL", "Redirecionamentos demais");
}
function toNum(v) {
  if (typeof v === "number") return v;
  let s = String(v).replace(/[^\d.,]/g, "");
  if (!s) return NaN;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  return parseFloat(s);
}
const unent = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'").trim();
const meta = (html, re) => {
  const m = html.match(re);
  return m ? unent(m[1]) : "";
};
const imgOf = (v) => Array.isArray(v) ? imgOf(v[0]) : v && typeof v === "object" ? v.url || "" : String(v || "");
function walk(node, out, depth = 0) {
  if (!node || typeof node !== "object" || depth > 8) return;
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, out, depth + 1));
    return;
  }
  if (node.offers) {
    (Array.isArray(node.offers) ? node.offers : [node.offers]).forEach((o) => {
      const p = o && (o.price ?? o.lowPrice ?? (o.priceSpecification && o.priceSpecification.price));
      if (p != null) out.push({ price: toNum(p), currency: o.priceCurrency || "", title: node.name, image: imgOf(node.image) });
    });
  }
  Object.values(node).forEach((v) => {
    if (v && typeof v === "object") walk(v, out, depth + 1);
  });
}
function extract(html) {
  const title = meta(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || meta(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) || meta(html, /<title[^>]*>([^<]+)<\/title>/i);
  const image = meta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || meta(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const found = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walk(JSON.parse(m[1].trim()), found);
    } catch {
    }
  }
  const ld = found.find((x) => x.price > 0);
  if (ld) return { price: ld.price, currency: ld.currency || "BRL", title: unent(ld.title) || title, image: ld.image || image, source: "json-ld" };
  const mp = meta(html, /<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([^"']+)["']/i) || meta(html, /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/i) || meta(html, /<[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i);
  if (mp && toNum(mp) > 0) return { price: toNum(mp), currency: "BRL", title, image, source: "meta" };
  const t = html.match(/R\$\s*([\d]{1,3}(?:\.\d{3})*,\d{2})/);
  if (t && toNum(t[1]) > 0) return { price: toNum(t[1]), currency: "BRL", title, image, source: "texto" };
  throw fail("PRICE_NOT_FOUND", "Preço não encontrado na página");
}
async function fetchPrice(url) {
  return extract(await fetchHtml(url));
}
module.exports = { fetchPrice, extract, toNum, isPrivate };
