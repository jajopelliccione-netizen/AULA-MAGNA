import { useCallback, useEffect, useState } from 'react'
import { StaffGate } from '../../components/StaffGate'
import { useScreenSelf } from '../../lib/screens'
import { ScreenUpdateChip } from '../../components/UpdateBanner'
import { ScreenStart } from '../../components/ScreenStart'
import { useAppState, useGame, usePlayers, usePresence, useQueue, useServerClock } from '../../lib/hooks'
import { ensureInitialDocs } from '../../lib/actions'
import { useOutdated } from '../../lib/version'
import { useAutoApprove } from '../../lib/autoApprove'
import { allowReload, limRequested, saveLim, saveSecond, secondRequested, useKioskLock } from '../../lib/kiosk'
import { KioskLayer } from '../../components/KioskLayer'
import KaraokeStage from './KaraokeStage'
import ImpostorScreen from './ImpostorScreen'
import { LobbyScreen, PauseScreen } from './LobbyScreen'
import ScreenDock from './ScreenDock'

export default function ScreenPage() {
  return (
    <StaffGate title="Schermo proiettore" subtitle="Area riservata: accedi con l'account dell'organizzazione">
      <ScreenInner />
    </StaffGate>
  )
}

function ScreenInner() {
  const [started, setStarted] = useState(false)
  const [lim, setLim] = useState(limRequested)
  const [second, setSecond] = useState(secondRequested)
  const [dockH, setDockH] = useState(0)
  const onDockHeight = useCallback((h: number) => setDockH(h), [])
  const { data: state, ready, error: stateError, hasData } = useAppState()
  const kind = state.mode === 'music' ? 'music' : 'karaoke'
  const { queue, all: allRequests } = useQueue(kind)
  const { data: game } = useGame()
  const { players } = usePlayers(state.mode === 'impostor')
  const { count } = usePresence()
  const serverNow = useServerClock()
  const screenName = useScreenSelf(second ? 'secondo' : 'principale', lim, started)
  const kiosk = useKioskLock(lim, started, state.kioskUnlock)
  const outdated = useOutdated()
  useAutoApprove(state, allRequests, ready && !second)


  useEffect(() => {
    ensureInitialDocs().catch((e) => console.error('ensureInitialDocs', e))
  }, [])

  useEffect(() => {
    document.body.style.cursor = started ? 'none' : ''
    return () => { document.body.style.cursor = '' }
  }, [started])

  if (!started) return <ScreenStart label="Schermo proiettore" hint="Il clic serve per attivare l'audio del browser" lim={lim} onLim={(v) => { setLim(v); saveLim(v) }} second={second} onSecond={(v) => { setSecond(v); saveSecond(v) }} onStart={() => setStarted(true)} />
  if (!ready || !hasData) return <div className="h-full bg-stage flex flex-col items-center justify-center gap-[2vh]"><div className="eyebrow text-[2vw]">Mi collego…</div>{stateError && <div className="text-[1.4vw] text-warn max-w-[60vw] text-center">Il server non risponde ({stateError}). Riprovo da solo, non serve ricaricare.</div>}</div>

  // altezza della barra comandi → fattore di riduzione del gioco (1 = nessuna barra)
  const scale = state.screenControls && dockH > 0 ? Math.max(0.7, (window.innerHeight - dockH) / window.innerHeight) : 1

  return (
    <div className="h-screen w-screen overflow-hidden bg-ink relative">
      <KioskLayer kiosk={kiosk} />
      {stateError && <div className="fixed top-[1vh] left-1/2 -translate-x-1/2 z-[80] rounded-full bg-warn/90 text-black px-[1.4vw] py-[.6vh] text-[1.2vw] font-semibold">Collegamento interrotto ({stateError}): riprovo da solo</div>}
      {outdated && <ScreenUpdateChip onReload={() => { allowReload(); window.location.reload() }} />}
      {/* Con i comandi touch la schermata di gioco si rimpicciolisce per lasciare spazio alla barra in basso: nulla viene coperto */}
      <div className="absolute left-0 top-0 w-screen h-screen origin-top" style={{ transform: `scale(${scale})`, transition: 'transform .25s ease' }}>
      {/* Karaoke e musica restano montati per tenere vivo il player */}
      <KaraokeStage venue={screenName} follower={second} state={state} queue={queue} active={state.mode === 'karaoke' || state.mode === 'music'} kind={kind} serverNow={serverNow} />
      {state.mode === 'lobby' && <div className="absolute inset-0"><LobbyScreen online={count} venue={screenName} /></div>}
      {state.mode === 'pause' && <div className="absolute inset-0"><PauseScreen message={state.message} /></div>}
      {state.mode === 'impostor' && <div className="absolute inset-0"><ImpostorScreen game={game} players={players} serverNow={serverNow} /></div>}
      </div>
      {state.screenControls && <ScreenDock state={state} game={game} players={players} queue={queue} serverNow={serverNow} onHeight={onDockHeight} />}
    </div>
  )
}
