# 🎤 Aula Magna · Occupazione 2026 · Galileo Galilei

Web app per l'aula magna durante l'occupazione: **karaoke** + **gioco dell'impostore**, tutto sincronizzato in tempo reale
tra i telefoni dei ragazzi, lo schermo del proiettore e il pannello admin.

| Pagina | Chi la usa | Cosa fa |
|---|---|---|
| `/` | telefoni dei ragazzi | nickname, prenota canzoni, gioca all'impostore |
| `/schermo` | PC del proiettore | video karaoke con la coda, QR code, voti, reveal (richiede login) |
| `/gobbo` | schermo per chi canta | **solo** il video con il testo, a tutto schermo, senza coda (richiede login) |
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
- creare **una sola** richiesta di canzone (il documento si chiama come il loro UID), solo se le richieste sono aperte e non sono bannati; la richiesta nasce sempre «in attesa» (`pending`) e **solo l'admin può approvarla**; cancellare solo la propria;
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

## Modalità e approvazione delle canzoni

Le modalità dello schermo sono **Lobby, Karaoke, Musica, Impostore, Pausa**.
- **Karaoke**: i ragazzi cercano solo basi karaoke con testo e si iscrivono; si forma la coda e chi tocca va sul palco.
- **Musica**: i ragazzi propongono musica normale a scelta (non karaoke); le canzoni partono sul proiettore una dopo l'altra, senza palco.
- In **entrambe** una canzone **non entra in coda finché un admin non la approva**: ogni richiesta compare nella sezione **Da approvare** del pannello (con anteprima su YouTube, **Approva**, **Rifiuta** e **Approva tutte**; il numero di richieste in attesa è anche nel titolo della scheda del browser). Il telefono del ragazzo mostra «In attesa di approvazione», poi la posizione in coda oppure «Non approvata». Le canzoni aggiunte dall'admin vanno direttamente in coda: l'admin le **cerca come fanno i ragazzi** (titolo e artista, con il filtro «solo basi karaoke» attivabile/disattivabile) e preme **Aggiungi**; in alternativa può incollare un link YouTube. Il nome di chi canta si può scrivere o lasciare «Admin».
- **Avvio e riproduzione**: quando entri in Karaoke o Musica **non riparte nulla da solo**. La canzone che suonava prima resta in pausa (la riprendi tu con *Riprendi*) e la coda resta ferma: nel pannello vedi la prossima canzone e il pulsante **Avvia la canzone**, quindi scegli tu quando parte la prima.
  - **Riproduzione automatica** (interruttore nelle Impostazioni): dopo il primo avvio le canzoni partono da sole, con il conto alla rovescia tra una e l'altra.
  - **Riproduzione manuale**: ogni canzone resta «in attesa» e parte solo quando premi **Avvia la canzone** (il cantante viene comunque avvisato sul telefono che è il prossimo).
  - Qualunque sia la modalità, una canzone entra in coda solo se un admin l'ha approvata.
- **Approvazione automatica** (interruttore nelle Impostazioni, separato per Karaoke e per Musica): con l'interruttore acceso le richieste entrano in coda da sole, in ordine di arrivo, e l'admin può sempre toglierle dalla coda. Se lo accendi, entrano subito anche quelle già in attesa. L'approvazione la fanno il pannello admin e il proiettore, quindi serve che almeno uno dei due sia aperto (con tutti e due aperti non c'è conflitto). Nessuna modifica alle regole di Firestore.
- Si può avere una sola richiesta alla volta. L'ordine in coda è quello di approvazione.
- **Priorità ai ragazzi**: le canzoni messe dall'admin sono un riempitivo e stanno **sempre dopo** quelle di chi prenota dal QR, anche se sono state aggiunte prima. Chi prenota dal QR passa davanti alle canzoni dell'admin; le canzoni dell'admin restano in ordine tra loro. Trascinando una canzone nella coda l'admin può comunque spostarla a mano: si sposta solo quella, le altre non cambiano.
- Passando da Karaoke a Musica (o viceversa) con un brano in corso, il brano interrotto torna nella sua coda: chi stava cantando non perde il turno. Il gobbo mostra solo il karaoke.

## I tre schermi

- **Admin** (`/admin`): pannello di controllo, dal telefono o dal PC.
- **Proiettore** (`/schermo`): video + coda + QR. È lui che manda avanti la coda: tienilo sempre aperto durante il karaoke.
- **Gobbo** (`/gobbo`): stesso video, solo testo, nessuna coda. Segue lo schermo in automatico e si riallinea da solo se scarta più di ~1 secondo.
  Di default **non emette audio** (esce solo dal proiettore): dall'admin puoi attivare «Audio anche sul gobbo».

