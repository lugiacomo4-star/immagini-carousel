// Uso: node tools/check-zh.js casi-zh/<file>.json
// Controlla che la traduzione cinese abbia la stessa struttura dell'originale in casi/ (stessi id,
// stessi requisiti, stesso colpevole) e che ogni testo sia tradotto.
const fs = require("fs"), path = require("path");
let errors = 0;
const err = m => { errors++; console.log("✗ " + m); };
const CJK = /[一-鿿]/;
const TEXT = new Set(["title", "place", "teaser", "intro", "label", "text", "insight", "role", "look", "tell", "q", "a", "aside", "reply", "solution"]);
const KEEP = new Set(["id", "name", "req", "culprit", "key", "correct", "who", "b", "lie", "img"]);
function walk(it, zh, where) {
  if (Array.isArray(it)) {
    if (!Array.isArray(zh) || zh.length !== it.length) return err(`${where}: lunghezza diversa`);
    it.forEach((v, i) => walk(v, zh[i], `${where}[${i}]`));
  } else if (it && typeof it === "object") {
    if (!zh || typeof zh !== "object") return err(`${where}: manca`);
    for (const k of Object.keys(it)) {
      if (!(k in zh)) { err(`${where}.${k}: manca`); continue; }
      if (where.endsWith(".reactions") || where.endsWith("options")) { if (!CJK.test(zh[k])) err(`${where}.${k}: non tradotto`); continue; }
      if (k === "a" && /contradictions\[\d+\]$/.test(where)) { if (it[k] !== zh[k]) err(`${where}.a: deve restare uguale`); continue; }
      if (TEXT.has(k) && typeof it[k] === "string") { if (!CJK.test(zh[k])) err(`${where}.${k}: non tradotto`); continue; }
      if (KEEP.has(k) || typeof it[k] !== "object") { if (JSON.stringify(it[k]) !== JSON.stringify(zh[k])) err(`${where}.${k}: deve restare uguale (${JSON.stringify(it[k])})`); continue; }
      walk(it[k], zh[k], `${where}.${k}`);
    }
  } else if (typeof it === "string" && where.endsWith("options")) { if (!CJK.test(zh)) err(`${where}: non tradotto`); }
}
for (const f of process.argv.slice(2)) {
  const zh = JSON.parse(fs.readFileSync(f, "utf8"));
  const it = JSON.parse(fs.readFileSync(path.join(path.dirname(f), "..", "casi", path.basename(f)), "utf8"));
  if (zh.length !== it.length) err(`${f}: ${it.length} casi nell'originale, ${zh.length} tradotti`);
  it.forEach((c, i) => walk(c, zh[i], c.id));
}
console.log(errors ? `\n${errors} errori` : "Tutto ok");
process.exit(errors ? 1 : 0);
