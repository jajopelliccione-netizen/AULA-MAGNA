# 🎤 Aula Magna · Occupazione 2026 · Galileo Galilei

Web app per l'aula magna durante l'occupazione: **karaoke** + **gioco dell'impostore**, tutto sincronizzato in tempo reale
tra i telefoni dei ragazzi, lo schermo del proiettore e il pannello admin.

| Pagina | Chi la usa | Cosa fa |
|---|---|---|
| `/` | telefoni dei ragazzi | nickname, prenota canzoni, gioca all'impostore |
| `/schermo` | PC del proiettore | video karaoke, QR code, coda, voti, reveal (richiede login admin) |
| `/admin` | chi gestisce la serata | cambia modalità, gestisce coda e partite (richiede login admin) |

**Stack:** React + Vite + TypeScript, Tailwind v4, Firebase (Firestore + Auth), YouTube IFrame Player API + Data API v3, Cloudflare Pages.

---

## 1. Creare il progetto Firebase

1. Vai su <https://console.firebase.google.com> → **Aggiungi progetto** (Google Analytics non serve).
2. **Impostazioni progetto (⚙️) → Le tue app → `</>` Web** → registra l'app (niente Hosting).
   Ti mostra un blocco `firebaseConfig`: servono `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.

## 2. Attivare Authentication e Firestore

1. **Build → Authentication → Inizia → Metodo di accesso**:
   - attiva **Anonimo** (per i ragazzi);
   - attiva **Email/Password** (per l'admin).
2. **Authentication → Impostazioni → Domini autorizzati**: aggiungi il dominio di Cloudflare Pages
   (es. `aula-magna.pages.dev`) e l'eventuale dominio personalizzato. `localhost` c'è già.
3. **Build → Firestore Database → Crea database** → modalità produzione → scegli una regione europea (es. `eur3` o `europe-west`).

## 3. Creare l'utente admin e mettere il suo UID nelle rules

1. **Authentication → Utenti → Aggiungi utente**: email + password robusta (es. `admin@tuascuola.it`).
2. Copia il suo **UID utente** (colonna a destra nella tabella).
3. Apri `firestore.rules` e sostituisci `PASTE_ADMIN_UID_HERE` con l'UID. Per più account (es. uno solo per il
   proiettore) metti più UID: `['UID_ADMIN', 'UID_PROIETTORE']`.
4. Pubblica le rules, in uno di questi due modi:
   - **Console**: Firestore Database → **Regole** → incolla il contenuto di `firestore.rules` → **Pubblica**;
   - **CLI**: `npm i -g firebase-tools && firebase login && firebase use --add && firebase deploy --only firestore:rules`.
5. (Facoltativo) metti lo stesso UID in `VITE_ADMIN_UIDS` per nascondere il pannello ad altri account:
   la sicurezza vera resta nelle rules.

> ℹ️ Lo schermo `/schermo` **fa login con l'account admin**: è lui che manda avanti la coda e scrive lo stato.
> Fai login una volta sul PC del proiettore e il browser se lo ricorda.

### Cosa possono fare i ragazzi (rules)
- creare **una sola** prenotazione (il documento si chiama come il loro UID), solo se le prenotazioni sono aperte e non sono bannati; cancellare solo la propria;
- entrare/uscire dal gioco e votare **solo per sé** (campo `vote` del proprio documento, solo in fase di voto);
- leggere il proprio ruolo/parola **solo** dal proprio documento `impostor/game/roles/{uid}`. La parola e gli impostori veri stanno in `impostor/private` (solo admin) e passano nel documento pubblico solo al "Rivela", quindi leggere il database non permette di barare.
- Solo l'admin scrive `state`, ordine della coda, gioco, ruoli e ban.

## 4. Chiave YouTube Data API v3

1. <https://console.cloud.google.com> → seleziona **lo stesso progetto** di Firebase (o creane uno).
2. **API e servizi → Libreria → YouTube Data API v3 → Abilita**.
3. **API e servizi → Credenziali → Crea credenziali → Chiave API**.
4. Clicca la chiave e limitala:
   - **Limitazioni applicazione → Referrer HTTP (siti web)**: aggiungi `https://aula-magna.pages.dev/*` (e il tuo dominio, e `http://localhost:5173/*` per i test);
   - **Limitazioni API → YouTube Data API v3**.
5. Copiala in `VITE_YOUTUBE_API_KEY`.

> ⚠️ **Quota**: ogni ricerca costa 100 unità e il limite giornaliero gratuito è 10.000 (≈100 ricerche al giorno).
> L'app salva in cache per 24 ore le ricerche già fatte sul telefono e cerca solo quando premi "Cerca".
> Se finisce la quota i ragazzi vedono un avviso e l'admin può comunque aggiungere canzoni a mano (link YouTube).
> Per serate affollate chiedi un aumento quota da Google Cloud → API e servizi → YouTube Data API → Quote.

