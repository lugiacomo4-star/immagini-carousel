// Uso: node tools/validate.js casi/file.json [altri.json...]
// Controlla struttura, riferimenti e che il caso sia risolvibile con i limiti del gioco.
const fs = require("fs");
const LIM = { eye: 4, questions: 6, hardPerSuspect: 2 };
let errors = 0;
const err = (c, m) => { errors++; console.log(`✗ [${c}] ${m}`); };

for (const file of process.argv.slice(2)) {
  let cases;
  try { cases = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { err(file, "JSON non valido: " + e.message); continue; }
  if (!Array.isArray(cases)) { err(file, "il file deve contenere un array di casi"); continue; }
  for (const c of cases) {
    const cid = c.id || "?";
    for (const f of ["id", "title", "place", "teaser", "intro", "details", "suspects", "contradictions", "bluff", "culprit", "key", "solution"])
      if (c[f] == null) err(cid, "manca il campo " + f);
    if (!Array.isArray(c.details) || !Array.isArray(c.suspects)) continue;
    if (c.details.length !== 7) err(cid, `servono 7 dettagli, ce ne sono ${c.details.length}`);
    if (c.suspects.length !== 3) err(cid, `servono 3 sospettati, ce ne sono ${c.suspects.length}`);
    const nodes = {}; // id -> {kind, ...}
    const add = (id, n) => { if (nodes[id]) err(cid, "id duplicato " + id); nodes[id] = n; };
    c.details.forEach(d => { ["id", "label", "text", "insight"].forEach(f => d[f] || err(cid, `dettaglio ${d.id} senza ${f}`)); add(d.id, { kind: "detail", note: true }); });
    c.suspects.forEach(s => {
      ["id", "name", "role", "look", "tell"].forEach(f => s[f] || err(cid, `sospettato ${s.id} senza ${f}`));
      add("t_" + s.id, { kind: "tell", note: true });
      if (!Array.isArray(s.questions) || s.questions.length < 3 || s.questions.length > 4) err(cid, `${s.id}: servono 3-4 domande`);
      (s.questions || []).forEach(q => {
        ["id", "q", "a"].forEach(f => q[f] || err(cid, `domanda ${q.id} senza ${f}`));
        add(q.id, { kind: "q", who: s.id, req: q.req || [], note: !!q.insight, lie: !!q.lie });
      });
      if (!c.bluff || !c.bluff.reactions || !c.bluff.reactions[s.id]) err(cid, `bluff senza reazione per ${s.id}`);
    });
    (c.contradictions || []).forEach(x => {
      ["id", "a", "b", "who", "reply", "insight"].forEach(f => x[f] || err(cid, `contraddizione ${x.id} senza ${f}`));
      add(x.id, { kind: "x", a: x.a, b: x.b, who: x.who, note: true, lie: !!x.lie });
    });
    if (!(c.contradictions || []).length) err(cid, "serve almeno una contraddizione");
    if (c.bluff && !c.bluff.insight) err(cid, "bluff senza insight");
    const sids = c.suspects.map(s => s.id);
    if (!sids.includes(c.culprit)) err(cid, "culprit non è un sospettato");
    for (const [id, n] of Object.entries(nodes)) {
      if (n.kind === "q") n.req.forEach(r => nodes[r] && nodes[r].note || err(cid, `${id} richiede ${r}, che non esiste o non produce una nota`));
      if (n.kind === "x") {
        [n.a, n.b].forEach(r => nodes[r] && nodes[r].note || err(cid, `contraddizione ${id}: ${r} non esiste o non produce una nota`));
        if (!sids.includes(n.who)) err(cid, `contraddizione ${id}: who non valido`);
      }
    }
    sids.forEach(sid => {
      if (!Object.values(nodes).some(n => n.lie && n.who === sid))
        err(cid, `${sid}: ogni sospettato (anche gli innocenti) deve avere almeno una domanda o contraddizione con lie:true, cioè un segreto che lo fa sembrare colpevole`);
    });
    // Motivo
    if (!c.motive || !Array.isArray(c.motive.options) || c.motive.options.length !== 4 || !(c.motive.correct >= 0 && c.motive.correct < 4))
      err(cid, "serve motive: { options: [4 frasi], correct: 0-3 }");
    // Il testo non deve dare il verdetto al giocatore
    const BAN = [/\bment(e|ono|iva|ito|ire)\b/i, /colpevol/i, /innocen/i, /non colpa/i, /\bbugi[ae]\b/i, /è sincer/i, /è vero\b/i, /il (pianto|dolore) è vero/i, /mentitor/i];
    const lint = (where, t) => { if (t) BAN.forEach(r => { if (r.test(t)) err(cid, `${where} dà il verdetto al giocatore ("${t.match(r)[0]}"): descrivi il fatto, non la conclusione`); }); };
    c.details.forEach(d => lint(`dettaglio ${d.id}`, d.insight));
    c.suspects.forEach(s => { lint(`tell di ${s.id}`, s.tell); s.questions.forEach(q => { lint(`insight ${q.id}`, q.insight); lint(`aside ${q.id}`, q.aside); }); });
    (c.contradictions || []).forEach(x => { lint(`insight ${x.id}`, x.insight); lint(`aside ${x.id}`, x.aside); });
    if (c.bluff) Object.entries(c.bluff.reactions || {}).forEach(([k, v]) => lint(`bluff ${k}`, v));
    // Chiusura dei requisiti
    const closure = (id, acc = { d: new Set(), q: new Set() }) => {
      const n = nodes[id]; if (!n) return acc;
      if (n.kind === "detail") acc.d.add(id);
      if (n.kind === "q") { acc.q.add(id); n.req.forEach(r => closure(r, acc)); }
      if (n.kind === "x") { closure(n.a, acc); closure(n.b, acc); }
      return acc;
    };
    const fits = acc => {
      if (acc.d.size > LIM.eye || acc.q.size > LIM.questions) return false;
      const hard = {};
      acc.q.forEach(q => { if (nodes[q].req.length) hard[nodes[q].who] = (hard[nodes[q].who] || 0) + 1; });
      return Object.values(hard).every(h => h <= LIM.hardPerSuspect);
    };
    if (!Array.isArray(c.key) || !c.key.length) err(cid, "key vuota");
    else {
      c.key.forEach(k => nodes[k] && nodes[k].note || err(cid, `key ${k} non esiste o non produce una nota`));
      if (!c.key.some(k => nodes[k] && fits(closure(k)))) err(cid, "nessuna prova chiave è raggiungibile entro i limiti (4 dettagli, 6 domande, 2 domande d'accusa per sospettato)");
    }
    if (errors === 0) console.log(`✓ ${cid}`);
  }
}
console.log(errors ? `\n${errors} errori` : "\nTutto ok");
process.exit(errors ? 1 : 0);
