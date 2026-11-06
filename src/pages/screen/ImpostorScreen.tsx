import { useEffect, useState, type ReactNode } from 'react'
import { Timer, Users, Vote, VenetianMask } from 'lucide-react'
import type { Game, PlayerDoc } from '../../lib/types'
import { useNow } from '../../lib/hooks'
import { fmtClock } from '../../lib/util'
import { QR, shortUrl } from './QR'
import { Logo } from '../../components/Logo'
import { BRAND } from '../../lib/brand'

export default function ImpostorScreen({ game, players }: { game: Game; players: PlayerDoc[] }) {
  if (game.status === 'reveal') return <Reveal key={game.round} game={game} players={players} />
  if (game.status === 'voting') return <Voting players={players} />
  if (game.status === 'playing') return <Discussion game={game} players={players} />
  return <LobbyI players={players} />
}

function Frame({ phase, icon, right, children }: { phase: string; icon: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="h-full w-full bg-stage flex flex-col px-[3vw] py-[3vh] gap-[3vh]">
      <header className="flex items-center justify-between gap-[2vw]">
        <div className="flex items-center gap-[1.2vw]">
          <Logo size={Math.round(window.innerHeight * 0.09)} />
          <div className="leading-none">
            <div className="display text-white text-[2.2vw]">{BRAND.title}</div>
            <div className="eyebrow text-[1vw] mt-[.4vw]">L’impostore</div>
          </div>
        </div>
        <div className="card flex items-center gap-[.9vw] px-[1.6vw] py-[1vh]">
          <span className="text-brand [&>svg]:w-[2vw] [&>svg]:h-[2vw]">{icon}</span>
          <span className="display text-white text-[2.4vw]">{phase}</span>
        </div>
        <div className="min-w-[14vw] flex justify-end">{right}</div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

function Names({ players }: { players: PlayerDoc[] }) {
  return (
    <div className="flex flex-wrap gap-[.9vw] content-start">
      {players.map((p) => (
        <span key={p.id} className="card text-[2vw] font-bold px-[1.4vw] py-[.7vh] anim-slide">{p.nickname}</span>
      ))}
    </div>
  )
}

function LobbyI({ players }: { players: PlayerDoc[] }) {
  return (
    <Frame phase="Entrate in partita" icon={<Users />} right={<QR size={Math.round(window.innerHeight * 0.26)} />}>
      <div className="flex flex-col gap-[3vh]">
        <div className="flex items-end gap-[1.6vw]">
          <span className="display grad-text text-[9vw]">{players.length}</span>
          <span className="display text-white text-[3vw] pb-[1.2vh]">{players.length === 1 ? 'giocatore' : 'giocatori'}</span>
        </div>
        <p className="text-[1.8vw] text-muted">Apri <b className="text-ice">{shortUrl()}</b> e premi <b className="text-white">Entra nella partita</b></p>
        <Names players={players} />
      </div>
    </Frame>
  )
}

function Discussion({ game, players }: { game: Game; players: PlayerDoc[] }) {
  const now = useNow(250)
  const left = game.endsAt ? game.endsAt - now : 0
  const low = left <= 30000
  return (
    <Frame phase="Discussione" icon={<Timer />}>
      <div className="h-full flex gap-[3vw]">
        <div className="flex-1 card flex flex-col items-center justify-center gap-[2vh] text-center">
          <div className="eyebrow text-[1.7vw]">Categoria</div>
          <div className="display text-white text-[6.5vw]">{game.category}</div>
          <div className={`display tabular text-[17vw] leading-none ${low ? 'text-bad anim-pulse' : 'grad-text'}`}>{left > 0 ? fmtClock(left) : '0:00'}</div>
          <div className="text-[1.9vw] font-medium text-muted">{left > 0 ? 'Chi è l’impostore? Parlate!' : 'Tempo scaduto: si passa al voto'}</div>
        </div>
        <div className="w-[28vw] card p-[1.6vw] overflow-hidden flex flex-col gap-[1.6vh]">
          <div className="eyebrow text-[1.2vw]">Giocatori · {players.length}</div>
          <Names players={players} />
        </div>
      </div>
    </Frame>
  )
}

function Voting({ players }: { players: PlayerDoc[] }) {
  const ids = new Set(players.map((p) => p.id))
  const counts = new Map<string, number>()
  let voters = 0
  players.forEach((p) => {
    if (p.vote && ids.has(p.vote)) {
      voters++
      counts.set(p.vote, (counts.get(p.vote) ?? 0) + 1)
    }
  })
  const rows = players.map((p) => ({ p, n: counts.get(p.id) ?? 0 })).sort((a, b) => b.n - a.n || a.p.nickname.localeCompare(b.p.nickname))
  const max = Math.max(1, ...rows.map((r) => r.n))
  const shown = rows.slice(0, 9)
  return (
    <Frame phase="Votazione" icon={<Vote />} right={<div className="display text-white text-[2.4vw] tabular">{voters}<span className="text-muted">/{players.length}</span> <span className="eyebrow text-[1.1vw] ml-[.4vw]">voti</span></div>}>
      <div className="card h-full flex flex-col justify-center gap-[1.5vh] px-[2.4vw]">
        {shown.map(({ p, n }, i) => {
          const lead = i === 0 && n > 0
          return (
            <div key={p.id} className="flex items-center gap-[1.4vw]">
              <div className={`w-[17vw] text-right truncate font-bold text-[2.2vw] ${lead ? 'text-white' : 'text-white/80'}`}>{p.nickname}</div>
              <div className="flex-1 h-[5.2vh] rounded-full bg-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,.07)' }}>
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${lead ? 'bg-gradient-to-r from-brand to-ice' : 'bg-gradient-to-r from-navy to-brand/70'}`}
                  style={{ width: `${(n / max) * 100}%`, minWidth: n > 0 ? '3%' : 0 }}
                />
              </div>
              <div className={`w-[4.5vw] display tabular text-[3vw] ${lead ? 'text-ice' : 'text-white/70'}`}>{n}</div>
            </div>
          )
        })}
        {rows.length > shown.length && <div className="text-[1.3vw] text-muted text-center">e altri {rows.length - shown.length} giocatori</div>}
      </div>
    </Frame>
  )
}

function Reveal({ game, players }: { game: Game; players: PlayerDoc[] }) {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 4000)
    const t2 = setTimeout(() => setStage(2), 7000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  const names = game.impostorNames.length ? game.impostorNames : players.filter((p) => game.impostorUids.includes(p.id)).map((p) => p.nickname)
  const caught = players.filter((p) => p.vote && game.impostorUids.includes(p.vote)).length
  const many = game.impostorUids.length > 1
  return (
    <div className="h-full w-full bg-stage flex flex-col items-center justify-center text-center gap-[3.5vh] px-[4vw] overflow-hidden"
      style={stage >= 1 ? { backgroundImage: 'radial-gradient(60vw 40vh at 50% 45%, rgba(255,84,112,.22), transparent 70%)' } : undefined}>
      {stage === 0 && (
        <>
          <VenetianMask className="w-[12vw] h-[12vw] text-brand anim-shake" strokeWidth={1.4} />
          <div className="display text-white text-[6vw]">{many ? 'Gli impostori erano' : 'L’impostore era'}</div>
          <div className="flex gap-[1.4vw]">{[0, 1, 2].map((i) => <span key={i} className="w-[1.8vw] h-[1.8vw] rounded-full bg-ice anim-pulse" style={{ animationDelay: `${i * 0.25}s` }} />)}</div>
        </>
      )}
      {stage >= 1 && (
        <div className="anim-pop flex flex-col items-center gap-[2.4vh]">
          <div className="eyebrow text-[2vw]">{many ? 'Gli impostori erano' : 'L’impostore era'}</div>
          <div className="display text-[10.5vw] max-w-[92vw]" style={{ background: 'linear-gradient(100deg,#fff,#ff8ea1 60%,#ff5470)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            {names.join(' · ') || '???'}
          </div>
        </div>
      )}
      {stage >= 2 && (
        <div className="anim-pop card px-[4vw] py-[2.4vh] flex flex-col items-center gap-[.8vh]">
          <div className="eyebrow text-[1.5vw]">La parola segreta era</div>
          <div className="display grad-text text-[6.5vw]">{game.word}</div>
          <div className="text-[1.5vw] text-muted">{game.category} · {caught} {caught === 1 ? 'voto ha beccato' : 'voti hanno beccato'} l’impostore</div>
        </div>
      )}
    </div>
  )
}