> ⚠️ Anche la chiave Firebase finisce nel browser: è normale, la protezione sono le rules + i domini autorizzati.

## 5. Provarlo in locale

```bash
npm install
cp .env.example .env     # poi compila i valori
npm run dev
```

Apri:
- `http://localhost:5173/` → telefono (usa la modalità responsive del browser o il telefono sulla stessa wifi: `npm run dev` stampa anche l'indirizzo di rete)
- `http://localhost:5173/schermo` → proiettore (login admin → **Clicca per avviare**)
- `http://localhost:5173/admin` → pannello admin

Test rapido: dall'admin scegli **Karaoke**; dal telefono cerca una canzone e prenota; sullo schermo parte il conto alla rovescia di 10 secondi e poi il video.
Per l'impostore servono almeno 3 telefoni (o 3 finestre in incognito con nickname diversi) che premono "Entra nella partita".

```bash
npm run build      # controllo TypeScript + build in dist/
npm run preview    # prova la build
```

## 6. Deploy su Cloudflare Pages

1. Metti il progetto su GitHub.
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → scegli il repository.
3. Impostazioni di build:
   - **Framework preset**: Vite (o None)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Settings → Variables and Secrets** (Production **e** Preview): aggiungi tutte le variabili di `.env.example`:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_YOUTUBE_API_KEY`, e (facoltative) `VITE_ADMIN_UIDS`, `VITE_PUBLIC_URL`.
   Se serve, aggiungi anche `NODE_VERSION` = `20` o superiore.
5. **Save and Deploy**. Il file `public/_redirects` (`/* /index.html 200`) fa funzionare `/schermo` e `/admin`.
6. Dopo il deploy: aggiungi il dominio `*.pages.dev` ai **domini autorizzati di Firebase Auth** e al **referrer della chiave YouTube** (passi 2 e 4).
7. Le variabili `VITE_` vengono incluse in fase di build: se le cambi, rifai il deploy (Deployments → ⋯ → Retry deployment).
8. Cloudflare pubblica a ogni push sul *Production branch* impostato in Settings → Builds → Branch control. Cambiare ramo non basta: serve un nuovo commit su quel ramo.

Oppure da terminale: `npm run build && npx wrangler pages deploy dist --project-name aula-magna`.

## Come si usa la serata

1. PC del proiettore: apri `/schermo`, accedi, premi **Clicca per avviare** (schermo intero + audio sbloccato).
2. Dal telefono/PC admin apri `/admin` e scegli la modalità: **Lobby → Karaoke / Impostore → Pausa**.
3. **Karaoke**: la coda avanza da sola (fine video → 10 secondi di "Prossimo" → parte il successivo). L'admin può mettere in pausa, saltare, regolare il volume, riordinare trascinando ⠿, eliminare, aggiungere a mano, bloccare le prenotazioni, bannare un nickname.
   Quando tocca a un ragazzo il suo telefono mostra a schermo intero **TOCCA A TE! Vai sul palco** (e vibra).
4. **Impostore**: i ragazzi premono "Entra nella partita" → l'admin sceglie categoria (o casuale), impostori (1–3), durata → **Nuova partita** → **Avvia voto** → **Rivela**. Per un altro giro basta di nuovo **Nuova partita** (restano gli stessi giocatori; "Svuota lobby" li rimuove). Gli impostori vedono "SEI L'IMPOSTORE" + categoria, gli altri la parola, tenendo premuto.

## Brand e logo

Titolo e nome della scuola sono in `src/lib/brand.ts`. Il logo è `public/logo.png` (icona dell'ingranaggio, usata anche come icona della scheda; `public/logo-full.png` è la versione con la scritta):
Per cambiarlo sostituisci il file (stesso nome) oppure modifica `BRAND.logo`. I colori del tema sono in `src/index.css` (blocco `@theme`).

## Note tecniche

- **Presenza**: ogni telefono scrive un "battito" in `presence/{uid}` ogni 60 s mentre la pagina è visibile; è "online" chi ha battito negli ultimi 150 s. Con 200 telefoni sono ~12.000 scritture all'ora: oltre il piano gratuito (20.000/giorno) servirebbe il piano Blaze, che costa pochi centesimi per una serata.
- **Rete scolastica**: Firestore usa il long-polling automatico se i WebSocket sono bloccati.
- **Velocità del telefono**: la pagina `/` è un bundle piccolo; `/schermo`, `/admin`, il QR code e il drag&drop vengono caricati solo sulle loro pagine.
- **Filtro parolacce**: `src/lib/profanity.ts` (gestisce anche scritture tipo `c4zz0`); i titoli YouTube volgari non vengono mostrati né prenotabili.
- **Struttura dati**: `state/current`, `queue/{id}`, `impostor/game`, `impostor/game/players/{uid}`, `impostor/game/roles/{uid}` (privato), `impostor/private` (admin), `presence/{uid}`, `banned/{id}`.
