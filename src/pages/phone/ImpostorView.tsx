import { useEffect, useState, type ReactNode } from 'react'
import { Check, Fingerprint, Hourglass, LogOut, Trophy, UserCheck, VenetianMask, Vote } from 'lucide-react'
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

  if (!ready) return <Msg icon={<Hourglass />} title="Carico…" />

  if (!joined) {
    if (game.status === 'lobby' || game.status === 'reveal') {
      return (
        <Msg icon={<VenetianMask />} title="L’impostore" accent>
          <p className="text-muted max-w-xs">Siete già in <b className="text-white">{players.length}</b>. Entra per ricevere la tua parola segreta quando parte la partita.</p>
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

  if (!role) {
    return game.status === 'reveal'
      ? <RevealView game={game} players={players} uid={uid} voted={me?.vote ?? null} />
      : <Msg icon={<Hourglass />} title="Carico il tuo ruolo…" text="Se non compare entro pochi secondi, ricarica la pagina." />
  }

  if (game.status === 'playing') return <PlayingView role={role} endsAt={game.endsAt} />
  if (game.status === 'voting') return <VotingView uid={uid} me={me?.vote ?? null} players={players} role={role} />
  return <RevealView game={game} players={players} uid={uid} voted={me?.vote ?? null} />
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
  const imp = role.role === 'impostor'

  return (
    <div className="flex-1 flex flex-col items-center p-4 gap-4">
      <div className="w-full card px-4 py-3 flex items-center justify-between">
        <div>
          <div className="eyebrow text-[.7rem]">Categoria</div>
          <div className="display text-white text-3xl leading-none mt-1">{role.category}</div>
        </div>
        {left !== null && (
          <div className={`display tabular text-4xl ${left < 30000 ? 'text-bad' : 'text-white'}`}>{left > 0 ? fmtClock(left) : 'Tempo!'}</div>
        )}
      </div>

      <button
        className={`noselect flex-1 w-full rounded-[2rem] border-2 grid place-items-center text-center p-5 transition-colors ${show ? (imp ? 'bg-bad/15 border-bad' : 'bg-brand/15 border-ice') : 'bg-surface border-line'}`}
        style={{ minHeight: '46vh' }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setShow(true) }}
        onPointerUp={() => setShow(false)}
        onPointerCancel={() => setShow(false)}
        onPointerLeave={() => setShow(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {show ? (
          imp ? (
            <div className="flex flex-col items-center gap-2">
              <VenetianMask className="w-16 h-16 text-bad" strokeWidth={1.5} />
              <div className="display text-bad text-6xl leading-[.9]">Sei l’impostore</div>
              <div className="mt-3 text-base text-white/80">Categoria: <b className="text-ice">{role.category}</b></div>
              <div className="text-sm text-muted">Non conosci la parola: mimetizzati.</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="eyebrow text-xs">La parola è</div>
              <div className="display grad-text text-[3.6rem] leading-[.95] break-words">{role.word}</div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Fingerprint className="w-20 h-20 text-ice" strokeWidth={1.2} />
            <div className="display text-white text-4xl">Tieni premuto</div>
            <div className="text-sm text-muted max-w-[16rem]">per vedere la parola. Copri lo schermo con la mano: nessuno deve vederla.</div>
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
    <div className="p-4 flex flex-col gap-4 pb-10">
      <div className="text-center flex flex-col items-center gap-2 pt-2">
        <span className="grid place-items-center w-14 h-14 rounded-full bg-brand/15 border border-brand/40 text-ice"><Vote className="w-7 h-7" /></span>
        <h1 className="display grad-text text-5xl">Chi è l’impostore?</h1>
        <p className="text-muted text-sm">Tocca un nome per votare. Tocca di nuovo per togliere il voto.</p>
        {role.role === 'impostor' && <p className="text-bad text-sm font-semibold">Ricorda: l’impostore sei tu.</p>}
      </div>
      <ul className="flex flex-col gap-2.5">
        {players.filter((p) => p.id !== uid).map((p) => (
          <li key={p.id}>
            <button
              onClick={() => vote(p.id)}
              disabled={busy !== null}
              className={`w-full flex items-center justify-between rounded-2xl px-5 py-4 text-lg font-bold border transition ${me === p.id ? 'bg-brand/20 border-brand ring-1 ring-brand' : 'bg-white/[.05] border-line'}`}
            >
              <span className="truncate">{p.nickname}</span>
              {me === p.id && <Check className="w-5 h-5 text-ice shrink-0" />}
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
      <span className="grid place-items-center w-20 h-20 rounded-full bg-brand/15 border border-brand/40 text-ice anim-pop">
        {guessed ? <Trophy className="w-9 h-9" /> : <VenetianMask className="w-9 h-9" />}
      </span>
      <div className="eyebrow text-sm">{names.length > 1 ? 'Gli impostori erano' : 'L’impostore era'}</div>
      <div className="display text-bad text-6xl anim-pop leading-[.95]">{names.join(' · ') || '…'}</div>
      <div className="eyebrow text-xs mt-3">La parola era</div>
      <div className="display grad-text text-5xl">{game.word}</div>
      {!iWasImpostor && voted && <p className="font-semibold mt-1">{guessed ? 'Hai indovinato!' : 'Stavolta ti ha fregato.'}</p>}
      <p className="text-muted text-sm mt-4">Aspetta la prossima partita…</p>
    </div>
  )
}
