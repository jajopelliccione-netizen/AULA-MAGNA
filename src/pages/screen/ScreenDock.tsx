import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Eye, Gamepad2, Home, Mic, Music2, Pause, Play, PlayCircle, RotateCcw, RotateCw, SkipForward, Users, Vote } from 'lucide-react'
import type { AppState, Game, Mode, PlayerDoc, QueueItem } from '../../lib/types'
import {
  logAction, moveTurn, nextGiro, requestSkip, restartSong, revealRound, setImpostorConfig, setPlayerStatus, startNextSong, startRound, startTurns, startVoting, switchMode,
} from '../../lib/actions'
import { CATEGORIES, RANDOM_CATEGORY_ID } from '../../lib/words'
import { useState } from 'react'

/**
 * Barra dei comandi TOUCH per la LIM (si accende dal pannello admin).
 * Sta SEMPRE in basso nel suo spazio: la schermata di gioco si rimpicciolisce per fare posto alla barra,
 * quindi i comandi non coprono mai nulla. Pulsanti grandi, un solo gesto per ogni azione.
 */
export default function ScreenDock({ state, game, players, queue, serverNow, onHeight }: { state: AppState; game: Game; players: PlayerDoc[]; queue: QueueItem[]; serverNow: () => number; onHeight: (px: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // comunica l'altezza alla pagina, che rimpicciolisce il gioco di conseguenza
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const report = () => onHeight(el.offsetHeight)
    report()
    const ro = new ResizeObserver(report)
    ro.observe(el)
    return () => {
      ro.disconnect()
      onHeight(0)
    }
  }, [onHeight])

  useEffect(() => {
    if (!err) return
    const t = setTimeout(() => setErr(''), 5000)
    return () => clearTimeout(t)
  }, [err])

  const run = async (text: string, fn: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      await fn()
      if (text) logAction('Schermo', text, serverNow()).catch(() => {})
    } catch (e) {
      setErr((e as Error).message || 'Non è andata, riprova')
    } finally {
      setBusy(false)
    }
  }

  const mode = state.mode
  const np = state.nowPlaying
  const head = queue[0]
  const finished = game.turnIndex >= game.order.length
  const cfg = state.impostorConfig
  const go = (m: Mode, label: string) => run(`ha scelto ${label} dallo schermo`, () => switchMode(m, state))

  let title = 'Comandi'
  let icon: ReactNode = <Gamepad2 />
  let top: ReactNode = null // eventuale riga superiore (impostazioni)
  let main: ReactNode = null
  let showHome = mode !== 'lobby'

  if (mode === 'lobby' || mode === 'pause') {
    title = 'Scegli un gioco'
    main = (
      <>
        <Btn icon={<Mic />} label="Karaoke" onClick={() => go('karaoke', 'il karaoke')} />
        <Btn icon={<Music2 />} label="Musica" onClick={() => go('music', 'la musica')} />
        <Btn icon={<Gamepad2 />} label="L’impostore" onClick={() => go('impostor', 'l’impostore')} />
      </>
    )
    showHome = false
  } else if (mode === 'karaoke' || mode === 'music') {
    title = mode === 'karaoke' ? 'Karaoke' : 'Musica'
    icon = mode === 'karaoke' ? <Mic /> : <Music2 />
    const paused = state.playerStatus === 'paused'
    main = (
      <>
        {!np && head && (
          <Btn grow variant="primary" icon={<PlayCircle />} label={state.playerStatus === 'between' ? 'Parti subito' : mode === 'karaoke' ? `Avvia: ${head.nickname}` : 'Avvia la canzone'} onClick={() => run(`ha avviato «${head.title}» dallo schermo`, () => startNextSong(head))} />
        )}
        {!np && !head && <span className="text-[1.6vw] text-muted px-[1vw]">Nessuna canzone in coda: si prenota dal telefono con il QR</span>}
        {np && (
          <>
            <Btn icon={<RotateCcw />} label="Da capo" onClick={() => run('ha fatto ricominciare la canzone dallo schermo', () => restartSong())} />
            {paused
              ? <Btn variant="success" icon={<Play />} label="Riprendi" onClick={() => run('ha ripreso il video dallo schermo', () => setPlayerStatus('playing'))} />
              : <Btn variant="secondary" icon={<Pause />} label="Pausa" onClick={() => run('ha messo in pausa dallo schermo', () => setPlayerStatus('paused'))} />}
            <Btn variant="danger" icon={<SkipForward />} label="Salta" onClick={() => run('ha saltato la canzone dallo schermo', () => requestSkip())} />
          </>
        )}
      </>
    )
  } else if (mode === 'impostor') {
    title = 'L’impostore'
    icon = <Gamepad2 />
    const lobby = game.status === 'lobby' || game.status === 'reveal'
    if (lobby) {
      top = (
        <div className="flex items-center gap-[1.2vw]">
          <span className="eyebrow text-[1.1vw] shrink-0">Categoria</span>
          <div className="flex gap-[.6vw] overflow-x-auto no-scrollbar py-[.4vh] flex-1" data-kiosk-scroll>
            {[{ id: RANDOM_CATEGORY_ID, label: 'Casuale' }, ...CATEGORIES].map((c) => (
              <Chip key={c.id} on={cfg.categoryId === c.id} onClick={() => run('', () => setImpostorConfig({ ...cfg, categoryId: c.id }))}>{c.label}</Chip>
            ))}
          </div>
          <span className="eyebrow text-[1.1vw] shrink-0">Impostori</span>
          <div className="flex gap-[.5vw] shrink-0">{[1, 2, 3].map((n) => <Chip key={n} on={cfg.impostors === n} onClick={() => run('', () => setImpostorConfig({ ...cfg, impostors: n }))}>{n}</Chip>)}</div>
        </div>
      )
      main = (
        <>
          <Btn grow variant="primary" icon={<PlayCircle />} label={game.status === 'reveal' ? 'Nuova partita' : 'Inizia la partita'} disabled={players.length < 3}
            onClick={() => run('ha avviato una nuova partita dallo schermo', () => startRound({ categoryId: cfg.categoryId, impostors: cfg.impostors, readingSec: cfg.readingSec }, serverNow()))} />
          <span className="flex items-center gap-[.6vw] text-[1.5vw] text-muted shrink-0"><Users className="w-[1.8vw] h-[1.8vw]" /> {players.length} {players.length === 1 ? 'giocatore' : 'giocatori'}{players.length < 3 ? ' · ne servono 3' : ''}</span>
        </>
      )
    } else if (game.status === 'reading') {
      main = <Btn grow variant="primary" icon={<PlayCircle />} label="Inizia il primo giro" onClick={() => run('ha iniziato il primo giro dallo schermo', () => startTurns())} />
    } else if (game.status === 'turns') {
      main = finished ? (
        <>
          <Btn icon={<RotateCw />} label="Altro giro" onClick={() => run('ha avviato un altro giro dallo schermo', () => nextGiro(game.giro))} />
          <Btn grow variant="primary" icon={<Vote />} label="Si vota" onClick={() => run('ha avviato il voto dallo schermo', () => startVoting())} />
        </>
      ) : (
        <>
          <Btn icon={<ChevronLeft />} label="Indietro" disabled={game.turnIndex <= 0} onClick={() => run('è tornato al giocatore precedente dallo schermo', () => moveTurn(game, -1))} />
          <Btn grow variant="primary" icon={<ChevronRight />} label={`Prossimo giocatore`} onClick={() => run('ha chiamato il giocatore successivo dallo schermo', () => moveTurn(game, 1))} />
          <Btn variant="secondary" icon={<Vote />} label="Passa al voto" onClick={() => run('ha avviato il voto dallo schermo', () => startVoting())} />
        </>
      )
    } else if (game.status === 'voting') {
      main = <Btn grow variant="primary" icon={<Eye />} label="Mostra il risultato" onClick={() => run('ha rivelato l’impostore dallo schermo', () => revealRound())} />
    }
  }

  if (!main) return null

  return (
    <div ref={ref} data-testid="screen-dock" className="fixed bottom-0 inset-x-0 z-[120] bg-surface/97 border-t border-white/15 backdrop-blur px-[1.6vw] py-[1.2vh] flex flex-col gap-[1vh] shadow-[0_-20px_60px_-30px_rgba(47,147,240,.8)]">
      {top}
      <div className="flex items-center gap-[1.2vw]">
        <div className="flex items-center gap-[.8vw] shrink-0 min-w-[12vw]">
          <span className="grid place-items-center w-[3.4vw] h-[3.4vw] rounded-xl bg-brand/20 text-ice [&>svg]:w-[2vw] [&>svg]:h-[2vw]">{icon}</span>
          <span className="display text-white text-[1.9vw] leading-none">{title}</span>
        </div>
        <div className="flex-1 flex items-center gap-[1vw] min-w-0">{main}</div>
        {showHome && <Btn icon={<Home />} label="Giochi" onClick={() => go('lobby', 'il menu dei giochi')} />}
      </div>
      {err && <p className="text-bad text-[1.3vw] -mt-[.4vh]">{err}</p>}
    </div>
  )
}

function Btn({ icon, label, onClick, variant, grow, disabled }: { icon: ReactNode; label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'success' | 'danger'; grow?: boolean; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`btn ${variant ? `btn-${variant}` : ''} ${grow ? 'flex-1' : ''} min-h-[8vh] !rounded-2xl !px-[1.6vw] !gap-[.8vw] text-[1.7vw] font-extrabold [&>svg]:w-[2.2vw] [&>svg]:h-[2.2vw] [&>svg]:shrink-0`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full border px-[1.3vw] py-[1vh] text-[1.4vw] font-bold transition active:scale-95 ${on ? 'bg-brand border-ice text-white' : 'bg-white/[.06] border-line text-white/80'}`}>{children}</button>
  )
}