`/admin`, `/schermo` e `/gobbo` chiedono email e password. Possono usare tutti lo stesso account admin. Se vuoi account separati,
crea altri utenti in Firebase Authentication e aggiungi i loro UID sia in `firestore.rules` sia in `VITE_ADMIN_UIDS`.
Per sicurezza, in Firebase → Authentication → Impostazioni → **Azioni dell'utente** disattiva «Abilita creazione (registrazione)»:
così nessuno può crearsi un account con email e password.

## Le parole dette (impostore)

Dopo aver detto la parola a voce, il giocatore la **scrive sul telefono e conferma** (una parola per giro, modificabile finché il giro è aperto, massimo 24 caratteri, filtro parolacce). Le parole compaiono:
- sul **proiettore** durante il voto, scritte **sopra la barra** di ogni giocatore: il testo è chiaro sulla parte vuota e **cambia colore dove passa la barra** (anche a metà lettera mentre si anima);
- sul **telefono** di chi vota, sotto il numero di ogni giocatore;
- nel **pannello admin**, accanto a ogni giocatore, con una ✕ per togliere dallo schermo una parola inappropriata.
Si azzerano a ogni «Nuova partita». Le regole Firestore permettono di scrivere **solo la propria parola del giro corrente** (nessun altro campo, nessun altro giocatore) e sono verificate da 81 controlli automatici.

## Avvisi puntuali sui telefoni

- **Impostore**: chi deve parlare riceve «Tocca a te!» a schermo intero, con il suo numero grande da mostrare agli altri; chi parla dopo riceve «Sei il prossimo!». Vicino al proprio turno il telefono controlla il server ogni 3 secondi, così un ascolto rimasto indietro non fa perdere l'avviso.
- Durante il gioco (e con una richiesta di canzone in corso) lo **schermo resta acceso**: un telefono in stand-by riceve gli aggiornamenti in ritardo.
- Se la connessione è assente da più di 4 secondi compare «Connessione instabile».

## Comandi touch sullo schermo (LIM)

Dal pannello admin, nel riquadro «Cosa mostra lo schermo», l'interruttore **Comandi touch sullo schermo (LIM)** fa gestire i giochi direttamente dal proiettore, senza passare dall'admin:
- Compare una **barra fissa in basso** e il gioco si rimpicciolisce un po' per farle spazio: la barra **non copre mai** nulla di ciò che è in scena.
  - *Lobby / Pausa*: tasti Karaoke, Musica, L'impostore.
  - *Karaoke / Musica*: Avvia la canzone, Pausa/Riprendi, Salta, Da capo, Giochi (torna alla scelta).
  - *L'impostore*: scelta di categoria e numero di impostori, Inizia la partita, Inizia il primo giro, Prossimo giocatore (e Indietro), Altro giro o Si vota, Mostra il risultato, Nuova partita.
- Ogni azione fatta dallo schermo compare nell'**Attività** del pannello admin con autore «Schermo». Con l'interruttore spento lo schermo è solo da guardare. Va d'accordo con la modalità LIM bloccata.

## Più schermi / LIM insieme (audio sincronizzato)

Su **un solo** schermo apri `/schermo` normalmente: è quello che comanda coda e video. Su **tutti gli altri** apri `/schermo?secondo` oppure, nella schermata «Clicca per avviare», spunta **Secondo schermo** (il dispositivo se lo ricorda). I secondi schermi:
- non toccano mai la coda (niente avanzamenti doppi);
- partono con lo stesso brano e si riallineano di continuo al principale (controllo cinque volte al secondo): gli scarti si correggono con un solo salto preciso, che tiene conto del tempo di ripartenza del video (mai accelerando o rallentando, che farebbe suonare la voce veloce o a scatti);
- hanno l'audio acceso, quindi con due LIM in stanze diverse si sente la stessa musica insieme.

Nelle prove (lettore simulato, orologi sfasati di secondi e velocità diverse) lo scarto medio è sotto 60 ms. Con YouTube vero dipende da rete e dispositivo; se le due LIM sono nella stessa stanza e sentite un leggero «eco», abbassate l'audio di una delle due.

## Schermi collegati e nomi (nel pannello admin)

Ogni schermo (proiettore, secondo schermo, gobbo) segnala di essere acceso. Nel pannello admin, sotto «Cosa mostra lo schermo», la sezione **Schermi collegati** li elenca **uno per uno** (Acceso/Spento, ruolo, se è in modalità LIM) e permette di dare a ciascuno il **suo nome** (es. «LIM 1ª B»): quel nome compare solo su quello schermo. Uno schermo spento da più di un minuto risulta «Spento» e si può togliere dall'elenco col cestino. Non serve ripubblicare le regole Firestore: i dati stanno in `state/screen-<codice>`, dove gli admin possono già scrivere.

