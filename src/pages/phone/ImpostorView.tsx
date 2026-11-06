import { useEffect, useState } from 'react'
import { useDoc, useGame, usePlayers, useNow } from '../../lib/hooks'
import { castVote, joinGame, leaveGame } from '../../lib/actions'
import { fmtClock } from '../../lib/util'
import type { RoleDoc } from '../../lib/types'

const NO_ROLE: RoleDoc = { role: 'crew', word: null, category: '', round: -1 }

export default function ImpostorView({ uid, nick }: { uid: string; nick: string }) {
  const { data: game, ready } = useGame()
  const { players } = usePlayers()
  const joined = players.some((p) => p.id === uid)
  const me = players.find((p) => p.id === uid)
  const needRole = joined && game.status !== 'lobby'
  const { data: roleRaw } = useDoc<RoleDoc>(needRole ? `impostor/game/roles/${uid}` : null, NO_ROLE)
  const role = roleRaw.round === game.round ? roleRaw : null
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const join = async () => {
    setBusy(true)
    setErr('')
    try { await joinGame(uid, nick) } catch { setErr('Non puoi entrare adesso') } finally { setBusy(false) }
  }

  if (!ready) return <Msg title="Carico…" />

  if (!joined) {
    if (game.status === 'lobby' || game.status === 'reveal') {
      return (
        <div className="flex-1 grid place-content-center justify-items-center text-center gap-4 p-6">
          <div className="text-7xl">🕵️</div>
          <h1 className="text-3xl font-black text-neon-pink text-glow-pink">Gioco dell'impostore</h1>
          <p className="text-white/70 max-w-xs">Siete in {players.length}. Entra per ricevere la tua parola segreta quando parte la partita.</p>
          <button className="btn btn-pink text-xl px-10 py-4" onClick={join} disabled={busy}>Entra nella partita</button>
          {err && <p className="text-red-300 text-sm">{err}</p>}
        </div>
      )
    }
    return <Msg emoji="⏳" title="Partita in corso" text="Aspetta il prossimo giro: potrai entrare appena finisce." />
  }

  if (game.status === 'lobby') {
    return (
      <div className="flex-1 grid place-content-center justify-items-center text-center gap-3 p-6">
        <div className="text-7xl anim-floaty">✅</div>
        <h1 className="text-3xl font-black text-neon-lime text-glow-lime">Sei dentro!</h1>
        <p className="text-white/70">Giocatori: <b className="text-white">{players.length}</b></p>
        <p className="text-white/60 max-w-xs">Aspetta che l'admin avvii la partita. Non chiudere questa pagina.</p>
        <button className="btn text-sm mt-4" onClick={() => leaveGame(uid)}>Esci dalla partita</button>
      </div>
    )
  }

  if (!role) {
    return game.status === 'reveal'
      ? <RevealView game={game} players={players} uid={uid} voted={me?.vote ?? null} />
      : <Msg title="Carico il tuo ruolo…" text="Se non compare entro pochi secondi, ricarica la pagina." />
  }

  if (game.status === 'playing') return <PlayingView role={role} endsAt={game.endsAt} />
  if (game.status === 'voting') return <VotingView uid={uid} me={me?.vote ?? null} players={players} role={role} />
  return <RevealView game={game} players={players} uid={uid} voted={me?.vote ?? null} />
}

function Msg({ title, text, emoji }: { title: string; text?: string; emoji?: string }) {
  return (
    <div className="flex-1 grid place-content-center justify-items-center text-center gap-3 p-6">
      {emoji && <div className="text-6xl">{emoji}</div>}
      <h1 className="text-2xl font-black">{title}</h1>
      {text && <p className="text-white/70 max-w-xs">{text}</p>}
    </div>
  )
}

