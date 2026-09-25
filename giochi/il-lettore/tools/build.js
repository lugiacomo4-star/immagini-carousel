// Uso: node tools/build.js  → rigenera cases.js da casi/*.json
// L'ordine alterna i file (le zone) così i casi del giorno cambiano ambientazione.
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "casi");
const lists = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
const out = [];
for (let i = 0; lists.some(l => i < l.length); i++) lists.forEach(l => { if (l[i]) out.push(l[i]); });
const ids = new Set();
out.forEach(c => { if (ids.has(c.id)) throw new Error("id caso duplicato: " + c.id); ids.add(c.id); });
fs.writeFileSync(path.join(__dirname, "..", "cases.js"), "window.CASES = " + JSON.stringify(out) + ";\n");
console.log(`cases.js: ${out.length} casi`);
