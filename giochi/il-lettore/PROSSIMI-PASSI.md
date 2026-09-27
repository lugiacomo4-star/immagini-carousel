# Il Lettore: immagini con Higgsfield

Da fare in una sessione nuova, dopo aver configurato l'ambiente:

1. Variabili d'ambiente: `HF_API_KEY_ID` e `HF_API_KEY_SECRET` (dal pannello API di Higgsfield).
2. Accesso di rete: `api.higgsfield.ai` tra i domini consentiti (servono anche i domini da cui si scaricano le immagini; lo script dice quale host viene bloccato).

Poi, dalla cartella `giochi/il-lettore`:

```
node tools/genera-immagini.mjs stima   # costo, non spende nulla: mostrarlo a Giacomo e aspettare l'ok
node tools/genera-immagini.mjs prova   # 6 immagini per fissare lo stile, circa $0,10
node tools/genera-immagini.mjs tutto   # solo quelle che mancano, circa $1,70 per tutte
node tools/build.js                    # inserisce le immagini in cases.js
```

Regola: prima di ogni generazione mostrare il costo stimato e aspettare conferma.

Pubblicazione: ripubblicare `index.html` sullo stesso artifact (https://claude.ai/artifact/EYUi9EpBwaUwS3HdX5ypbE) passando in `files` anche `cases.js` e ogni file di `img/`.

Lo stile (noir mediterraneo, luce ambra, ombre verde petrolio) è nella costante `STYLE` dello script. Se il nome di un modello non risponde (404), controllare l'endpoint esatto sulla pagina del modello in open.higgsfield.ai e aggiornare `MODELS`.
