import { useState } from 'react'
import { StaffGate } from '../../components/StaffGate'
import { ScreenUpdateChip } from '../../components/UpdateBanner'
import { useScreenSelf } from '../../lib/screens'
import { ScreenStart } from '../../components/ScreenStart'
import KaraokePlayer from '../../components/KaraokePlayer'
import { Logo } from '../../components/Logo'
import { useAppState, useNow, useQueue, useServerClock } from '../../lib/hooks'
import { CountdownRing } from '../screen/KaraokeStage'
import { BRAND } from '../../lib/brand'
import { useOutdated } from '../../lib/version'
import { allowReload, limRequested, saveLim, useKioskLock } from '../../lib/kiosk'
import { KioskLayer } from '../../components/KioskLayer'
import { useEffect } from 'react'

export default function GobboPage() {
  return (
    <StaffGate title="Schermo gobbo" subtitle="Area riservata: accedi con l'account dell'organizzazione">
      <GobboInner />
    </StaffGate>
  )
}

/** Schermo per chi canta: solo il video con il testo, a tutto schermo, senza coda. */
function GobboInner() {
  const [started, setStarted] = useState(false)
  const [lim, setLim] = useState(limRequested)
  const { data: state, ready } = useAppState()
  const { queue } = useQueue('karaoke')
  const serverNow = useServerClock()
  useNow(100)
  useScreenSelf('gobbo', lim, started)
  const kiosk = useKioskLock(lim, started, state.kioskUnlock)
  const outdated = useOutdated()

  useEffect(() => {
    document.body.style.cursor = started ? 'none' : ''
    return () => { document.body.style.cursor = '' }
  }, [started])

  if (!started) return <ScreenStart label="Schermo gobbo · solo testo" hint="Mostra solo il video con il testo per chi canta" lim={lim} onLim={(v) => { setLim(v); saveLim(v) }} onStart={() => setStarted(true)} />

  const active = state.mode === 'karaoke'
  const np = state.nowPlaying
  const head = queue[0]
  const left = state.betweenEndsAt ? Math.max(0, state.betweenEndsAt - serverNow()) : 0

  return (
    <div className="h-screen w-screen overflow-hidden bg-black relative">
      <KioskLayer kiosk={kiosk} />
      {outdated && <ScreenUpdateChip onReload={() => { allowReload(); window.location.reload() }} />}
      {ready && <KaraokePlayer state={state} active={active} role="follower" muted={!state.gobboAudio} serverNow={serverNow} />}

      {/* in attesa: prima/dopo le canzoni o con un'altra modalità attiva */}
      {(!active || (!np && state.playerStatus !== 'between' && state.playerStatus !== 'waiting')) && (
        <div className="absolute inset-0 bg-stage flex flex-col items-center justify-center gap-[3vh] text-center">
          <Logo size={Math.round(window.innerHeight * 0.2)} className="anim-floaty" />
          <div className="display grad-text text-[7vw]">{BRAND.title}</div>
          <div className="eyebrow text-[1.8vw]">{active ? 'In attesa della prossima canzone' : state.mode === 'music' ? 'Modalità musica: il gobbo è a riposo' : 'Karaoke non attivo'}</div>
        </div>
      )}

      {active && !np && (state.playerStatus === 'between' || state.playerStatus === 'waiting') && head && (
        <div className="absolute inset-0 bg-stage flex flex-col items-center justify-center gap-[3vh] text-center px-[4vw]">
          <div className="eyebrow text-[2vw]">Tocca a</div>
          <div className="display grad-text text-[11vw] max-w-[90vw] truncate">{head.nickname}</div>
          <div className="text-[2.4vw] font-medium text-white/85 max-w-[70vw] line-clamp-2">{head.title}</div>
          {state.playerStatus === 'between' ? <CountdownRing left={left} size={Math.round(window.innerHeight * 0.3)} /> : <div className="eyebrow text-[2vw] anim-pulse">Preparati</div>}
        </div>
      )}

      {active && np && state.playerStatus === 'paused' && (
        <div className="absolute inset-0 grid place-items-center bg-black/60"><div className="display text-white text-[6vw]">In pausa</div></div>
      )}
    </div>
  )
}
