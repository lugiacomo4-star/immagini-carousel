# Il Lettore: immagini con Higgsfield

Da fare in una sessione nuova, dopo aver configurato l'ambiente:

1. Nell'ambiente cloud, sezione "API credentials": credenziale su `api.higgsfield.ai`, header `Authorization`, prefisso `Key`, valore `KEY_ID:KEY_SECRET`. Il proxy la aggiunge alle richieste: nessuna variabile d'ambiente serve.
2. Se il download delle immagini viene bloccato, lo script stampa l'host: va aggiunto ai domini consentiti (Network access → Custom).

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
