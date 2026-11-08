/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { loadYT } from '../lib/yt'
import { publishSync } from '../lib/actions'
import type { AppState } from '../lib/types'

// iPad/iPhone: lì il browser è severo con l'audio e con i salti su video muti, quindi niente fase «muta» di allineamento
const IS_IOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

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
 * e il follower si riallinea da solo (se scarta più di ~0,35 secondi fa un seek).
 */
export default function KaraokePlayer({ state, active, role, muted = false, serverNow, onEnded, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const readyRef = useRef(false)
  const loadedRef = useRef<string | null>(null)
  const lastPub = useRef<{ queueId: string; base: number; paused: boolean } | null>(null)
  // Il video parte SEMPRE muto (l'avvio muto è permesso da tutti i browser), poi si prova a riattivare l'audio.
  // Su Safari/iPad l'audio senza un tocco non è concesso: il video resta muto e compare «Tocca per attivare l'audio».
  const keepMuted = useRef(false)
  const attempting = useRef(false)
  const lastSeek = useRef(0)
  const seekAt = useRef(0)
  const seekBuffered = useRef(false)
  const lagMs = useRef(0)
  const driftSince = useRef(0)
  const loadAt = useRef(0)
  // secondo schermo: resta muto finché non è allineato, così gli aggiustamenti iniziali non si sentono
  const aligned = useRef(false)
  const prog = useRef({ time: -1, at: 0, handledAt: 0 })
  const pubTick = useRef(0)
  const blockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [tap, setTapState] = useState<'none' | 'unmute' | 'native'>('none')
  const tapRef = useRef<'none' | 'unmute' | 'native'>('none')
  const setTap = (t: 'none' | 'unmute' | 'native') => { tapRef.current = t; setTapState(t) }

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
      if (!keepMuted.current) p.unMute?.()
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
    if (!force && last && last.queueId === np.queueId && last.paused === paused && (paused || Math.abs(base - last.base) < 120)) return
    lastPub.current = { queueId: np.queueId, base, paused }
    publishSync({ queueId: np.queueId, base, paused, pos }).catch(() => {})
  }

  // prova a riattivare l'audio dopo che il video è partito
  const tryUnmute = () => {
    const p = playerRef.current
    if (!p || attempting.current) return
    attempting.current = true
    setTimeout(() => {
      if (!playerRef.current) return
      p.unMute?.()
      p.setVolume?.(stateRef.current.volume)
      setTimeout(() => {
        attempting.current = false
        if (!playerRef.current) return
        const st = p.getPlayerState?.()
        if (p.isMuted?.() || (st !== 1 && st !== 3)) {
          // audio non concesso: il video continua muto e si chiede un tocco
          p.mute?.()
          if (st !== 1 && st !== 3) p.playVideo?.()
          setTap('unmute')
        } else {
          keepMuted.current = false
          setTap('none')
        }
      }, 700)
    }, 250)
  }

  // ultima rete di sicurezza: se dopo un paio di secondi il video non sta partendo nemmeno muto
  const fallbackMuted = () => {
    const p = playerRef.current
    if (!p || !readyRef.current) return
    keepMuted.current = true
    p.mute?.()
    p.playVideo?.()
    setTap('unmute')
  }

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
    }, 2000)
  }

  const onTap = () => {
    const p = playerRef.current
    if (!p) return
    keepMuted.current = false
    p.unMute?.()
    p.setVolume?.(stateRef.current.volume)
    p.playVideo?.()
    setTimeout(() => {
      if (p.isMuted?.()) {
        // il browser non ha concesso l'audio: si rende toccabile il lettore di YouTube
        keepMuted.current = true
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
        keepMuted.current = false
        attempting.current = false
        setTap('none')
      }
      return
    }
    if (loadedRef.current !== np.queueId) {
      const start = role === 'follower' ? expectedPos() : null
      // parte muto: l'avvio automatico muto funziona ovunque; l'audio si riattiva appena il video è in riproduzione
      if (!(role === 'follower' && mutedRef.current)) {
        keepMuted.current = true
        p.mute?.()
      }
      attempting.current = false
      p.loadVideoById(start && start > 2 ? { videoId: np.videoId, startSeconds: start } : np.videoId)
      loadedRef.current = np.queueId
      lastPub.current = null
      seekAt.current = 0
      seekBuffered.current = false
      driftSince.current = 0
      loadAt.current = Date.now()
      aligned.current = role !== 'follower' || IS_IOS
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
            if (e.data === YT.PlayerState.BUFFERING && seekAt.current) seekBuffered.current = true
            if (e.data === YT.PlayerState.PLAYING && seekAt.current) {
              // il ritardo si impara solo se dopo il seek il video ha davvero caricato; altrimenti il seek è stato immediato
              const lag = seekBuffered.current ? Date.now() - seekAt.current : 0
              if (lag < 4000) lagMs.current = Math.min(1500, lagMs.current ? lagMs.current * 0.3 + lag * 0.7 : lag)
              seekAt.current = 0
              seekBuffered.current = false
            }
            if (e.data === YT.PlayerState.PLAYING && keepMuted.current && !(role === 'follower' && mutedRef.current) && aligned.current) tryUnmute()
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
      // rete di sicurezza: se il video è fermo (pausa di YouTube con titolo e «Altri video») ma doveva andare, lo rimette in riproduzione
      if (s.playerStatus === 'playing' && tapRef.current === 'none') {
        const st = p.getPlayerState?.()
        // non insistere mentre il video si sta ancora avviando: richiamare play a raffica può ritardarlo
        if (st === 2 || ((st === 5 || st === -1) && Date.now() - loadAt.current > 4000)) p.playVideo?.()
      }
      // video che «carica e basta»: se il tempo non avanza da qualche secondo mentre dovrebbe suonare, il browser lo ha bloccato
      // (tipico di iPad/Safari): si mostra «Tocca per attivare l'audio», e il tocco lo fa partire
      {
        const ct = Number(p.getCurrentTime?.() ?? 0)
        const pr = prog.current
        const nowMs = Date.now()
        if (Math.abs(ct - pr.time) > 0.05 || pr.time < 0) { pr.time = ct; pr.at = nowMs }
        else if (s.playerStatus === 'playing' && tapRef.current === 'none' && nowMs - pr.at > 4500 && nowMs - loadAt.current > 6000 && nowMs - pr.handledAt > 8000) {
          pr.handledAt = nowMs
          fallbackMuted()
        }
      }
      if (role === 'master') {
        pubTick.current = (pubTick.current + 1) % 5
        if (s.playerStatus === 'playing' && pubTick.current === 0) publish()
        return
      }
      // rete di sicurezza: l'audio del secondo schermo si accende comunque entro pochi secondi dall'avvio, qualunque cosa succeda
      if (!aligned.current && Date.now() - loadAt.current > 5000) {
        aligned.current = true
        if (keepMuted.current && !mutedRef.current) tryUnmute()
      }
      const exp = expectedPos()
      if (exp === null) {
        // il principale non ha (ancora) pubblicato la posizione: dopo qualche secondo si accende comunque l'audio
        if (!aligned.current && Date.now() - loadAt.current > 9000) {
          aligned.current = true
          if (keepMuted.current && !mutedRef.current) tryUnmute()
        }
        return
      }
      const cur = Number(p.getCurrentTime?.() ?? 0)
      if (seekAt.current && Date.now() - seekAt.current > 3000) { seekAt.current = 0; seekBuffered.current = false }
      const drift = cur - exp // > 0: questo schermo è avanti
      const ad = Math.abs(drift)
      const paused = !!s.sync?.paused
      const t = Date.now()
      const st = p.getPlayerState?.()
      if (paused) {
        if (ad > 0.15 && st !== 3 && t - lastSeek.current > 1500) { lastSeek.current = t; p.seekTo?.(exp, true) }
        return
      }
      // mai toccare il video mentre sta caricando (altrimenti il «caricamento» non finisce più) né subito dopo un salto o un avvio
      if (st !== 1) { driftSince.current = 0; return }
      if (t - lastSeek.current < 3000 || t - loadAt.current < 2500) { driftSince.current = 0; return }
      // Nessuna accelerazione né rallentamento (su YouTube fanno suonare la voce veloce e a scatti).
      // All'inizio il secondo schermo resta MUTO mentre si allinea (uno o due salti che non si sentono); quando è allineato
      // accende l'audio e da lì in poi non lo tocca più, salvo scarti grandi e duraturi (es. dopo un blocco della rete).
      if (!aligned.current) {
        if (ad > 0.3) { if (!driftSince.current) driftSince.current = t } else driftSince.current = 0
        const need = driftSince.current > 0 && t - driftSince.current > 800 && t - lastSeek.current > 3000
        if (need) {
          driftSince.current = 0
          lastSeek.current = t
          seekAt.current = t
          seekBuffered.current = false
          p.seekTo?.(exp + lagMs.current / 1000, true)
        } else if (ad <= 0.3 || t - loadAt.current > 9000) {
          aligned.current = true
          if (keepMuted.current && !mutedRef.current) tryUnmute()
        }
        return
      }
      if (ad > 1.2) { if (!driftSince.current) driftSince.current = t } else driftSince.current = 0
      const sustained = driftSince.current > 0 && t - driftSince.current > 3000
      if ((ad > 3 && t - lastSeek.current > 3000) || (sustained && t - lastSeek.current > 10000)) {
        driftSince.current = 0
        lastSeek.current = t
        seekAt.current = t
        seekBuffered.current = false
        p.seekTo?.(exp + lagMs.current / 1000, true)
      }
    }, 200)
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
