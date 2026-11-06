/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { loadYT } from '../lib/yt'
import { publishSync } from '../lib/actions'
import type { AppState } from '../lib/types'

interface Props {
  state: AppState
  /** false = il player resta caricato ma in pausa (modalità diversa da karaoke) */
  active: boolean
  /** master = schermo del proiettore (manda avanti la coda e pubblica la posizione); follower = gobbo */
  role: 'master' | 'follower'
  muted?: boolean
  serverNow: () => number
  onEnded?: (queueId: string) => void
  onError?: (queueId: string) => void
}

/**
 * Player YouTube a tutto riquadro. Il master pubblica la posizione del video su Firestore
 * e il follower si riallinea da solo (se scarta più di ~1,2 secondi fa un seek).
 */
export default function KaraokePlayer({ state, active, role, muted = false, serverNow, onEnded, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const readyRef = useRef(false)
  const loadedRef = useRef<string | null>(null)
  const lastPub = useRef<{ queueId: string; base: number; paused: boolean } | null>(null)
  // Safari/iPad blocca l'avvio automatico con audio: in quel caso il video parte muto e serve un tocco
  const mutedFallback = useRef(false)
  const blockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [tap, setTap] = useState<'none' | 'unmute' | 'native'>('none')

  const stateRef = useRef(state)
  const activeRef = useRef(active)
  const mutedRef = useRef(muted)
  const nowRef = useRef(serverNow)
  const cbRef = useRef({ onEnded, onError })
  stateRef.current = state
  activeRef.current = active
  mutedRef.current = muted
  nowRef.current = serverNow
  cbRef.current = { onEnded, onError }

  const applyVolume = () => {
    const p = playerRef.current
    if (!p || !readyRef.current) return
    const s = stateRef.current
    if (role === 'follower' && mutedRef.current) {
      p.mute?.()
    } else {
      if (!mutedFallback.current) p.unMute?.()
      p.setVolume?.(s.volume)
    }
  }

  const expectedPos = (): number | null => {
    const s = stateRef.current
    const sy = s.sync
    if (!s.nowPlaying || !sy || sy.queueId !== s.nowPlaying.queueId) return null
    return sy.paused ? sy.pos : Math.max(0, (nowRef.current() - sy.base) / 1000)
  }

  const publish = (force = false) => {
    const p = playerRef.current
    const np = stateRef.current.nowPlaying
    if (role !== 'master' || !p || !np || !readyRef.current) return
    const pos = Number(p.getCurrentTime?.() ?? 0)
    const paused = stateRef.current.playerStatus === 'paused'
    const base = Math.round(nowRef.current() - pos * 1000)
    const last = lastPub.current
    if (!force && last && last.queueId === np.queueId && last.paused === paused && (paused || Math.abs(base - last.base) < 1200)) return
    lastPub.current = { queueId: np.queueId, base, paused }
    publishSync({ queueId: np.queueId, base, paused, pos }).catch(() => {})
  }

  const fallbackMuted = () => {
    const p = playerRef.current
    if (!p || !readyRef.current) return
    mutedFallback.current = true
    p.mute?.()
    p.playVideo?.()
    setTap('unmute')
  }

  // se dopo qualche secondo il video non sta partendo, il browser ha bloccato l'avvio automatico
  const armBlockCheck = (queueId: string) => {
    clearTimeout(blockTimer.current)
    blockTimer.current = setTimeout(() => {
      const p = playerRef.current
      const s = stateRef.current
      if (!p || !readyRef.current || loadedRef.current !== queueId) return
      if (!activeRef.current || s.playerStatus !== 'playing') return
      const st = p.getPlayerState?.()
      if (st === 1 || st === 3) return // in riproduzione o in caricamento
      fallbackMuted()
    }, 3500)
  }

  const onTap = () => {
    const p = playerRef.current
    if (!p) return
    mutedFallback.current = false
    p.unMute?.()
    p.setVolume?.(stateRef.current.volume)
    p.playVideo?.()
    setTimeout(() => {
      if (p.isMuted?.()) {
        // il browser non ha concesso l'audio: si rende toccabile il lettore di YouTube
        mutedFallback.current = true
        setTap('native')
      } else {
        setTap('none')
      }
    }, 900)
  }

  const sync = () => {
    const p = playerRef.current
    if (!p || !readyRef.current) return
    const s = stateRef.current
    const np = s.nowPlaying
    applyVolume()
    if (!np) {
      if (loadedRef.current) {
        p.stopVideo?.()
        loadedRef.current = null
        lastPub.current = null
        clearTimeout(blockTimer.current)
        mutedFallback.current = false
        setTap('none')
      }
      return
    }
    if (loadedRef.current !== np.queueId) {
      const start = role === 'follower' ? expectedPos() : null
      p.loadVideoById(start && start > 2 ? { videoId: np.videoId, startSeconds: start } : np.videoId)
      loadedRef.current = np.queueId
      lastPub.current = null
      mutedFallback.current = false
      setTap('none')
    }
    if (!activeRef.current || s.playerStatus === 'paused') {
      p.pauseVideo?.()
      clearTimeout(blockTimer.current)
    } else {
      p.playVideo?.()
      armBlockCheck(np.queueId)
    }
  }

  // creazione del player (una sola volta)
  useEffect(() => {
    let dead = false
    loadYT().then((YT) => {
      if (dead || !hostRef.current) return
      const el = document.createElement('div')
      hostRef.current.appendChild(el)
      playerRef.current = new YT.Player(el, {
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, disablekb: 1, fs: 0, origin: window.location.origin },
        events: {
          onReady: () => {
            readyRef.current = true
            sync()
          },
          onStateChange: (e: any) => {
            const np = stateRef.current.nowPlaying
            if (!np || np.queueId !== loadedRef.current) return
            if (e.data === YT.PlayerState.ENDED && role === 'master') cbRef.current.onEnded?.(np.queueId)
            else if (e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.PAUSED) publish(e.data === YT.PlayerState.PAUSED)
          },
          onAutoplayBlocked: () => {
            const np = stateRef.current.nowPlaying
            if (np && np.queueId === loadedRef.current && activeRef.current) fallbackMuted()
          },
          onError: () => {
            const np = stateRef.current.nowPlaying
            if (role === 'master' && np && np.queueId === loadedRef.current) cbRef.current.onError?.(np.queueId)
          },
        },
      })
    })
    return () => {
      dead = true
      try { playerRef.current?.destroy?.() } catch { /* ok */ }
      readyRef.current = false
      playerRef.current = null
      loadedRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "Ricomincia": l'admin incrementa restartNonce -> il video riparte da 0:00 e il gobbo si riallinea
  const restartRef = useRef(state.restartNonce)
  useEffect(() => {
    if (state.restartNonce === restartRef.current) return
    restartRef.current = state.restartNonce
    if (role !== 'master') return
    const p = playerRef.current
    const np = stateRef.current.nowPlaying
    if (!p || !readyRef.current || !np || loadedRef.current !== np.queueId) return
    p.seekTo?.(0, true)
    if (activeRef.current) p.playVideo?.()
    const base = Math.round(nowRef.current())
    lastPub.current = { queueId: np.queueId, base, paused: false }
    publishSync({ queueId: np.queueId, base, paused: false, pos: 0 }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.restartNonce])

  useEffect(sync, [state.nowPlaying?.queueId, state.playerStatus, state.volume, active, muted])

  // master: ripubblica la posizione se cambia (seek, buffering); follower: si riallinea
  useEffect(() => {
    const t = setInterval(() => {
      const p = playerRef.current
      if (!p || !readyRef.current || !activeRef.current) return
      const s = stateRef.current
      if (!s.nowPlaying || loadedRef.current !== s.nowPlaying.queueId) return
      if (role === 'master') {
        if (s.playerStatus === 'playing') publish()
        return
      }
      const exp = expectedPos()
      if (exp === null) return
      const cur = Number(p.getCurrentTime?.() ?? 0)
      if (Math.abs(cur - exp) > (s.sync?.paused ? 0.6 : 1.2)) p.seekTo?.(exp, true)
    }, 1500)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  return (
    <>
      <div ref={hostRef} className={`yt-host absolute inset-0 ${tap === 'native' ? 'interactive' : ''}`} />
      {tap === 'unmute' && (
        <button className="absolute inset-0 z-20 grid place-items-center bg-black/55 backdrop-blur-[2px]" onClick={onTap}>
          <span className="card flex flex-col items-center gap-[1.4vh] px-[3vw] py-[3vh] ring-1 ring-brand/60">
            <VolumeX className="w-[6vw] h-[6vw] text-ice" />
            <span className="display text-white text-[3.4vw]">Tocca per attivare l’audio</span>
            <span className="text-[1.4vw] text-muted">Il browser ha bloccato l’avvio automatico</span>
          </span>
        </button>
      )}
      {tap === 'native' && (
        <div className="absolute top-[1.5vw] left-1/2 -translate-x-1/2 z-20 chip !px-[1.4vw] !py-[.8vh] text-[1.5vw] border-brand/60 bg-brand/25 text-white pointer-events-none">
          <Volume2 className="w-[1.7vw] h-[1.7vw]" /> Tocca l’icona dell’audio sul video
        </div>
      )}
    </>
  )
}
