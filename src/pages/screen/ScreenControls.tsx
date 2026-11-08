import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Eye, Gamepad2, Home, Mic, Music2, Pause, Play, PlayCircle, RotateCcw, RotateCw, SkipForward, SlidersHorizontal, Users, Vote, X } from 'lucide-react'
import type { AppState, Game, Mode, PlayerDoc, QueueItem } from '../../lib/types'
import {
  logAction, moveTurn, nextGiro, requestSkip, restartSong, revealRound, setImpostorConfig, setPlayerStatus, startNextSong, startRound, startTurns, startVoting, switchMode,
} from '../../lib/actions'
import { CATEGORIES, RANDOM_CATEGORY_ID } from '../../lib/words'

/**
 * Comandi TOUCH sul proiettore / sulla LIM (si accendono dal pannello admin): i ragazzi possono scegliere il gioco,
 * andare avanti con i turni, avviare il voto e rivelare, senza passare dall'admin.
 * Pulsanti grandi, un riquadro che compare toccando «Comandi» e si richiude da solo.
 */
export default function ScreenControls({ state, game, players, queue, serverNow }: { state: AppState; game: Game; players: PlayerDoc[]; queue: QueueItem[]; serverNow: () => number }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const keepOpen = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), 15000)
  }
  useEffect(() => {
    if (open) keepOpen()
    return () => clearTimeout(timer.current)
  }, [open])

  const run = async (text: string, fn: () => Promise<unknown>, close = false) => {
    if (busy) return
    setBusy(true)
    setErr('')
    keepOpen()
    try {
      await fn()
      logAction('Schermo', text, serverNow()).catch(() => {})
      if (close) setOpen(false)
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

  const go = (m: Mode, label: string) => run(`ha scelto ${label} dallo schermo`, () => switchMode(m, state), true)

  /* ---------------------------------- contenuto per modalità ---------------------------------- */
  let title = 'Comandi'
  let body: ReactNode = null

  if (mode === 'lobby' || mode === 'pause') {
    title = 'Scegli un gioco'
    body = (
      <div className="grid grid-cols-3 gap-[1.2vw]">
        <Big icon={<Mic />} label="Karaoke" onClick={() => go('karaoke', 'il karaoke')} />
        <Big icon={<Music2 />} label="Musica" onClick={() => go('music', 'la musica')} />
        <Big icon={<Gamepad2 />} label="L’impostore" onClick={() => go('impostor', 'l’impostore')} />
      </div>
    )
  } else if (mode === 'karaoke' || mode === 'music') {
    title = mode === 'karaoke' ? 'Karaoke' : 'Musica'
    const paused = state.playerStatus === 'paused'
    body = (
      <div className="flex flex-col gap-[1.4vh]">
        {!np && head && (
          <Big wide variant="primary" icon={<PlayCircle />} label={state.playerStatus === 'between' ? 'Parti subito' : mode === 'karaoke' ? `Avvia: ${head.nickname}` : 'Avvia la canzone'} sub={head.title} onClick={() => run(`ha avviato «${head.title}» dallo schermo`, () => startNextSong(head))} />
        )}
        {!np && !head && <div className="text-[1.8vw] text-muted text-center py-[1vh]">Nessuna canzone in coda: prenota dal telefono con il QR.</div>}
        {np && (
          <div className="grid grid-cols-3 gap-[1.2vw]">
            <Big icon={<RotateCcw />} label="Da capo" onClick={() => run('ha fatto ricominciare la canzone dallo schermo', () => restartSong())} />
            {paused
              ? <Big variant="success" icon={<Play />} label="Riprendi" onClick={() => run('ha ripreso il video dallo schermo', () => setPlayerStatus('playing'))} />
              : <Big variant="secondary" icon={<Pause />} label="Pausa" onClick={() => run('ha messo in pausa dallo schermo', () => setPlayerStatus('paused'))} />}
            <Big variant="danger" icon={<SkipForward />} label="Salta" onClick={() => run('ha saltato la canzone dallo schermo', () => requestSkip())} />
          </div>
        )}
        <Big wide icon={<Home />} label="Cambia gioco" onClick={() => go('lobby', 'il menu dei giochi')} />
      </div>
    )
  } else if (mode === 'impostor') {
    title = 'L’impostore'
    const lobby = game.status === 'lobby' || game.status === 'reveal'
    if (lobby) {
      body = (
        <div className="flex flex-col gap-[1.6vh]">
          <div>
            <div className="eyebrow text-[1.2vw] mb-[.8vh]">Categoria</div>
            <div className="flex flex-wrap gap-[.7vw]">
              {[{ id: RANDOM_CATEGORY_ID, label: 'Casuale' }, ...CATEGORIES].map((c) => (
                <Chip key={c.id} on={cfg.categoryId === c.id} onClick={() => run('', () => setImpostorConfig({ ...cfg, categoryId: c.id }))}>{c.label}</Chip>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-[1.4vw]">
            <div className="eyebrow text-[1.2vw]">Impostori</div>
            {[1, 2, 3].map((n) => <Chip key={n} on={cfg.impostors === n} onClick={() => run('', () => setImpostorConfig({ ...cfg, impostors: n }))}>{n}</Chip>)}
            <div className="ml-auto flex items-center gap-[.6vw] text-[1.5vw] text-muted"><Users className="w-[1.8vw] h-[1.8vw]" /> {players.length} {players.length === 1 ? 'giocatore' : 'giocatori'}</div>
          </div>
          <Big wide variant="primary" icon={<PlayCircle />} label={game.status === 'reveal' ? 'Nuova partita' : 'Inizia la partita'} sub={players.length < 3 ? 'Servono almeno 3 giocatori collegati: entrate dal telefono' : undefined} disabled={players.length < 3}
            onClick={() => run('ha avviato una nuova partita dallo schermo', () => startRound({ categoryId: cfg.categoryId, impostors: cfg.impostors, readingSec: cfg.readingSec }, serverNow()), true)} />
          <Big wide icon={<Home />} label="Cambia gioco" onClick={() => go('lobby', 'il menu dei giochi')} />
        </div>
      )
    } else if (game.status === 'reading') {
      body = <Big wide variant="primary" icon={<PlayCircle />} label="Inizia il primo giro" sub="Quando tutti hanno letto la parola" onClick={() => run('ha iniziato il primo giro dallo schermo', () => startTurns(), true)} />
    } else if (game.status === 'turns') {
      body = (
        <div className="flex flex-col gap-[1.4vh]">
          {finished ? (
            <div className="grid grid-cols-2 gap-[1.2vw]">
              <Big icon={<RotateCw />} label="Altro giro" onClick={() => run('ha avviato un altro giro dallo schermo', () => nextGiro(game.giro), true)} />
              <Big variant="primary" icon={<Vote />} label="Si vota" onClick={() => run('ha avviato il voto dallo schermo', () => startVoting(), true)} />
            </div>
          ) : (
            <>
              <Big wide variant="primary" icon={<ChevronRight />} label="Prossimo giocatore" sub={`Ora parla il Giocatore ${game.order[game.turnIndex]}`} onClick={() => run('ha chiamato il giocatore successivo dallo schermo', () => moveTurn(game, 1), true)} />
              <div className="grid grid-cols-2 gap-[1.2vw]">
                <Big icon={<ChevronLeft />} label="Indietro" disabled={game.turnIndex <= 0} onClick={() => run('è tornato al giocatore precedente dallo schermo', () => moveTurn(game, -1))} />
                <Big variant="secondary" icon={<Vote />} label="Passa al voto" onClick={() => run('ha avviato il voto dallo schermo', () => startVoting(), true)} />
              </div>
            </>
          )}
        </div>
      )
    } else if (game.status === 'voting') {
      body = <Big wide variant="primary" icon={<Eye />} label="Mostra il risultato" sub="Quando tutti hanno votato" onClick={() => run('ha rivelato l’impostore dallo schermo', () => revealRound(), true)} />
    }
  }

  // nella lobby la scelta dei giochi è già sullo schermo (tasti grandi): niente pulsante che li copra
  if (!body || mode === 'lobby') return null

  return (
    <>
      {!open && (
        <button
          data-testid="screen-controls-handle"
          onClick={() => setOpen(true)}
          className="fixed bottom-[1.2vh] left-1/2 -translate-x-1/2 z-[120] flex items-center gap-[.7vw] rounded-full bg-surface-2/85 border border-white/20 backdrop-blur px-[1.6vw] py-[1vh] text-[1.4vw] font-bold text-white shadow-2xl active:scale-95 transition opacity-75 hover:opacity-100"
        >
          <SlidersHorizontal className="w-[1.9vw] h-[1.9vw] text-ice" /> Comandi
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center pb-[3vh] bg-black/40 backdrop-blur-[2px]" data-kiosk-scroll onPointerDown={keepOpen}>
          <div className="absolute inset-0" onClick={() => setOpen(false)} />
          <div className="relative card bg-surface w-[min(70vw,1300px)] p-[2vw] flex flex-col gap-[2vh] shadow-[0_30px_100px_-30px_rgba(47,147,240,.8)] ring-1 ring-brand/40">
            <div className="flex items-center justify-between">
              <h2 className="display text-white text-[3vw]">{title}</h2>
              <button className="btn btn-icon !p-[1vh] rounded-full" aria-label="Chiudi" onClick={() => setOpen(false)}><X className="w-[2.4vw] h-[2.4vw]" /></button>
            </div>
            {body}
            {err && <p className="text-bad text-[1.5vw]">{err}</p>}
          </div>
        </div>
      )}
    </>
  )
}

function Big({ icon, label, sub, onClick, variant, wide, disabled }: { icon: ReactNode; label: string; sub?: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'success' | 'danger'; wide?: boolean; disabled?: boolean }) {
  const v = variant ? `btn-${variant}` : ''
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`btn ${v} ${wide ? 'w-full' : ''} min-h-[10vh] !rounded-2xl !px-[1.6vw] !py-[1.4vh] ${sub ? 'flex-col !gap-[.4vh]' : 'flex-col sm:flex-row !gap-[1vw]'} text-[2vw]`}
    >
      <span className="flex items-center gap-[1vw] [&>svg]:w-[2.8vw] [&>svg]:h-[2.8vw] [&>svg]:shrink-0">{icon}<span className="font-extrabold">{label}</span></span>
      {sub && <span className="text-[1.3vw] font-medium opacity-80 normal-case">{sub}</span>}
    </button>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-[1.4vw] py-[1vh] text-[1.5vw] font-bold transition active:scale-95 ${on ? 'bg-brand border-ice text-white' : 'bg-white/[.06] border-line text-white/80'}`}>{children}</button>
  )
}
