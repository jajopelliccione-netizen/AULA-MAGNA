import { useEffect, useState } from 'react'
import { StaffGate } from '../../components/StaffGate'
import { useAppState, useGame, usePlayers, usePresence, useQueue } from '../../lib/hooks'
import { ensureInitialDocs } from '../../lib/actions'
import { Logo } from '../../components/Logo'
import { BRAND } from '../../lib/brand'
import KaraokeScreen from './KaraokeScreen'
import ImpostorScreen from './ImpostorScreen'
import { LobbyScreen, PauseScreen } from './LobbyScreen'

export default function ScreenPage() {
  return (
    <StaffGate title="Accesso schermo proiettore">
      <ScreenInner />
    </StaffGate>
  )
}

function ScreenInner() {
  const [started, setStarted] = useState(false)
  const { data: state, ready } = useAppState()
  const { queue } = useQueue()
  const { data: game } = useGame()
  const { players } = usePlayers(state.mode === 'impostor')
  const { count } = usePresence()

  useEffect(() => {
    ensureInitialDocs().catch((e) => console.error('ensureInitialDocs', e))
  }, [])

  // cursore nascosto sul proiettore
  useEffect(() => {
    document.body.style.cursor = started ? 'none' : ''
    return () => { document.body.style.cursor = '' }
  }, [started])

  if (!started) {
    return (
      <div className="h-full bg-aurora grid place-items-center">
        <button
          onClick={() => {
            setStarted(true)
            document.documentElement.requestFullscreen?.().catch(() => {})
          }}
          className="flex flex-col items-center gap-[3vh] rounded-[3vw] px-[6vw] py-[6vh] bg-panel/80 box-glow-pink hover:scale-105 transition"
        >
          <Logo size={Math.round(window.innerHeight * 0.22)} />
          <div className="text-center">
            <div className="text-[6vw] leading-none font-black text-neon-pink text-glow-pink">{BRAND.title}</div>
            <div className="text-[3.4vw] font-extrabold text-neon-cyan mt-[1vh]">{BRAND.school} · {BRAND.city}</div>
          </div>
          <span className="text-[4vw] font-black text-neon-lime text-glow-lime">▶ Clicca per avviare</span>
          <span className="text-[1.5vw] text-white/60">Serve per attivare l'audio del browser · {BRAND.school}</span>
        </button>
      </div>
    )
  }

  if (!ready) return <div className="h-full bg-aurora grid place-items-center text-[3vw] text-white/60">Mi collego…</div>

  return (
    <div className="h-screen w-screen overflow-hidden bg-ink relative">
      {/* Il karaoke resta montato per tenere vivo il player */}
      <KaraokeScreen state={state} queue={queue} active={state.mode === 'karaoke'} />
      {state.mode === 'lobby' && <div className="absolute inset-0"><LobbyScreen online={count} /></div>}
      {state.mode === 'pause' && <div className="absolute inset-0"><PauseScreen message={state.message} /></div>}
      {state.mode === 'impostor' && <div className="absolute inset-0"><ImpostorScreen game={game} players={players} /></div>}
    </div>
  )
}
