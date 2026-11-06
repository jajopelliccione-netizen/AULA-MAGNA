import { useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Play, RotateCcw, RotateCw, UserX, Vote } from 'lucide-react'
import type { Game, PlayerDoc } from '../../lib/types'
import { expelPlayer, moveTurn, nextGiro, resetLobby, resetWordHistory, revealRound, startRound, startTurns, startVoting } from '../../lib/actions'
import { CATEGORIES, RANDOM_CATEGORY_ID, availability, type WordHistory } from '../../lib/words'
import { useDoc } from '../../lib/hooks'

const STATUS_LABEL: Record<Game['status'], string> = {
  lobby: 'Lobby · i giocatori stanno entrando',
  reading: 'I giocatori leggono la parola',
  turns: 'Giri in corso',
  voting: 'Votazione in corso',
  reveal: 'Rivelato',
}

export default function ImpostorAdmin({ game, players, serverNow }: { game: Game; players: PlayerDoc[]; serverNow: () => number }) {
  const [categoryId, setCategoryId] = useState(RANDOM_CATEGORY_ID)
  const [impostors, setImpostors] = useState(1)
  const [readingSec, setReadingSec] = useState(8)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setErr('')
    try { await fn() } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const { data: priv } = useDoc<{ history?: WordHistory }>('impostor/private', {})
  const avail = availability(categoryId, priv.history ?? {}, serverNow())
  const byNumber = (n: number) => players.find((p) => p.number === n)
  const votesFor = (id: string) => players.filter((p) => p.vote === id).length
  const finished = game.turnIndex >= game.order.length
  const current = finished ? null : game.order[game.turnIndex]
  const canConfigure = game.status === 'lobby' || game.status === 'reveal'

  return (
    <div className="grid lg:grid-cols-5 gap-5 items-start">
      <section className="lg:col-span-2 card p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="display text-white text-2xl">Partita</h2>
          <span className="chip border-brand/40 bg-brand/15 text-ice">{STATUS_LABEL[game.status]}</span>
        </div>

        {/* ---------- impostazioni (tra una partita e l'altra) ---------- */}
        {canConfigure && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Categoria</span>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value={RANDOM_CATEGORY_ID}>Casuale</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label} ({c.words.length} parole)</option>
                ))}
              </select>
            </label>

            <p className="text-xs text-muted -mt-2 flex items-center justify-between gap-2">
              <span>Parole disponibili ora: <b className="text-white">{avail.free}</b> su {avail.total}{avail.free < avail.total && ' (le altre sono uscite da poco)'}</span>
              <button className="underline underline-offset-2 hover:text-white" onClick={() => confirm('Azzerare la memoria delle parole uscite? Tutte torneranno disponibili.') && run(resetWordHistory)}>Azzera</button>
            </p>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Numero di impostori</span>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((n) => (
                  <button key={n} className={`btn py-3 text-lg ${impostors === n ? 'btn-primary' : ''}`} onClick={() => setImpostors(n)}>{n}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Secondi per leggere la parola</span>
              <div className="grid grid-cols-4 gap-2">
                {[5, 8, 10, 15].map((n) => (
                  <button key={n} className={`btn py-3 ${readingSec === n ? 'btn-primary' : ''}`} onClick={() => setReadingSec(n)}>{n}s</button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-success py-3.5 text-base"
              disabled={busy || players.length < 3}
              onClick={() => run(() => startRound({ categoryId, impostors, readingSec }, serverNow()))}
            ><Play className="w-4 h-4" fill="currentColor" /> Nuova partita</button>
            {players.length < 3 && <p className="text-warn text-sm rounded-xl bg-warn/10 border border-warn/30 px-3 py-2">Servono almeno 3 giocatori entrati dal telefono.</p>}
          </>
        )}

        {/* ---------- lettura della parola ---------- */}
        {game.status === 'reading' && (
          <>
            <p className="text-sm text-muted">La parola è sui telefoni per <b className="text-white">{game.readingSec} secondi</b>, poi compare il numero. Categoria: <b className="text-white">{game.category}</b>.</p>
            <button className="btn btn-primary py-3.5 text-base" disabled={busy} onClick={() => run(startTurns)}><Play className="w-4 h-4" fill="currentColor" /> Inizia il 1° giro</button>
          </>
        )}

        {/* ---------- giri ---------- */}
        {game.status === 'turns' && (
          <>
            <div className="rounded-2xl bg-brand/12 border border-brand/35 p-4 text-center">
              <div className="eyebrow text-xs">Giro {game.giro}</div>
              {finished ? (
                <div className="display text-white text-3xl mt-1">Giro concluso</div>
              ) : (
                <>
                  <div className="display grad-text text-6xl mt-1 leading-none">Giocatore {current}</div>
                  <div className="text-sm text-muted mt-1">{current ? byNumber(current)?.nickname : ''} · {game.turnIndex + 1} di {game.order.length}</div>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn py-3.5" disabled={busy || game.turnIndex <= 0} onClick={() => run(() => moveTurn(game, -1))}><ChevronLeft className="w-5 h-5" /> Indietro</button>
              <button className="btn btn-primary py-3.5" disabled={busy || finished} onClick={() => run(() => moveTurn(game, 1))}>Prossimo <ChevronRight className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className={`btn py-3.5 ${finished ? 'btn-success' : ''}`} disabled={busy} onClick={() => run(() => nextGiro(game.giro))}><RotateCw className="w-4 h-4" /> Altro giro</button>
              <button className="btn btn-secondary py-3.5" disabled={busy} onClick={() => run(startVoting)}><Vote className="w-4 h-4" /> Avvia voto</button>
            </div>
          </>
        )}

        {/* ---------- voto / reveal ---------- */}
        {game.status === 'voting' && (
          <button className="btn btn-primary py-3.5 text-base" disabled={busy} onClick={() => run(revealRound)}><Eye className="w-4 h-4" /> Rivela</button>
        )}
        {(game.status === 'turns' || game.status === 'reading') && (
          <button className="btn btn-danger py-2.5 text-sm" disabled={busy} onClick={() => confirm('Rivelare subito impostore e parola?') && run(revealRound)}><Eye className="w-4 h-4" /> Rivela subito</button>
        )}

        {err && <p className="text-bad text-sm">{err}</p>}
        {game.status === 'reveal' && (
          <p className="text-sm text-muted rounded-xl bg-white/[.05] border border-line px-3 py-2">
            Impostori: <b className="text-bad">{game.impostorNumbers.map((n, i) => `Giocatore ${n} (${game.impostorNames[i] ?? ''})`).join(', ')}</b> · Parola: <b className="text-white">{game.word}</b>
          </p>
        )}
      </section>

      <section className="lg:col-span-3 card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="display text-white text-2xl">Giocatori <span className="text-muted">({players.length})</span></h2>
          <button className="btn text-sm py-2 px-3" disabled={busy} onClick={() => confirm('Svuotare la lobby e rimuovere tutti i giocatori?') && run(resetLobby)}><RotateCcw className="w-4 h-4" /> Svuota lobby</button>
        </div>
        {players.length === 0 && <p className="text-muted text-sm rounded-xl bg-white/[.04] border border-line px-4 py-6 text-center">Nessun giocatore: devono premere «Entra nella partita» dal telefono.</p>}
        <ul className="grid sm:grid-cols-2 gap-2">
          {players.map((p) => {
            const speaking = game.status === 'turns' && !!p.number && p.number === current
            return (
              <li key={p.id} className={`flex items-center gap-2.5 rounded-2xl border pl-2 pr-2 py-2 ${speaking ? 'bg-brand/20 border-brand ring-1 ring-brand' : 'bg-white/[.045] border-line'}`}>
                <span className="display grid place-items-center w-10 h-10 rounded-xl bg-white/[.07] text-ice text-2xl shrink-0">{p.number ?? '–'}</span>
                <span className="font-bold truncate flex-1">{p.nickname}</span>
                {game.status === 'voting' && (
                  <>
                    <span className="chip border-warn/40 bg-warn/10 text-warn">{votesFor(p.id)} voti</span>
                    <span className={`text-xs ${p.vote ? 'text-good' : 'text-muted'}`}>{p.vote ? 'ha votato' : '…'}</span>
                  </>
                )}
                <button className="btn btn-icon btn-danger" title="Espelli" onClick={() => confirm(`Espellere ${p.nickname}?`) && run(() => expelPlayer(p.id))}><UserX className="w-4 h-4" /></button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
