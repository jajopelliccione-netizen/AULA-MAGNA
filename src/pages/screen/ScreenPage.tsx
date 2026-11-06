import { useEffect, useState } from 'react'
import { StaffGate } from '../../components/StaffGate'
import { ScreenStart } from '../../components/ScreenStart'
import { useAppState, useGame, usePlayers, usePresence, useQueue, useServerClock } from '../../lib/hooks'
import { ensureInitialDocs } from '../../lib/actions'
import { useOutdated } from '../../lib/version'
import KaraokeStage from './KaraokeStage'
import ImpostorScreen from './ImpostorScreen'
import { LobbyScreen, PauseScreen } from './LobbyScreen'

export default function ScreenPage() {
  return (
    <StaffGate title="Schermo proiettore" subtitle="Area riservata: accedi con l'account dell'organizzazione">
      <ScreenInner />
    </StaffGate>
  )
}

function ScreenInner() {
  const [started, setStarted] = useState(false)
  const { data: state, ready } = useAppState()
  const kind = state.mode === 'music' ? 'music' : 'karaoke'
  const { queue } = useQueue(kind)
  const { data: game } = useGame()
  const { players } = usePlayers(state.mode === 'impostor')
  const { count } = usePresence()
  const serverNow = useServerClock()
  const outdated = useOutdated()

  // nuova versione del sito: ricarica da solo, ma solo quando non c'è un brano o una partita in corso
  const idle = !state.nowPlaying && state.playerStatus !== 'between' && (state.mode !== 'impostor' || game.status === 'lobby' || game.status === 'reveal')
  useEffect(() => {
    if (outdated && idle) window.location.reload()
  }, [outdated, idle])

  useEffect(() => {
    ensureInitialDocs().catch((e) => console.error('ensureInitialDocs', e))
  }, [])

  useEffect(() => {
    document.body.style.cursor = started ? 'none' : ''
    return () => { document.body.style.cursor = '' }
  }, [started])

  if (!started) return <ScreenStart label="Schermo proiettore" hint="Il clic serve per attivare l'audio del browser" onStart={() => setStarted(true)} />
  if (!ready) return <div className="h-full bg-stage grid place-items-center eyebrow text-[2vw]">Mi collego…</div>

  return (
    <div className="h-screen w-screen overflow-hidden bg-ink relative">
      {/* Karaoke e musica restano montati per tenere vivo il player */}
      <KaraokeStage state={state} queue={queue} active={state.mode === 'karaoke' || state.mode === 'music'} kind={kind} serverNow={serverNow} />
      {state.mode === 'lobby' && <div className="absolute inset-0"><LobbyScreen online={count} /></div>}
      {state.mode === 'pause' && <div className="absolute inset-0"><PauseScreen message={state.message} /></div>}
      {state.mode === 'impostor' && <div className="absolute inset-0"><ImpostorScreen game={game} players={players} serverNow={serverNow} /></div>}
    </div>
  )
}
