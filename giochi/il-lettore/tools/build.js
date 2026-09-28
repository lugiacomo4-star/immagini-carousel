// Uso: node tools/build.js  → rigenera cases.js da casi/*.json e cases.zh.js da casi-zh/*.json
// L'ordine alterna i file (le zone) così i casi del giorno cambiano ambientazione.
// Le due lingue usano lo stesso ordine, così il caso del giorno è lo stesso per tutti.
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");

let manifest = {};
try { manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "img", "manifest.json"), "utf8")); } catch (e) {}

function build(dirName, outName, varName) {
  const dir = path.join(ROOT, dirName);
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();
  const lists = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  const out = [];
  for (let i = 0; lists.some(l => i < l.length); i++) lists.forEach(l => { if (l[i]) out.push(l[i]); });
  const ids = new Set();
  out.forEach(c => { if (ids.has(c.id)) throw new Error("id caso duplicato: " + c.id); ids.add(c.id); if (manifest[c.id]) c.img = manifest[c.id]; });
  fs.writeFileSync(path.join(ROOT, outName), `window.${varName} = ` + JSON.stringify(out) + ";\n");
  console.log(`${outName}: ${out.length} casi`);
  return { files, out };
}

const it = build("casi", "cases.js", "CASES");
const zhDir = path.join(ROOT, "casi-zh");
const zhFiles = fs.existsSync(zhDir) ? fs.readdirSync(zhDir).filter(f => f.endsWith(".json")).sort() : [];
if (zhFiles.length && JSON.stringify(zhFiles) === JSON.stringify(it.files)) {
  const zh = build("casi-zh", "cases.zh.js", "CASES_ZH");
  if (zh.out.map(c => c.id).join() !== it.out.map(c => c.id).join()) throw new Error("i casi cinesi non corrispondono a quelli italiani");
} else if (zhFiles.length) {
  console.log(`cases.zh.js non aggiornato: in casi-zh mancano ${it.files.filter(f => !zhFiles.includes(f)).join(", ")}`);
}
