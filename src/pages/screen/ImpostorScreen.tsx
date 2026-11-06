import { useEffect, useState } from 'react'
import type { Game, PlayerDoc } from '../../lib/types'
import { useNow } from '../../lib/hooks'
import { fmtClock } from '../../lib/util'
import { QR, shortUrl } from './QR'
import { Logo } from '../../components/Logo'

export default function ImpostorScreen({ game, players }: { game: Game; players: PlayerDoc[] }) {
  if (game.status === 'reveal') return <Reveal key={game.round} game={game} players={players} />
  if (game.status === 'voting') return <Voting players={players} />
  if (game.status === 'playing') return <Discussion game={game} players={players} />
  return <LobbyI players={players} />
}

function Frame({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="h-full w-full bg-aurora flex flex-col p-[2vw] gap-[2vh]">
      <div className="flex items-center justify-between gap-[2vw]">
        <div className="flex items-center gap-[1.5vw]">
          <Logo size={Math.round(window.innerHeight * 0.1)} />
          <h1 className="text-[4vw] leading-none font-black text-neon-pink text-glow-pink">🕵️ {title}</h1>
        </div>
        {right}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

function Names({ players, big }: { players: PlayerDoc[]; big?: boolean }) {
  return (
    <div className="flex flex-wrap gap-[1vw] content-start">
      {players.map((p) => (
        <span key={p.id} className={`rounded-full bg-panel2 border border-neon-cyan/50 font-extrabold ${big ? 'text-[2.6vw] px-[1.6vw] py-[0.6vw]' : 'text-[2vw] px-[1.2vw] py-[0.4vw]'}`}>{p.nickname}</span>
      ))}
    </div>
  )
}

function LobbyI({ players }: { players: PlayerDoc[] }) {
  return (
    <Frame title="Gioco dell'Impostore" right={<QR size={Math.round(window.innerHeight * 0.3)} />}>
      <div className="flex flex-col gap-[2vh]">
        <p className="text-[2.6vw] font-bold text-white/85">Collegati con il telefono ({shortUrl()}) e premi <b className="text-neon-lime">Entra nella partita</b></p>
        <div className="text-[5vw] font-black text-neon-lime text-glow-lime">{players.length} {players.length === 1 ? 'giocatore' : 'giocatori'}</div>
        <Names players={players} big />
      </div>
    </Frame>
  )
}

function Discussion({ game, players }: { game: Game; players: PlayerDoc[] }) {
  const now = useNow(250)
  const left = game.endsAt ? game.endsAt - now : 0
  const low = left > 0 && left < 30000
  return (
    <Frame title="Discussione">
      <div className="h-full flex gap-[3vw]">
        <div className="flex flex-col items-center justify-center gap-[2vh] flex-1">
          <div className="text-[2.4vw] uppercase tracking-[0.3em] font-bold text-white/70">Categoria</div>
          <div className="text-[6vw] leading-none font-black text-neon-cyan text-glow-cyan text-center">{game.category}</div>
          <div className={`text-[16vw] leading-none font-black tabular-nums ${left <= 0 ? 'text-red-400 anim-pulse' : low ? 'text-red-400 anim-pulse' : 'text-neon-yellow'}`}>
            {left > 0 ? fmtClock(left) : '0:00'}
          </div>
          <div className="text-[2.2vw] font-bold text-white/80">{left > 0 ? 'Chi è l’impostore? Parlate!' : 'Tempo scaduto! Si passa al voto'}</div>
        </div>
        <div className="w-[30vw] card p-[1.5vw] overflow-hidden">
          <div className="text-[1.8vw] uppercase tracking-[0.2em] font-black text-neon-pink mb-[1vh]">Giocatori ({players.length})</div>
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
  const rows = [...players].map((p) => ({ p, n: counts.get(p.id) ?? 0 })).sort((a, b) => b.n - a.n || a.p.nickname.localeCompare(b.p.nickname))
  const max = Math.max(1, ...rows.map((r) => r.n))
  const shown = rows.slice(0, 10)
  return (
    <Frame title="Votazione" right={<div className="text-[2.6vw] font-black text-neon-lime">Hanno votato {voters}/{players.length}</div>}>
      <div className="flex flex-col justify-center gap-[1.4vh] h-full">
        {shown.map(({ p, n }, i) => (
          <div key={p.id} className="flex items-center gap-[1.5vw]">
            <div className="w-[18vw] text-[2.4vw] font-extrabold truncate text-right">{p.nickname}</div>
            <div className="flex-1 h-[5.5vh] rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${i === 0 && n > 0 ? 'bg-gradient-to-r from-neon-pink to-neon-yellow' : 'bg-gradient-to-r from-neon-violet to-neon-cyan'}`}
                style={{ width: `${(n / max) * 100}%` }}
              />
            </div>
            <div className="w-[5vw] text-[3vw] font-black tabular-nums text-neon-yellow">{n}</div>
          </div>
        ))}
        {rows.length > shown.length && <div className="text-[1.6vw] text-white/60 text-center">…e altri {rows.length - shown.length} giocatori</div>}
      </div>
    </Frame>
  )
}

function Reveal({ game, players }: { game: Game; players: PlayerDoc[] }) {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 3500)
    const t2 = setTimeout(() => setStage(2), 6500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  const names = game.impostorNames.length ? game.impostorNames : players.filter((p) => game.impostorUids.includes(p.id)).map((p) => p.nickname)
  const caught = players.filter((p) => p.vote && game.impostorUids.includes(p.vote)).length
  return (
    <div className={`h-full w-full flex flex-col items-center justify-center text-center gap-[3vh] px-[4vw] ${stage === 0 ? 'anim-flash' : 'bg-aurora'}`}>
      {stage === 0 && (
        <>
          <div className="text-[6vw] font-black text-ink">{game.impostorUids.length > 1 ? 'Gli impostori erano…' : 'L’impostore era…'}</div>
          <div className="text-[14vw] leading-none anim-shake">🥁</div>
        </>
      )}
      {stage >= 1 && (
        <>
          <div className="text-[3vw] uppercase tracking-[0.3em] font-bold text-white/70">{game.impostorUids.length > 1 ? 'Gli impostori erano' : 'L’impostore era'}</div>
          <div className="text-[9vw] leading-none font-black text-red-300 anim-pop" style={{ textShadow: '0 0 30px rgba(255,59,92,.8)' }}>
            😈 {names.join(' e ') || '???'}
          </div>
        </>
      )}
      {stage >= 2 && (
        <div className="anim-pop flex flex-col items-center gap-[1vh]">
          <div className="text-[2.6vw] text-white/70 font-semibold">La parola segreta era</div>
          <div className="text-[8vw] leading-none font-black text-neon-lime text-glow-lime">{game.word}</div>
          <div className="text-[2.2vw] font-bold text-neon-cyan mt-[2vh]">
            Categoria: {game.category} · {caught} {caught === 1 ? 'voto ha' : 'voti hanno'} beccato l’impostore
          </div>
        </div>
      )}
    </div>
  )
}
