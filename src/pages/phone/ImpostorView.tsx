import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Clock, Hourglass, LogOut, Megaphone, Pencil, Trophy, UserCheck, VenetianMask, Vote, WifiOff } from 'lucide-react'
import { doc, getDocFromServer } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useWakeLock } from '../../lib/wakelock'
import { useDoc, useGame, useOfflineBanner, usePlayers, useNow } from '../../lib/hooks'
import { castVote, joinGame, leaveGame, submitWord } from '../../lib/actions'
import { isProfane } from '../../lib/profanity'
import { plural } from '../../lib/util'
import { wordsOf, type Game, type PlayerDoc, type RoleDoc } from '../../lib/types'

const NO_ROLE: RoleDoc = { role: 'crew', word: null, category: '', round: -1 }

export default function ImpostorView(props: { uid: string; nick: string }) {
  const offline = useOfflineBanner()
  return (
    <>
      {offline && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-warn/12 border border-warn/40 px-3 py-2 text-xs font-semibold text-warn">
          <WifiOff className="w-4 h-4 shrink-0" /> Connessione instabile: gli aggiornamenti potrebbero arrivare in ritardo.
        </div>
      )}
      <ImpostorInner {...props} />
    </>
  )
}

function ImpostorInner({ uid, nick }: { uid: string; nick: string }) {
  const { data: game, ready } = useGame()
  const { players } = usePlayers()
  const joined = players.some((p) => p.id === uid)
  const me = players.find((p) => p.id === uid)
  const inGame = game.status === 'reading' || game.status === 'turns' || game.status === 'voting' || game.status === 'reveal'
  const { data: roleRaw } = useDoc<RoleDoc>(joined && inGame ? `impostor/game/roles/${uid}` : null, NO_ROLE)
  const role = roleRaw.round === game.round ? roleRaw : null
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useWakeLock(joined)

  const join = async () => {
    setBusy(true)
    setErr('')
    try { await joinGame(uid, nick) } catch { setErr('Non puoi entrare adesso') } finally { setBusy(false) }
  }

  if (!ready) return <Msg icon={<Hourglass />} title="Carico…" />

  if (!joined) {
    if (game.status === 'lobby' || game.status === 'reveal') {
      return (
        <Msg icon={<VenetianMask />} title="L’impostore" accent>
          <p className="text-muted max-w-xs">Siete già in <b className="text-white">{players.length}</b>. Entra: ti verrà assegnato un numero e una parola segreta.</p>
          <button className="btn btn-primary text-lg px-10 py-4 mt-2" onClick={join} disabled={busy}>Entra nella partita</button>
          {err && <p className="text-bad text-sm">{err}</p>}
        </Msg>
      )
    }
    return <Msg icon={<Hourglass />} title="Partita in corso" text="Aspetta il prossimo giro: potrai entrare appena finisce." />
  }

  if (game.status === 'lobby') {
    return (
      <Msg icon={<UserCheck />} title="Sei dentro" accent>
        <p className="text-muted">Giocatori: <b className="text-white">{players.length}</b></p>
        <p className="text-muted max-w-xs text-sm">Aspetta che l'admin avvii la partita. Non chiudere questa pagina.</p>
        <button className="btn mt-3" onClick={() => leaveGame(uid)}><LogOut className="w-4 h-4" /> Esci dalla partita</button>
      </Msg>
    )
  }

  if (game.status === 'reveal') return <RevealView game={game} uid={uid} voted={me?.vote ?? null} players={players} />
  if (!role || !me?.number) return <LoadingRole />

  if (game.status === 'reading') return <ReadingView key={game.round} role={role} sec={game.readingSec} number={me.number} />
  if (game.status === 'turns') return <TurnsView game={game} number={me.number} category={role.category} uid={uid} words={me.words} />
  return <VotingView uid={uid} me={me.vote} players={players} myNumber={me.number} />
}

function LoadingRole() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000)
    return () => clearTimeout(t)
  }, [])
  return (
    <Msg icon={<Hourglass />} title="Carico il tuo ruolo…" text={slow ? 'Ci sta mettendo troppo: ricarica la pagina per aggiornare l’app.' : undefined}>
      {slow && <button className="btn btn-primary mt-2" onClick={() => window.location.reload()}>Ricarica</button>}
    </Msg>
  )
}

function Msg({ title, text, icon, accent, children }: { title: string; text?: string; icon?: ReactNode; accent?: boolean; children?: ReactNode }) {
  return (
    <div className="flex-1 grid place-content-center justify-items-center text-center gap-3 p-6">
      {icon && <span className="grid place-items-center w-20 h-20 rounded-full bg-brand/15 border border-brand/40 text-ice [&>svg]:w-9 [&>svg]:h-9">{icon}</span>}
      <h1 className={`display text-5xl ${accent ? 'grad-text' : 'text-white'}`}>{title}</h1>
      {text && <p className="text-muted max-w-xs">{text}</p>}
      {children}
    </div>
  )
}

