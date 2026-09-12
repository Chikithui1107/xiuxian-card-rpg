#!/usr/bin/env node
/**
 * postbuild: GitHub Pages helpers
 * 1) .nojekyll
 * 2) inject one-shot chunk-miss reload into static HTML
 *    (force_orphan deploys change hashed filenames; stale cached index.html
 *     would otherwise stick on the SSR “載入中…” shell forever)
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "out");
fs.writeFileSync(path.join(outDir, ".nojekyll"), "");

const RELOAD_SNIPPET = `<script>(function(){try{var k="xiuxian_pages_chunk_reload_v1";window.addEventListener("error",function(e){var t=e&&e.target;if(!t||(t.tagName!=="SCRIPT"&&t.tagName!=="LINK"))return;if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,"1");location.reload();},true);}catch(e){}})();</script>`;

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

for (const file of walk(outDir)) {
  let html = fs.readFileSync(file, "utf8");
  if (html.includes("xiuxian_pages_chunk_reload_v1")) continue;
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${RELOAD_SNIPPET}</head>`);
  } else {
    html = RELOAD_SNIPPET + html;
  }
  fs.writeFileSync(file, html);
}

console.log("postbuild: .nojekyll + chunk-miss reload injected");
