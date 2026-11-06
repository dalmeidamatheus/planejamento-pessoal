"use strict";
function md(src) {
  const lines = esc(src).split("\n");
  let out = "", list = null;
  const inl = (t) => t.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<i>$2</i>").replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const close = () => {
    if (list) {
      out += `</${list}>`;
      list = null;
    }
  };
  for (const ln of lines) {
    let m;
    if (m = ln.match(/^(#{1,3})\s+(.*)/)) {
      close();
      out += `<h${m[1].length}>${inl(m[2])}</h${m[1].length}>`;
    } else if (m = ln.match(/^\s*[-*]\s+\[( |x)\]\s+(.*)/i)) {
      if (list !== "ul") {
        close();
        out += '<ul class="chk">';
        list = "ul";
      }
      out += `<li><input type="checkbox" disabled ${m[1] !== " " ? "checked" : ""}> ${inl(m[2])}</li>`;
    } else if (m = ln.match(/^\s*[-*]\s+(.*)/)) {
      if (list !== "ul") {
        close();
        out += "<ul>";
        list = "ul";
      }
      out += `<li>${inl(m[1])}</li>`;
    } else if (m = ln.match(/^\s*\d+\.\s+(.*)/)) {
      if (list !== "ol") {
        close();
        out += "<ol>";
        list = "ol";
      }
      out += `<li>${inl(m[1])}</li>`;
    } else if (m = ln.match(/^&gt;\s?(.*)/)) {
      close();
      out += `<blockquote>${inl(m[1])}</blockquote>`;
    } else if (/^---+$/.test(ln.trim())) {
      close();
      out += "<hr>";
    } else if (!ln.trim()) close();
    else {
      close();
      out += `<p>${inl(ln)}</p>`;
    }
  }
  close();
  return out;
}
