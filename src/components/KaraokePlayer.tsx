/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { loadYT } from '../lib/yt'
import { publishSync } from '../lib/actions'
import type { AppState } from '../lib/types'

// iPad/iPhone: lì il browser è severo con l'audio e con i salti su video muti, quindi niente fase «muta» di allineamento
const IS_IOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

// Modalità leggera: il lettore YouTube viene tenuto a 854×480 e ingrandito con CSS. YouTube sceglie la qualità in base alla
// grandezza del lettore, quindi scarica molto meno (utile con Wi-Fi lento o dispositivi deboli). ?leggero la forza.
const LOWRES_URL = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('leggero')
const LW = 854
const LH = 480
const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')

interface Props {
  state: AppState
  /** false = il player resta caricato ma in pausa (modalità diversa da karaoke) */
  active: boolean
  /** master = schermo del proiettore (manda avanti la coda e pubblica la posizione); follower = gobbo */
  role: 'master' | 'follower'
  muted?: boolean
  /** anticipo regolato dall'admin per questo schermo (ms) */
  offsetMs?: number
  /** il prossimo video in coda: viene preparato in anticipo, così all'avvio parte più in fretta */
  nextVideoId?: string
  serverNow: () => number
  onEnded?: (queueId: string) => void
  onError?: (queueId: string) => void
}

/**
 * Player YouTube a tutto riquadro. Il master pubblica la posizione del video su Firestore
 * e il follower si riallinea da solo (se scarta più di ~0,35 secondi fa un seek).
 */