## Modalità LIM (schermo bloccato)

Per un proiettore su una **LIM touch** così nessuno può uscire dall'app e rovinare coda o gioco:
1. Apri `/schermo` (o `/gobbo`) sulla LIM con l'indirizzo **`/schermo?lim=1`** (o spunta «Modalità LIM» nella schermata iniziale: la scelta resta salvata) e premi **Clicca per avviare**.
2. Lo schermo va a tutto schermo e **non si esce toccando**: tasto indietro, F5, F11, Esc, Ctrl+R, menu del tocco lungo, zoom e gesti a due dita sono bloccati. Se qualcuno riesce comunque a uscire dal tutto schermo compare «Schermo bloccato» e un tocco lo ripristina.
3. **Solo l'admin può sbloccare**: tenendo premuto 2,5 secondi l'angolo in alto a sinistra e inserendo la **password dell'account admin**, oppure da qualsiasi altro dispositivo con **Schermi → Sblocca schermo LIM** nel pannello admin. Dopo lo sblocco compare un piccolo «Blocca di nuovo».

**LIM Android** (il caso più comune): Chrome per Android supporta il tutto schermo, ma i tasti di sistema (Home, Recenti, barra della LIM) non si possono bloccare da una pagina web. Per un blocco totale:
- usa **Fully Kiosk Browser** (app gratuita per Android, modalità chiosco con pagina iniziale fissa e uscita protetta da PIN): impostala su `https://aulamagna2026.pages.dev/schermo?lim=1`, oppure
- attiva **Fissa app / Blocco schermo** di Android (Impostazioni → Sicurezza, il nome varia): apri Chrome sulla pagina, poi da «Recenti» tocca l'icona dell'app e scegli «Fissa». Si esce solo con il PIN o con la combinazione di tasti del sistema.

