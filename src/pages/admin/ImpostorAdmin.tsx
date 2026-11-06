import { useState } from 'react'
import { Eye, Play, RotateCcw, UserX, Vote } from 'lucide-react'
import type { Game, PlayerDoc } from '../../lib/types'
import { expelPlayer, resetLobby, revealRound, startRound, startVoting } from '../../lib/actions'
import { CATEGORIES, RANDOM_CATEGORY_ID } from '../../lib/words'

const STATUS_LABEL: Record<Game['status'], string> = {
  lobby: 'Lobby · i giocatori stanno entrando',
  playing: 'Discussione in corso',
  voting: 'Votazione in corso',
  reveal: 'Rivelato',
}

export default function ImpostorAdmin({ game, players }: { game: Game; players: PlayerDoc[] }) {
  const [categoryId, setCategoryId] = useState(RANDOM_CATEGORY_ID)
  const [impostors, setImpostors] = useState(1)
  const [minutes, setMinutes] = useState(3)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setErr('')
    try { await fn() } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const votesFor = (id: string) => players.filter((p) => p.vote === id).length

  return (
    <div className="grid lg:grid-cols-5 gap-5 items-start">
      <section className="lg:col-span-2 card p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="display text-white text-2xl">Partita</h2>
          <span className="chip border-brand/40 bg-brand/15 text-ice">{STATUS_LABEL[game.status]}</span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Categoria</span>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value={RANDOM_CATEGORY_ID}>Casuale</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label} ({c.words.length} parole)</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Durata discussione (minuti)</span>
          <input className="input" type="number" min={1} max={30} value={minutes} onChange={(e) => setMinutes(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Numero di impostori</span>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <button key={n} className={`btn py-3 text-lg ${impostors === n ? 'btn-primary' : ''}`} onClick={() => setImpostors(n)}>{n}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            className="btn btn-success py-3.5 text-base"
            disabled={busy || players.length < 3}
            onClick={() => run(() => startRound({ categoryId, impostors, discussionSec: minutes * 60 }))}
          ><Play className="w-4 h-4" fill="currentColor" /> Nuova partita</button>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-secondary py-3.5" disabled={busy || game.status !== 'playing'} onClick={() => run(startVoting)}><Vote className="w-4 h-4" /> Avvia voto</button>
            <button className="btn btn-primary py-3.5" disabled={busy || (game.status !== 'voting' && game.status !== 'playing')} onClick={() => run(revealRound)}><Eye className="w-4 h-4" /> Rivela</button>
          </div>
        </div>

        {players.length < 3 && <p className="text-warn text-sm rounded-xl bg-warn/10 border border-warn/30 px-3 py-2">Servono almeno 3 giocatori entrati dal telefono.</p>}
        {err && <p className="text-bad text-sm">{err}</p>}
        {game.status !== 'lobby' && game.status !== 'reveal' && game.category && (
          <p className="text-muted text-sm">Categoria in gioco: <b className="text-white">{game.category}</b>. La parola resta segreta fino al «Rivela».</p>
        )}
        {game.status === 'reveal' && (
          <p className="text-sm text-muted rounded-xl bg-white/[.05] border border-line px-3 py-2">Impostori: <b className="text-bad">{game.impostorNames.join(', ')}</b> · Parola: <b className="text-white">{game.word}</b></p>
        )}
      </section>

      <section className="lg:col-span-3 card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="display text-white text-2xl">Giocatori <span className="text-muted">({players.length})</span></h2>
          <button className="btn text-sm py-2 px-3" disabled={busy} onClick={() => confirm('Svuotare la lobby e rimuovere tutti i giocatori?') && run(resetLobby)}><RotateCcw className="w-4 h-4" /> Svuota lobby</button>
        </div>
        {players.length === 0 && <p className="text-muted text-sm rounded-xl bg-white/[.04] border border-line px-4 py-6 text-center">Nessun giocatore: devono premere «Entra nella partita» dal telefono.</p>}
        <ul className="grid sm:grid-cols-2 gap-2">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-2xl bg-white/[.045] border border-line pl-4 pr-2 py-2">
              <span className="font-bold truncate flex-1">{p.nickname}</span>
              {game.status === 'voting' && (
                <>
                  <span className="chip border-warn/40 bg-warn/10 text-warn">{votesFor(p.id)} voti</span>
                  <span className={`text-xs ${p.vote ? 'text-good' : 'text-muted'}`}>{p.vote ? 'ha votato' : '…'}</span>
                </>
              )}
              <button className="btn btn-icon btn-danger" title="Espelli" onClick={() => confirm(`Espellere ${p.nickname}?`) && run(() => expelPlayer(p.id))}><UserX className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
