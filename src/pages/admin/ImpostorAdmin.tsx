import { useState } from 'react'
import type { Game, PlayerDoc } from '../../lib/types'
import { expelPlayer, resetLobby, revealRound, startRound, startVoting } from '../../lib/actions'
import { CATEGORIES, RANDOM_CATEGORY_ID } from '../../lib/words'

const STATUS_LABEL: Record<Game['status'], string> = {
  lobby: 'Lobby: i giocatori stanno entrando',
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
    <div className="flex flex-col gap-4">
      <section className="card p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs uppercase tracking-widest text-white/50 font-bold">Partita</h2>
          <span className="rounded-full bg-neon-violet/30 px-3 py-1 text-sm font-bold">{STATUS_LABEL[game.status]}</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-white/70">Categoria</span>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value={RANDOM_CATEGORY_ID}>🎲 Casuale</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label} ({c.words.length} parole)</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-white/70">Durata discussione (minuti)</span>
            <input className="input" type="number" min={1} max={30} value={minutes} onChange={(e) => setMinutes(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-white/70">Impostori</span>
          {[1, 2, 3].map((n) => (
            <button key={n} className={`btn w-12 ${impostors === n ? 'btn-pink' : ''}`} onClick={() => setImpostors(n)}>{n}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            className="btn btn-lime py-4 text-lg"
            disabled={busy || players.length < 3}
            onClick={() => run(() => startRound({ categoryId, impostors, discussionSec: minutes * 60 }))}
          >🆕 Nuova partita</button>
          <button className="btn btn-cyan py-4 text-lg" disabled={busy || game.status !== 'playing'} onClick={() => run(startVoting)}>🗳️ Avvia voto</button>
          <button className="btn btn-pink py-4 text-lg" disabled={busy || (game.status !== 'voting' && game.status !== 'playing')} onClick={() => run(revealRound)}>🎭 Rivela</button>
        </div>
        {players.length < 3 && <p className="text-neon-yellow text-sm">Servono almeno 3 giocatori entrati dal telefono per partire.</p>}
        {err && <p className="text-red-300 text-sm">{err}</p>}
        {game.status !== 'lobby' && game.status !== 'reveal' && game.category && (
          <p className="text-white/60 text-sm">Categoria in gioco: <b className="text-white">{game.category}</b> (la parola resta segreta fino al "Rivela")</p>
        )}
        {game.status === 'reveal' && (
          <p className="text-white/80 text-sm">Impostori: <b className="text-red-300">{game.impostorNames.join(', ')}</b> · parola: <b className="text-neon-lime">{game.word}</b></p>
        )}
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-white/50 font-bold">Giocatori ({players.length})</h2>
          <button className="btn text-xs py-1.5 px-3" disabled={busy} onClick={() => confirm('Svuotare la lobby e rimuovere tutti i giocatori?') && run(resetLobby)}>♻️ Svuota lobby</button>
        </div>
        {players.length === 0 && <p className="text-white/50">Nessun giocatore: devono premere "Entra nella partita" dal telefono.</p>}
        <ul className="grid sm:grid-cols-2 gap-2">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <span className="font-bold truncate flex-1">{p.nickname}</span>
              {game.status === 'voting' && <span className="rounded-full bg-neon-yellow/20 text-neon-yellow px-2 text-sm font-black">{votesFor(p.id)} voti</span>}
              {game.status === 'voting' && <span className="text-xs text-white/50">{p.vote ? '✔ ha votato' : '…'}</span>}
              <button className="btn text-xs px-3 py-1.5" onClick={() => confirm(`Espellere ${p.nickname}?`) && run(() => expelPlayer(p.id))}>Espelli</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