function PlayingView({ role, endsAt }: { role: RoleDoc; endsAt: number | null }) {
  const [show, setShow] = useState(false)
  const now = useNow(500)
  // nascondi se l'app va in background
  useEffect(() => {
    const hide = () => setShow(false)
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])
  const left = endsAt ? endsAt - now : null

  return (
    <div className="flex-1 flex flex-col items-center p-4 gap-4">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-white/50 font-bold">Categoria</div>
        <div className="text-2xl font-black text-neon-cyan">{role.category}</div>
        {left !== null && (
          <div className={`text-4xl font-black mt-1 tabular-nums ${left < 30000 ? 'text-red-400' : 'text-neon-yellow'}`}>
            {left > 0 ? fmtClock(left) : 'Tempo scaduto!'}
          </div>
        )}
      </div>

      <button
        className={`noselect flex-1 w-full rounded-3xl border-4 grid place-items-center text-center p-4 ${show ? (role.role === 'impostor' ? 'bg-red-600/30 border-red-400 box-glow-pink' : 'bg-neon-lime/15 border-neon-lime') : 'bg-panel2 border-white/20'}`}
        style={{ minHeight: '45vh' }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setShow(true) }}
        onPointerUp={() => setShow(false)}
        onPointerCancel={() => setShow(false)}
        onPointerLeave={() => setShow(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {show ? (
          role.role === 'impostor' ? (
            <div>
              <div className="text-7xl mb-2">🥸</div>
              <div className="text-4xl font-black text-red-300 leading-tight">SEI L'IMPOSTORE</div>
              <div className="mt-3 text-lg">Categoria: <b className="text-neon-cyan">{role.category}</b></div>
              <div className="mt-2 text-sm text-white/70">Non conosci la parola: mimetizzati!</div>
            </div>
          ) : (
            <div>
              <div className="text-sm uppercase tracking-widest text-white/60">La parola è</div>
              <div className="text-5xl font-black text-neon-lime text-glow-lime leading-tight break-words mt-2">{role.word}</div>
            </div>
          )
        ) : (
          <div>
            <div className="text-7xl mb-3">👆</div>
            <div className="text-2xl font-black">Tieni premuto per vedere la parola</div>
            <div className="text-sm text-white/60 mt-2">Copri lo schermo con la mano: nessuno deve vederla</div>
          </div>
        )}
      </button>
    </div>
  )
}

function VotingView({ uid, me, players, role }: { uid: string; me: string | null; players: { id: string; nickname: string }[]; role: RoleDoc }) {
  const [busy, setBusy] = useState<string | null>(null)
  const vote = async (target: string) => {
    setBusy(target)
    try { await castVote(uid, me === target ? null : target) } catch { /* ignora */ } finally { setBusy(null) }
  }
  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="text-center">
        <div className="text-5xl">🗳️</div>
        <h1 className="text-3xl font-black text-neon-pink text-glow-pink">Chi è l'impostore?</h1>
        <p className="text-white/60 text-sm">Tocca un nome per votare (tocca di nuovo per togliere il voto)</p>
        {role.role === 'impostor' && <p className="text-red-300 text-sm font-bold mt-1">Ricorda: sei tu l'impostore 😈</p>}
      </div>
      <ul className="flex flex-col gap-2">
        {players.filter((p) => p.id !== uid).map((p) => (
          <li key={p.id}>
            <button
              onClick={() => vote(p.id)}
              disabled={busy !== null}
              className={`w-full text-left rounded-2xl px-4 py-3 text-lg font-bold border-2 transition ${me === p.id ? 'bg-neon-pink/30 border-neon-pink box-glow-pink' : 'bg-white/5 border-white/10'}`}
            >
              {me === p.id ? '✅ ' : ''}{p.nickname}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RevealView({ game, players, uid, voted }: { game: ReturnType<typeof useGame>['data']; players: { id: string; nickname: string }[]; uid: string; voted: string | null }) {
  const iWasImpostor = game.impostorUids.includes(uid)
  const guessed = voted ? game.impostorUids.includes(voted) : false
  const names = game.impostorNames.length ? game.impostorNames : players.filter((p) => game.impostorUids.includes(p.id)).map((p) => p.nickname)
  return (
    <div className="flex-1 grid place-content-center justify-items-center text-center gap-4 p-6">
      <div className="text-7xl anim-pop">{iWasImpostor ? '😈' : guessed ? '🎯' : '🤔'}</div>
      <h1 className="text-xl uppercase tracking-widest text-white/60 font-bold">{names.length > 1 ? 'Gli impostori erano' : "L'impostore era"}</h1>
      <div className="text-4xl font-black text-red-300 anim-pop">{names.join(' e ') || '…'}</div>
      <div className="text-white/60 mt-2">La parola era</div>
      <div className="text-4xl font-black text-neon-lime text-glow-lime">{game.word}</div>
      {!iWasImpostor && voted && <p className="font-bold mt-2">{guessed ? 'Hai indovinato! 🎉' : 'Stavolta ti ha fregato 😅'}</p>}
      <p className="text-white/50 text-sm mt-4">Aspetta la prossima partita…</p>
    </div>
  )
}