/** Il grande numero del giocatore: serve a farsi riconoscere quando si va davanti agli altri. */
function NumberCard({ number, highlight = false }: { number: number; highlight?: boolean }) {
  return (
    <div className={`w-full rounded-[2rem] border-2 py-7 flex flex-col items-center justify-center transition-colors ${highlight ? 'bg-brand/20 border-ice shadow-[0_0_80px_-20px_rgba(47,147,240,.9)]' : 'bg-surface border-line'}`}>
      <div className="eyebrow text-base">Giocatore</div>
      <div className="display grad-text leading-[.85]" style={{ fontSize: 'min(52vw, 15rem)' }}>{number}</div>
    </div>
  )
}

/** Fase 1: la parola resta visibile per qualche secondo (solo qui), poi compare il numero. */
export function ReadingView({ role, sec, number }: { role: RoleDoc; sec: number; number: number }) {
  const startedAt = useRef(Date.now())
  const now = useNow(100)
  const total = Math.max(3, sec) * 1000
  const left = total - (now - startedAt.current)
  const imp = role.role === 'impostor'

  if (left > 0) {
    return (
      <div className="flex-1 flex flex-col items-center p-4 gap-4">
        <div className="w-full card px-4 py-3 flex items-center justify-between">
          <div>
            <div className="eyebrow text-[.7rem]">Categoria</div>
            <div className="display text-white text-3xl leading-none mt-1">{role.category}</div>
          </div>
          <div className="display tabular text-4xl text-warn">{Math.ceil(left / 1000)}</div>
        </div>
        <div className={`flex-1 w-full rounded-[2rem] border-2 grid place-items-center text-center p-5 ${imp ? 'bg-bad/15 border-bad' : 'bg-brand/15 border-ice'}`} style={{ minHeight: '46vh' }}>
          {imp ? (
            <div className="flex flex-col items-center gap-2">
              <VenetianMask className="w-16 h-16 text-bad" strokeWidth={1.5} />
              <div className="display text-bad text-6xl leading-[.9]">Sei l’impostore</div>
              <div className="mt-3 text-base text-white/80">Categoria: <b className="text-ice">{role.category}</b></div>
              <div className="text-sm text-muted">Non conosci la parola: ascolta gli altri e mimetizzati.</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="eyebrow text-xs">La parola è</div>
              <div className="display grad-text text-[3.8rem] leading-[.95] break-words">{role.word}</div>
              <div className="text-sm text-muted mt-2">Memorizzala: tra pochi secondi sparisce.</div>
            </div>
          )}
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand to-ice" style={{ width: `${Math.max(0, (left / total) * 100)}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center p-4 gap-4">
      <NumberCard number={number} />
      <div className="card p-4 w-full flex items-center gap-3">
        <Clock className="w-5 h-5 text-ice shrink-0" />
        <p className="text-sm text-muted">La parola è sparita. Ricorda il tuo numero e <b className="text-white">aspetta che inizi il giro</b>.</p>
      </div>
    </div>
  )
}

/** Fase 2: i giri. Quando tocca a te vai davanti, dì la parola e mostra il numero. */
export function TurnsView({ game, number, category, uid, words }: { game: Game; number: number; category: string; uid: string; words: Record<string, string> }) {
  const myPos = game.order.indexOf(number)
  const finished = game.turnIndex >= game.order.length
  const mine = !finished && myPos === game.turnIndex
  const done = myPos >= 0 && myPos < game.turnIndex
  const wait = myPos - game.turnIndex
  const current = finished ? null : game.order[game.turnIndex]
  const soon = !finished && wait === 1
  const key = `${game.round}:${game.giro}`
  const [dismissed, setDismissed] = useState('')
  const showCall = mine && dismissed !== key

  // vibrazione: "sei il prossimo" (breve) e "tocca a te" (lunga)
  const buzzed = useRef('')
  useEffect(() => {
    const tag = mine ? `${key}:mine` : soon ? `${key}:soon` : ''
    if (tag && buzzed.current !== tag) {
      buzzed.current = tag
      try { navigator.vibrate?.(mine ? [250, 120, 250, 120, 500] : [150, 80, 150]) } catch { /* ok */ }
    }
  }, [mine, soon, key])

  // vicino al proprio turno si controlla il server ogni 3 secondi, così un ascolto rimasto indietro non fa perdere l'avviso
  useEffect(() => {
    if (finished || wait < 1 || wait > 2) return
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') getDocFromServer(doc(db, 'impostor/game')).catch(() => {})
    }, 3000)
    return () => clearInterval(t)
  }, [finished, wait])

  return (
    <div className="flex-1 flex flex-col items-center p-4 gap-4 pb-8">
      {showCall && <TurnCall number={number} onClose={() => setDismissed(key)} />}

      <div className="w-full flex items-center justify-between">
        <span className="chip">Giro {game.giro}</span>
        <span className="chip">{category}</span>
      </div>

      {mine && (
        <div className="w-full rounded-3xl bg-gradient-to-br from-brand to-indigo p-5 text-center shadow-[0_20px_60px_-20px_rgba(47,147,240,.9)]">
          <Megaphone className="w-9 h-9 mx-auto anim-shake" />
          <div className="display text-white text-5xl mt-1">Tocca a te!</div>
          <p className="text-white/90 text-sm mt-1 font-medium">Vai davanti a tutti, <b>di’ la tua parola</b> e mostra questo numero.</p>
        </div>
      )}

      {soon && (
        <div className="w-full rounded-3xl bg-warn/15 border border-warn/50 p-4 text-center">
          <div className="display text-warn text-4xl leading-none">Sei il prossimo!</div>
          <p className="text-sm text-white/80 mt-1.5">Preparati: dopo il <b>Giocatore {current}</b> tocca a te.</p>
        </div>
      )}

      <NumberCard number={number} highlight={mine} />

      <WordBox key={game.giro} uid={uid} giro={game.giro} saved={words[String(game.giro)]} />

      {!mine && (
        <div className="card p-4 w-full text-center">
          {finished ? (
            <p className="text-sm text-muted">Giro concluso. <b className="text-white">Si decide se fare un altro giro o votare.</b></p>
          ) : done ? (
            <p className="text-sm text-muted flex items-center justify-center gap-2"><Check className="w-4 h-4 text-good" /> Hai già parlato in questo giro. Ora parla il <b className="text-white">Giocatore {current}</b>.</p>
          ) : (
            <>
              <p className="text-sm text-muted">Ora parla il <b className="text-white">Giocatore {current}</b></p>
              {wait > 1 && <p className="text-sm mt-1">Tocca a te tra <b className="text-ice">{wait}</b> {plural(wait, 'giocatore', 'giocatori')}</p>}
              <p className="text-xs text-muted mt-2">Di’ la tua parola solo quando vieni chiamato.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Dopo aver detto la parola a voce, il giocatore la scrive qui e conferma:
 * comparirà sul maxischermo durante il voto (una parola per giro, modificabile finché il giro è aperto).
 */
function WordBox({ uid, giro, saved }: { uid: string; giro: number; saved: string | undefined }) {
  const [val, setVal] = useState(saved ?? '')
  const [editing, setEditing] = useState(!saved)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (saved) {
      setVal(saved)
      setEditing(false)
    }
  }, [saved])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const w = val.trim().replace(/\s+/g, ' ')
    if (!w) return setErr('Scrivi la parola che hai detto')
    if (w.length > 24) return setErr('Massimo 24 caratteri')
    if (isProfane(w)) return setErr('Questa parola non è consentita')
    setBusy(true)
    setErr('')
    try {
      await submitWord(uid, giro, w)
      setEditing(false)
    } catch (ex) {
      const code = (ex as { code?: string }).code
      setErr(code === 'permission-denied' ? 'Non posso salvarla adesso: il giro potrebbe essere chiuso.' : 'Non sono riuscito a salvarla, riprova.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-4 w-full flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold flex items-center gap-2"><Pencil className="w-4 h-4 text-ice" /> La parola che hai detto</div>
        <span className="chip">Giro {giro}</span>
      </div>
      {!editing && saved ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-good/10 border border-good/40 px-4 py-3">
          <div className="min-w-0 flex items-center gap-2">
            <Check className="w-5 h-5 text-good shrink-0" />
            <span className="display text-white text-2xl truncate">{saved}</span>
          </div>
          <button className="btn !py-2 text-sm shrink-0" onClick={() => setEditing(true)}>Modifica</button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <input
            className="input"
            placeholder="Scrivi la parola e conferma"
            maxLength={24}
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="send"
            value={val}
            onChange={(e) => { setVal(e.target.value); setErr('') }}
          />
          {err && <p className="text-bad text-sm">{err}</p>}
          <button className="btn btn-primary py-3" disabled={busy || !val.trim()}>{busy ? 'Salvo…' : 'Conferma'}</button>
          <p className="text-xs text-muted">Comparirà sul maxischermo durante il voto.</p>
        </form>
      )}
    </div>
  )
}

/** Avviso a tutto schermo: tocca a te. Mostra anche il numero da far vedere agli altri. */
function TurnCall({ number, onClose }: { number: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 anim-flash flex flex-col items-center justify-center text-center p-6 gap-5 text-white overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(80vmin 80vmin at 50% 38%, rgba(255,255,255,.22), transparent 70%)' }}>
      <Megaphone className="w-20 h-20 anim-shake" />
      <div>
        <h1 className="display text-[4.4rem] leading-[.9] whitespace-nowrap">Tocca a te</h1>
        <p className="text-lg font-semibold mt-3 text-white/90 max-w-xs">Vai davanti a tutti, di’ la tua parola e mostra questo numero</p>
      </div>
      <div className="rounded-[2rem] bg-white/95 text-brand-deep px-10 py-4 shadow-2xl">
        <div className="eyebrow !text-brand-deep/70 text-sm">Giocatore</div>
        <div className="display leading-[.85]" style={{ fontSize: 'min(42vw, 11rem)' }}>{number}</div>
      </div>
      <button className="btn bg-white !text-brand-deep text-base px-8 py-3.5 shadow-xl hover:!bg-white" onClick={onClose}><Check className="w-5 h-5" /> Ho capito</button>
    </div>
  )
}

/** Fase 3: si vota per numero. */
export function VotingView({ uid, me, players, myNumber }: { uid: string; me: string | null; players: PlayerDoc[]; myNumber: number }) {
  const [busy, setBusy] = useState<string | null>(null)
  const vote = async (target: string) => {
    setBusy(target)
    try { await castVote(uid, me === target ? null : target) } catch { /* ignora */ } finally { setBusy(null) }
  }
  const others = players.filter((p) => p.id !== uid && p.number)
  const chosen = players.find((p) => p.id === me)
  return (
    <div className="p-4 flex flex-col gap-4 pb-10">
      <div className="text-center flex flex-col items-center gap-2 pt-2">
        <span className="grid place-items-center w-14 h-14 rounded-full bg-brand/15 border border-brand/40 text-ice"><Vote className="w-7 h-7" /></span>
        <h1 className="display grad-text text-5xl">Chi è l’impostore?</h1>
        <p className="text-muted text-sm">Vota il numero che sospetti. Tocca di nuovo per togliere il voto.</p>
        <p className="text-xs text-muted">Tu sei il Giocatore {myNumber}</p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {others.map((p) => {
          const on = me === p.id
          return (
            <li key={p.id}>
              <button
                onClick={() => vote(p.id)}
                disabled={busy !== null}
                className={`w-full min-h-[8.5rem] py-3 rounded-3xl border-2 flex flex-col items-center justify-center transition ${on ? 'bg-brand/25 border-ice ring-2 ring-brand' : 'bg-white/[.05] border-line'}`}
              >
                <span className="eyebrow text-xs">Giocatore</span>
                <span className="display text-white text-6xl leading-none mt-1">{p.number}</span>
                {wordsOf(p).length > 0 && <span className="text-xs text-muted mt-1.5 px-2 line-clamp-2 leading-snug">{wordsOf(p).join(' · ')}</span>}
                {on && <Check className="w-5 h-5 text-ice mt-1" />}
              </button>
            </li>
          )
        })}
      </ul>
      {chosen && <p className="text-center text-sm text-muted">Hai votato il <b className="text-white">Giocatore {chosen.number}</b></p>}
    </div>
  )
}

export function RevealView({ game, players, uid, voted }: { game: Game; players: PlayerDoc[]; uid: string; voted: string | null }) {
  const iWasImpostor = game.impostorUids.includes(uid)
  const guessed = voted ? game.impostorUids.includes(voted) : false
  const many = game.impostorUids.length > 1
  const rows = game.impostorNumbers.map((n, i) => ({ n, name: game.impostorNames[i] ?? players.find((p) => p.number === n)?.nickname ?? '' }))
  return (
    <div className="flex-1 grid place-content-center justify-items-center text-center gap-4 p-6">
      <span className="grid place-items-center w-20 h-20 rounded-full bg-brand/15 border border-brand/40 text-ice anim-pop">
        {guessed ? <Trophy className="w-9 h-9" /> : <VenetianMask className="w-9 h-9" />}
      </span>
      <div className="eyebrow text-sm">{many ? 'Gli impostori erano' : 'L’impostore era'}</div>
      <div className="flex flex-col gap-2 anim-pop">
        {(rows.length ? rows : game.impostorNames.map((name) => ({ n: 0, name }))).map((r) => (
          <div key={r.name + r.n} className="display text-bad text-6xl leading-[.95]">
            {r.n ? `Giocatore ${r.n}` : r.name}
            {r.n ? <div className="text-xl text-white/80 normal-case mt-1" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{r.name}</div> : null}
          </div>
        ))}
      </div>
      <div className="eyebrow text-xs mt-3">La parola era</div>
      <div className="display grad-text text-5xl">{game.word}</div>
      {!iWasImpostor && voted && <p className="font-semibold mt-1">{guessed ? 'Hai indovinato!' : 'Stavolta ti ha fregato.'}</p>}
      <p className="text-muted text-sm mt-4">Aspetta la prossima partita…</p>
    </div>
  )
}
