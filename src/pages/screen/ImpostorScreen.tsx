import { useEffect, useState, type ReactNode } from 'react'
import { Check, Hourglass, Megaphone, RotateCw, Users, Vote, VenetianMask } from 'lucide-react'
import { wordsOf, type Game, type PlayerDoc } from '../../lib/types'
import { useNow } from '../../lib/hooks'
import { QR, shortUrl } from './QR'
import { Logo } from '../../components/Logo'
import { BRAND } from '../../lib/brand'

export default function ImpostorScreen({ game, players, serverNow }: { game: Game; players: PlayerDoc[]; serverNow: () => number }) {
  if (game.status === 'reveal') return <Reveal key={game.round} game={game} players={players} />
  if (game.status === 'voting') return <Voting players={players} />
  if (game.status === 'turns') return <Turns game={game} />
  if (game.status === 'reading') return <Reading game={game} serverNow={serverNow} />
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

function LobbyI({ players }: { players: PlayerDoc[] }) {
  return (
    <Frame phase="Entrate in partita" icon={<Users />} right={<QR size={Math.round(window.innerHeight * 0.26)} />}>
      <div className="flex flex-col gap-[3vh]">
        <div className="flex items-end gap-[1.6vw]">
          <span className="display grad-text text-[9vw]">{players.length}</span>
          <span className="display text-white text-[3vw] pb-[1.2vh]">{players.length === 1 ? 'giocatore' : 'giocatori'}</span>
        </div>
        <p className="text-[1.8vw] text-muted">Apri <b className="text-ice">{shortUrl()}</b> e premi <b className="text-white">Entra nella partita</b></p>
        <div className="flex flex-wrap gap-[.9vw] content-start">
          {players.map((p) => <span key={p.id} className="card text-[2vw] font-bold px-[1.4vw] py-[.7vh] anim-slide">{p.nickname}</span>)}
        </div>
      </div>
    </Frame>
  )
}

/** Fase 1: i giocatori leggono la parola sul telefono. */
function Reading({ game, serverNow }: { game: Game; serverNow: () => number }) {
  const now = useNow(200)
  void now
  const left = game.endsAt ? Math.max(0, game.endsAt - serverNow()) : 0
  return (
    <Frame phase="Leggete la parola" icon={<Hourglass />}>
      <div className="h-full card flex flex-col items-center justify-center gap-[2.4vh] text-center">
        <div className="eyebrow text-[1.7vw]">Categoria</div>
        <div className="display text-white text-[8vw]">{game.category}</div>
        <div className="display grad-text tabular text-[15vw] leading-none">{Math.ceil(left / 1000)}</div>
        <div className="text-[2vw] font-medium text-muted">
          {left > 0 ? 'Guardate il vostro telefono: la parola sparirà tra poco' : 'Ora ricordate il vostro numero. Si parte a breve'}
        </div>
      </div>
    </Frame>
  )
}

/** Fase 2: i giri. Si vede chi sta parlando e chi ha già parlato (solo numeri, niente nomi). */
function Turns({ game }: { game: Game }) {
  const n = game.order.length
  const finished = game.turnIndex >= n
  const current = finished ? null : game.order[game.turnIndex]
  const sorted = [...game.order].sort((a, b) => a - b)
  const state = (num: number) => {
    const pos = game.order.indexOf(num)
    return pos < game.turnIndex ? 'done' : pos === game.turnIndex ? 'now' : 'todo'
  }
  const cols = n > 20 ? 8 : n > 12 ? 6 : 5
  return (
    <Frame phase={`Giro ${game.giro}`} icon={<Megaphone />} right={<div className="chip text-[1.2vw]">{game.category}</div>}>
      <div className="h-full flex gap-[2.5vw]">
        <div className="flex-1 card flex flex-col items-center justify-center text-center gap-[2vh] px-[2vw]">
          {finished ? (
            <>
              <RotateCw className="w-[7vw] h-[7vw] text-brand" strokeWidth={1.3} />
              <div className="display text-white text-[6.5vw]">Giro {game.giro} concluso</div>
              <div className="text-[2.2vw] text-muted max-w-[40vw]">Hanno parlato tutti. Decidete: un altro giro oppure si vota?</div>
            </>
          ) : (
            <>
              <div className="eyebrow text-[2vw]">Ora parla il</div>
              <div className="display text-white text-[4.6vw] -mb-[2vh]">Giocatore</div>
              <div key={current} className="display grad-text text-[26vw] leading-[.82] anim-pop">{current}</div>
              <div className="text-[1.9vw] text-muted max-w-[40vw]">Vieni davanti, di’ la tua parola e mostra il numero sul telefono</div>
              <div className="chip text-[1.3vw] !px-[1.2vw] !py-[.6vh]">{game.turnIndex + 1} / {n}</div>
            </>
          )}
        </div>
        <div className="w-[30vw] card p-[1.6vw] flex flex-col gap-[1.6vh]">
          <div className="eyebrow text-[1.2vw]">Giocatori</div>
          <div className="grid gap-[.7vw] content-start" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {sorted.map((num) => {
              const st = state(num)
              return (
                <div
                  key={num}
                  className={`relative aspect-square rounded-[.9vw] grid place-items-center display tabular text-[2.3vw] border transition ${
                    st === 'now' ? 'bg-brand border-ice text-white shadow-[0_0_30px_rgba(47,147,240,.8)] scale-110 z-10'
                    : st === 'done' ? 'bg-white/[.03] border-line text-white/25' : 'bg-white/[.07] border-line text-white'
                  }`}
                >
                  {num}
                  {st === 'done' && <Check className="absolute top-[.2vw] right-[.2vw] w-[.9vw] h-[.9vw] text-good" />}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Frame>
  )
}

/**
 * Testo scritto sulla barra: in chiaro sulla parte vuota, in scuro sulla parte colorata.
 * Le due copie sono ritagliate (clip-path) alla stessa percentuale della barra, così il colore
 * del testo cambia esattamente dove passa la barra, anche durante l'animazione.
 */
export function BarText({ text, fill }: { text: string; fill: number }) {
  const cls = 'absolute inset-0 flex items-center px-[1.8vw] whitespace-nowrap overflow-hidden text-ellipsis text-[2vw] font-extrabold tracking-tight'
  const tr = 'clip-path 700ms cubic-bezier(.22,1,.36,1)'
  return (
    <>
      <div className={`${cls} text-white/90`} style={{ clipPath: `inset(0 0 0 ${fill}%)`, transition: tr }}>{text}</div>
      <div className={`${cls} text-ink`} style={{ clipPath: `inset(0 ${100 - fill}% 0 0)`, transition: tr }}>{text}</div>
    </>
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
  const rows = players.map((p) => ({ p, n: counts.get(p.id) ?? 0 })).sort((a, b) => b.n - a.n || (a.p.number ?? 0) - (b.p.number ?? 0))
  const max = Math.max(1, ...rows.map((r) => r.n))
  const shown = rows.slice(0, 9)
  return (
    <Frame phase="Votazione" icon={<Vote />} right={<div className="display text-white text-[2.4vw] tabular">{voters}<span className="text-muted">/{players.length}</span> <span className="eyebrow text-[1.1vw] ml-[.4vw]">voti</span></div>}>
      <div className="card h-full flex flex-col justify-center gap-[1.4vh] px-[2.4vw]">
        {shown.map(({ p, n }, i) => {
          const lead = i === 0 && n > 0
          const fill = n > 0 ? Math.max(4, Math.round((n / max) * 100)) : 0
          const text = wordsOf(p).join(' · ') || '—'
          return (
            <div key={p.id} className="flex items-center gap-[1.4vw]">
              <div className={`w-[17vw] text-right truncate display text-[2.6vw] ${lead ? 'text-white' : 'text-white/75'}`}>Giocatore {p.number ?? '?'}</div>
              <div className="relative flex-1 h-[6vh] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.07)' }}>
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${lead ? 'bg-gradient-to-r from-brand to-ice' : 'bg-gradient-to-r from-brand/85 to-brand'}`}
                  style={{ width: `${fill}%`, transition: 'width 700ms cubic-bezier(.22,1,.36,1)' }}
                />
                <BarText text={text} fill={fill} />
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
  const many = game.impostorUids.length > 1
  const rows = (game.impostorNumbers.length ? game.impostorNumbers : players.filter((p) => game.impostorUids.includes(p.id)).map((p) => p.number ?? 0)).map((n, i) => ({
    n,
    name: game.impostorNames[i] ?? players.find((p) => p.number === n)?.nickname ?? '',
  }))
  const caught = players.filter((p) => p.vote && game.impostorUids.includes(p.vote)).length
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
          <div className="flex flex-wrap justify-center gap-[3vw]">
            {rows.map((r) => (
              <div key={r.n + r.name} className="flex flex-col items-center">
                <div className="display text-[7vw] leading-none text-white">Giocatore</div>
                <div className="display text-[16vw] leading-[.85]" style={{ background: 'linear-gradient(100deg,#fff,#ff8ea1 60%,#ff5470)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{r.n || '?'}</div>
                <div className="text-[2.6vw] font-bold text-white/85 mt-[1vh]">{r.name}</div>
              </div>
            ))}
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
