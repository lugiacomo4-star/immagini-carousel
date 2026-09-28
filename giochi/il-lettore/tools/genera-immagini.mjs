// Genera ritratti e copertine del Lettore con l'API di Higgsfield.
//
//   node tools/genera-immagini.mjs stima        → quante immagini mancano e quanto costano (non spende nulla)
//   node tools/genera-immagini.mjs prova        → 6 immagini di prova dello stile (un caso)
//   node tools/genera-immagini.mjs tutto        → genera solo le immagini che mancano
//
// Credenziali: di norma le aggiunge il proxy dell'ambiente cloud (API credential su api.higgsfield.ai,
// header Authorization con prefisso "Key"). In alternativa: HF_API_KEY_ID e HF_API_KEY_SECRET.
// Le immagini finiscono in img/<caso>/cover.<ext> e img/<caso>/<sospettato>.<ext>;
// img/manifest.json tiene l'elenco, e tools/build.js lo incolla in cases.js.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Nell'ambiente cloud le richieste devono passare dal proxy: Node lo usa solo con NODE_USE_ENV_PROXY.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const { spawnSync } = await import("node:child_process");
  const env = { ...process.env, NODE_USE_ENV_PROXY: "1", NODE_NO_WARNINGS: "1" };
  if (fs.existsSync("/root/.ccr/ca-bundle.crt")) env.NODE_EXTRA_CA_CERTS = "/root/.ccr/ca-bundle.crt";
  process.exit(spawnSync(process.execPath, process.argv.slice(1), { stdio: "inherit", env }).status ?? 1);
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.higgsfield.ai";

// Modelli e prezzi di listino in dollari (open.higgsfield.ai, settembre 2026).
// Se un endpoint risponde 404, controlla il nome esatto del modello sulla sua pagina "API".
const MODELS = {
  portrait: { endpoint: "/higgsfield-ai/soul/v2/standard", price: 0.01, body: p => ({ prompt: p, aspect_ratio: "3:4" }) },
  cover: { endpoint: "/xai/grok-imagine-image-2.0", price: 0.04, body: p => ({ prompt: p, aspect_ratio: "16:9" }) }
};

// Uno stile unico per tutto il gioco: noir mediterraneo, pellicola, luce di taglio.
const STYLE = "cinematic still, Italian noir, Apulia, warm tungsten key light from one side, deep teal shadows, 35mm film grain, muted palette of teal, ink black and amber, shallow depth of field, no text, no watermark";
const portraitPrompt = (c, s) =>
  `Portrait of ${s.name}, ${s.role}. ${s.look} Chest-up, looking slightly off camera, interrogation room in a small southern Italian police station at night, plain dark background. ${STYLE}`;
const coverPrompt = c =>
  `Establishing shot for a mystery: ${c.place}. ${c.teaser} Empty scene, no people in focus, a single telling object in the foreground, dusk. ${STYLE}`;