Limite: una pagina web non può bloccare il sistema operativo (chiudere il browser dalla barra della LIM, ecc.). Per un blocco totale usa anche il **chiosco del browser**, ad esempio su Windows: `chrome.exe --kiosk --app=https://aulamagna2026.pages.dev/schermo?lim=1` (la LIM va poi lasciata con l'account in modalità chiosco/accesso assegnato, così senza tastiera non si esce).

## Audio su iPad / iPhone

Safari su iPad e iPhone blocca l'avvio automatico dei video con l'audio. Per il proiettore è meglio un **computer con Chrome** (dopo il clic su «Clicca per avviare» tutto parte da solo). Ogni canzone **parte subito, in muto** (l'avvio muto è permesso da tutti i browser) e l'app prova a riattivare l'audio: sul computer succede da solo; su iPad compare un grande pulsante **«Tocca per attivare l'audio»** e basta un tocco (spesso solo per la prima canzone). Su iOS inoltre il volume non si regola dal sito (si usano i tasti dell'iPad o l'impianto audio).

## Come si usa la serata

1. PC del proiettore: apri `/schermo`, accedi, premi **Clicca per avviare** (schermo intero + audio sbloccato). Sul PC del gobbo apri `/gobbo` e fai lo stesso.
2. Dal telefono/PC admin apri `/admin` e scegli la modalità: **Lobby → Karaoke / Impostore → Pausa**.
3. **Karaoke** e **Musica**: la coda avanza da sola (fine video → 10 secondi di "Prossimo" → parte il successivo). L'admin può mettere in pausa, **ricominciare la canzone da capo**, saltare, regolare il volume, riordinare trascinando ⠿, eliminare, aggiungere a mano, bloccare le prenotazioni, bannare un nickname.
   Quando tocca a un ragazzo il suo telefono mostra a schermo intero **TOCCA A TE! Vai sul palco** (e vibra).
4. **Impostore** (a numeri e a giri):
   1. I ragazzi premono **Entra nella partita**.
   2. L'admin sceglie categoria (o casuale), numero di impostori (1–3) e i secondi di lettura (5/8/10/15), poi **Nuova partita**: ogni giocatore riceve un **numero a caso** («Giocatore 7»).
   3. Sul telefono compare la parola (agli impostori «SEI L'IMPOSTORE» + categoria) per i secondi scelti, poi sparisce e resta **solo il numero**. Lo schermo mostra il conto alla rovescia.
   4. L'admin preme **Inizia il 1° giro**: i giocatori vengono chiamati uno alla volta in ordine casuale. Lo schermo mostra «Ora parla il Giocatore N»; sul telefono di chi tocca compare **«Tocca a te!»** (e vibra). Va davanti a tutti, **dice la sua parola e mostra il numero** sul telefono. L'admin passa al giocatore dopo con **Prossimo** (o torna con **Indietro**).
   5. A giro concluso lo schermo lo dice: se i ragazzi vogliono continuare l'admin preme **Altro giro** (nuovo ordine casuale, stessi numeri), altrimenti **Avvia voto**.
   6. Ognuno **vota dal telefono scegliendo un numero**; sullo schermo le barre dei voti si aggiornano in diretta.
   7. **Rivela**: animazione con numero e nome dell'impostore e la parola. Per ripartire con gli stessi giocatori basta di nuovo **Nuova partita** («Svuota lobby» li rimuove tutti).
   Nel gioco lo schermo mostra solo numeri (mai nickname) così nessuno è riconoscibile dal nome; i nickname li vede solo l'admin.

## Pannello admin da telefono

Il pannello è pensato per essere usato comodamente anche da smartphone:
- **Barra in basso** con le tre sezioni (Karaoke, Musica, Impostore) e il numero di richieste da approvare.
- **Comandi sempre a portata di pollice**: una barra fissa sopra la navigazione mostra la canzone sul palco con Pausa/Riprendi e Salta (o Avvia), oppure nell'impostore il giocatore che sta parlando con Indietro/Prossimo, Altro giro, Avvia voto e Rivela.
- Sezioni **ordinate per importanza**: prima le richieste da approvare, poi il palco, la coda, le impostazioni, l'aggiunta a mano e i ban.
- Il **menu** (☰ in alto) contiene il tuo nome, l'attività degli altri admin, i link a proiettore e gobbo e l'uscita.
- Su tablet e computer il layout passa a due colonne con tutti i comandi in barra.

## Più admin insieme

Il pannello è sempre in tempo reale su qualsiasi dispositivo: se un admin aggiunge una canzone, cambia modalità, fa avanzare il giro dell'impostore o cambia le impostazioni di «Nuova partita», tutti gli altri pannelli (e schermi e telefoni) lo vedono subito.
- In alto c'è il **tuo nome** (salvato sul dispositivo): quando fai un'azione gli altri admin vedono un avviso a comparsa, tipo «Marco ha aggiunto «Albachiara» in coda», e il pulsante **Attività** mostra l'elenco delle ultime azioni di tutti.
- L'indicatore **In tempo reale / Offline** avvisa se un dispositivo ha perso la connessione (e i dati potrebbero essere vecchi): si ricollega da solo.
- Se esce una nuova versione del sito compare «Aggiorna» (admin e telefoni); proiettore e gobbo si ricaricano da soli appena non c'è un brano o una partita in corso.
- Se due admin premono lo stesso tasto insieme (es. «Prossimo») il giocatore avanza una volta sola.

## Parole: niente ripetizioni

Ogni parola ricorda quando è uscita l'ultima volta (la memoria sta in `impostor/private`, leggibile solo dall'admin, e si pulisce da sola dopo 7 giorni):
- **entro 8 ore** la stessa parola non può uscire di nuovo;
- **tra 8 e 48 ore** può tornare, con una probabilità che cresce piano piano;
- **oltre 48 ore** (o se non è mai uscita) ha la probabilità piena.

Con la categoria «Casuale» le categorie con più parole «fresche» sono più probabili e quella dell'ultima partita meno. Nel pannello admin vedi quante parole sono disponibili ora e puoi **Azzerare** la memoria. Le soglie sono `REST_MS` e `FULL_MS` in `src/lib/words.ts`.

## Brand e logo

Titolo e nome della scuola sono in `src/lib/brand.ts`. Il logo è `public/logo.png` (icona dell'ingranaggio, usata anche come icona della scheda; `public/logo-full.png` è la versione con la scritta):
Per cambiarlo sostituisci il file (stesso nome) oppure modifica `BRAND.logo`. I colori del tema sono in `src/index.css` (blocco `@theme`).

## Note tecniche

- **Presenza**: ogni telefono scrive un "battito" in `presence/{uid}` ogni 60 s mentre la pagina è visibile; è "online" chi ha battito negli ultimi 150 s. Con 200 telefoni sono ~12.000 scritture all'ora: oltre il piano gratuito (20.000/giorno) servirebbe il piano Blaze, che costa pochi centesimi per una serata.
- **Rete scolastica**: Firestore usa il long-polling automatico se i WebSocket sono bloccati.
- **Velocità del telefono**: la pagina `/` è un bundle piccolo; `/schermo`, `/admin`, il QR code e il drag&drop vengono caricati solo sulle loro pagine.
- **Filtro parolacce**: `src/lib/profanity.ts` (gestisce anche scritture tipo `c4zz0`); i titoli YouTube volgari non vengono mostrati né prenotabili.
- **Struttura dati**: `state/current`, `queue/{id}`, `impostor/game`, `impostor/game/players/{uid}` (nickname, numero, voto), `impostor/game/roles/{uid}` (privato), `impostor/private` (admin), `presence/{uid}`, `banned/{id}`.