export default function KaraokePlayer({ state, active, role, muted = false, offsetMs = 0, nextVideoId, serverNow, onEnded, onError }: Props) {
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
  const buf = useRef({ since: 0, retries: 0, queueId: '' })
  const [diag, setDiag] = useState('')
  const [lowRes, setLowRes] = useState(() => LOWRES_URL || (role === 'follower' && IS_IOS))
  const [box, setBox] = useState({ w: 0, h: 0 })
  const pubTick = useRef(0)
  const blockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [tap, setTapState] = useState<'none' | 'unmute' | 'native'>('none')
  const tapRef = useRef<'none' | 'unmute' | 'native'>('none')
  const setTap = (t: 'none' | 'unmute' | 'native') => { tapRef.current = t; setTapState(t) }

  const stateRef = useRef(state)
  const activeRef = useRef(active)
  const mutedRef = useRef(muted)
  const restartAt = useRef(0)
  const diagAt = useRef(0)
  const cuedRef = useRef('')
  const nowRef = useRef(serverNow)
  const offsetRef = useRef(offsetMs)
  offsetRef.current = offsetMs
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
    const adj = role === 'follower' ? offsetRef.current / 1000 : 0
    return sy.paused ? sy.pos + adj : Math.max(0, (nowRef.current() - sy.base) / 1000 + adj)
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
      p.loadVideoById({ videoId: np.videoId, ...(start && start > 2 ? { startSeconds: start } : {}), ...(lowRes ? { suggestedQuality: 'medium' } : {}) })
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

  // l'admin cambia l'anticipo di questo schermo: dopo un attimo si riallinea subito (un solo salto)
  const lastOffset = useRef(offsetMs)
  useEffect(() => {
    if (lastOffset.current === offsetMs) return
    lastOffset.current = offsetMs
    const tm = setTimeout(() => {
      const p = playerRef.current
      if (!p || !readyRef.current || role !== 'follower' || p.getPlayerState?.() !== 1) return
      const e = expectedPos()
      if (e === null) return
      lastSeek.current = Date.now()
      seekAt.current = Date.now()
      seekBuffered.current = false
      p.seekTo?.(e + lagMs.current / 1000, true)
    }, 1000)
    return () => clearTimeout(tm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offsetMs])

  // misura del riquadro che contiene il video (serve alla modalità leggera)
  useEffect(() => {
    const el = hostRef.current?.parentElement
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // schermi leggeri (iPad…): niente sfocature né animazioni sopra il video, che su dispositivi deboli fanno andare a scatti
  useEffect(() => {
    document.documentElement.classList.toggle('perf', lowRes)
    return () => document.documentElement.classList.remove('perf')
  }, [lowRes])

  const k = lowRes && box.w > 0 ? Math.min(box.w / LW, box.h / LH) : 1
  const hostStyle = lowRes && box.w > 0 ? { width: LW, height: LH, left: (box.w - LW * k) / 2, top: (box.h - LH * k) / 2, transform: `scale(${k})`, transformOrigin: '0 0' } : undefined

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
    if (role !== 'master') {
      // «Da capo»: i secondi schermi seguono subito il principale
      restartAt.current = Date.now()
      lastSeek.current = 0
      driftSince.current = 0
      return
    }
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

  // tra una canzone e l'altra (conto alla rovescia / in attesa) si prepara già il prossimo video: all'avvio carica molto meno
  useEffect(() => {
    if (state.nowPlaying) { cuedRef.current = ''; return }
    if (!nextVideoId || !active || cuedRef.current === nextVideoId) return
    const tm = setTimeout(() => {
      const p = playerRef.current
      if (!p || !readyRef.current || stateRef.current.nowPlaying || !activeRef.current) return
      cuedRef.current = nextVideoId
      try { p.cueVideoById?.({ videoId: nextVideoId, suggestedQuality: lowRes ? 'medium' : undefined }) } catch { /* ok */ }
    }, 600)
    return () => clearTimeout(tm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nowPlaying?.queueId, nextVideoId, active])

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
      // «ruota del caricamento» che non finisce: dopo qualche secondo si ricarica il video da capo (più leggero), massimo 3 volte
      {
        const np = s.nowPlaying
        const bf = buf.current
        if (bf.queueId !== np.queueId) { bf.queueId = np.queueId; bf.retries = 0; bf.since = 0 }
        const st3 = p.getPlayerState?.()
        if (st3 === 3 && s.playerStatus === 'playing') {
          if (!bf.since) bf.since = Date.now()
          else if (Date.now() - bf.since > 8000 && bf.retries < 3) {
            bf.retries++
            bf.since = Date.now()
            const exp3 = role === 'follower' ? expectedPos() : null
            keepMuted.current = !(role === 'follower' && mutedRef.current)
            if (keepMuted.current) p.mute?.()
            p.loadVideoById({ videoId: np.videoId, startSeconds: exp3 && exp3 > 2 ? exp3 : 0, suggestedQuality: bf.retries >= 2 ? 'small' : 'medium' })
            p.setPlaybackQuality?.(bf.retries >= 2 ? 'small' : 'medium')
            setLowRes(true)
            loadAt.current = Date.now()
            aligned.current = role !== 'follower' || IS_IOS
          }
        } else bf.since = 0
        if (DEBUG && Date.now() - diagAt.current > 1000) {
          diagAt.current = Date.now()
          const e2 = role === 'follower' ? expectedPos() : null
          setDiag(`${role} stato=${st3} t=${Number(p.getCurrentTime?.() ?? 0).toFixed(1)} atteso=${e2 === null ? '-' : e2.toFixed(1)} muto=${p.isMuted?.() ? 'sì' : 'no'} anticipo=${offsetRef.current}ms allineato=${aligned.current ? 'sì' : 'no'} riprove=${bf.retries} ios=${IS_IOS ? 'sì' : 'no'} leggero=${lowRes ? 'sì' : 'no'}`)
        }
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
        pubTick.current = (pubTick.current + 1) % 2
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
      // subito dopo un «Da capo» si segue il principale al volo
      if (t - restartAt.current < 10000 && ad > 0.5 && t - lastSeek.current > 1500) {
        lastSeek.current = t
        seekAt.current = t
        seekBuffered.current = false
        p.seekTo?.(exp + lagMs.current / 1000, true)
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
    }, 500)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  return (
    <>
      <div ref={hostRef} style={hostStyle} className={`yt-host absolute ${hostStyle ? '' : 'inset-0'} ${tap === 'native' ? 'interactive' : ''}`} />
      {DEBUG && diag && <div className="absolute top-[1vw] left-[1vw] z-30 rounded bg-black/80 px-[1vw] py-[.6vh] text-[1.3vw] font-mono text-yellow-300 pointer-events-none">{diag}</div>}
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