function loadCases() {
  const src = fs.readFileSync(path.join(ROOT, "cases.js"), "utf8");
  const w = {}; new Function("window", src)(w);
  return w.CASES;
}
const manifestPath = path.join(ROOT, "img", "manifest.json");
const loadManifest = () => { try { return JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch { return {}; } };
const saveManifest = m => { fs.mkdirSync(path.dirname(manifestPath), { recursive: true }); fs.writeFileSync(manifestPath, JSON.stringify(m, null, 1)); };

const pendingPath = path.join(ROOT, "img", "pending.json");
const loadPending = () => { try { return JSON.parse(fs.readFileSync(pendingPath, "utf8")); } catch { return {}; } };
const savePending = p => { fs.mkdirSync(path.dirname(pendingPath), { recursive: true }); fs.writeFileSync(pendingPath, JSON.stringify(p, null, 1)); };

function jobs(cases, manifest) {
  const out = [];
  for (const c of cases) {
    const have = manifest[c.id] || {};
    if (!have.cover) out.push({ caseId: c.id, key: "cover", kind: "cover", prompt: coverPrompt(c) });
    for (const s of c.suspects) if (!(have.suspects || {})[s.id]) out.push({ caseId: c.id, key: s.id, kind: "portrait", prompt: portraitPrompt(c, s) });
  }
  return out;
}

function auth() {
  const id = process.env.HF_API_KEY_ID, secret = process.env.HF_API_KEY_SECRET;
  if (!id || !secret) return { "Content-Type": "application/json" }; // la chiave la aggiunge il proxy
  return { Authorization: `Key ${id}:${secret}`, "Content-Type": "application/json" };
}

// Cerca il primo URL di immagine nella risposta, qualunque sia la forma del JSON.
function findImageUrl(o) {
  if (typeof o === "string") return /^https?:\/\//.test(o) && !/\/requests\//.test(o) ? o : null;
  if (Array.isArray(o)) { for (const x of o) { const u = findImageUrl(x); if (u) return u; } return null; }
  if (o && typeof o === "object") {
    for (const k of ["images", "image", "url", "output", "result", "results"]) if (k in o) { const u = findImageUrl(o[k]); if (u) return u; }
    for (const v of Object.values(o)) { const u = findImageUrl(v); if (u) return u; }
  }
  return null;
}

async function run(job, headers) {
  const m = MODELS[job.kind];
  const known = loadPending()[`${job.caseId}/${job.key}`];
  let st;
  if (known) st = { request_id: known, status: "queued" }; // già pagata: la riprendo, non la rigenero
  else {
    const res = await fetch(API + m.endpoint, { method: "POST", headers, body: JSON.stringify(m.body(job.prompt)) });
    if (!res.ok) throw new Error(`${m.endpoint} → ${res.status} ${await res.text()}`);
    st = await res.json();
  }
  // Salva subito l'id: se il resto fallisce, l'immagine pagata si recupera con "recupera".
  const pend = loadPending(); pend[`${job.caseId}/${job.key}`] = st.request_id; savePending(pend);
  const statusUrl = `${API}/requests/${st.request_id}/status`; // lo status_url punta a un altro host
  for (let i = 0; i < 120 && !["completed", "failed", "nsfw", "canceled"].includes(st.status); i++) {
    await new Promise(r => setTimeout(r, 3000));
    st = await (await fetch(statusUrl, { headers })).json();
  }
  if (st.status !== "completed") throw new Error(`stato finale: ${st.status}`);
  const url = findImageUrl(st);
  if (!url) throw new Error("nessun URL immagine nella risposta: " + JSON.stringify(st).slice(0, 300));
  const img = await fetch(url).catch(e => { throw new Error(`download bloccato da ${new URL(url).host}: ${e.cause?.message || e.message}`); });
  const type = img.headers.get("content-type") || "";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const rel = `img/${job.caseId}/${job.key}.${ext}`;
  fs.mkdirSync(path.join(ROOT, "img", job.caseId), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), Buffer.from(await img.arrayBuffer()));
  return rel;
}

const mode = process.argv[2] || "stima";
const cases = loadCases();
const manifest = loadManifest();
let list = jobs(cases, manifest);
if (mode === "prova") list = list.filter(j => j.caseId === cases[0].id).concat(list.filter(j => j.kind === "cover").slice(1, 3)).slice(0, 6);

const cost = list.reduce((t, j) => t + MODELS[j.kind].price, 0);
const nP = list.filter(j => j.kind === "portrait").length, nC = list.length - nP;
console.log(`${list.length} immagini da generare: ${nP} ritratti, ${nC} copertine. Costo stimato: $${cost.toFixed(2)} (prezzi di listino).`);
if (mode === "stima") process.exit(0);

const headers = auth();
let spent = 0, ok = 0;
for (const job of list) {
  try {
    const rel = await run(job, headers);
    const entry = manifest[job.caseId] ||= { suspects: {} };
    if (job.key === "cover") entry.cover = rel; else entry.suspects[job.key] = rel;
    saveManifest(manifest);
    spent += MODELS[job.kind].price; ok++;
    console.log(`✓ ${rel}`);
  } catch (e) {
    console.log(`✗ ${job.caseId}/${job.key}: ${e.message}${e.cause ? " (" + e.cause.message + ")" : ""}`);
    if (/40[13]/.test(e.message)) { console.log("Credenziali rifiutate: mi fermo."); break; }
  }
}
console.log(`Fatto: ${ok}/${list.length} immagini, circa $${spent.toFixed(2)}. Ora lancia: node tools/build.js`);
