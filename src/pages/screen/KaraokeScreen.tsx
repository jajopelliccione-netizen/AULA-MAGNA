import { useEffect, useRef, useState } from 'react'
import type { AppState, QueueItem } from '../../lib/types'
import { BETWEEN_MS, beginBetween, finishCurrent, patchState, startNextSong } from '../../lib/actions'
import { useNow } from '../../lib/hooks'
import { loadYT } from './yt'
import { QR, shortUrl } from './QR'
import { Logo } from '../../components/Logo'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Contiene il player YouTube (sempre montato, così non si perde il brano se si cambia modalità)
 * e, quando la modalità è "karaoke", il controller che manda avanti la coda da solo.
 */
export default function KaraokeScreen({ state, queue, active }: { state: AppState; queue: QueueItem[]; active: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const readyRef = useRef(false)
  const loadedRef = useRef<string | null>(null)
  const busyRef = useRef(false)
  const stateRef = useRef(state)
  const queueRef = useRef(queue)
  const activeRef = useRef(active)
  stateRef.current = state
  queueRef.current = queue
  activeRef.current = active
  const [toast, setToast] = useState('')
  const now = useNow(200)

  const finish = async (reason?: string) => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      if (reason) {
        setToast(reason)
        setTimeout(() => setToast(''), 5000)
      }
      await finishCurrent(queueRef.current.length > 0)
    } catch (e) {
      console.error(e)
    } finally {
      busyRef.current = false
    }
  }

  const sync = () => {
    const p = playerRef.current
    if (!p || !readyRef.current) return
    const s = stateRef.current
    const np = s.nowPlaying
    p.setVolume?.(s.volume)
    if (!np) {
      if (loadedRef.current) {
        p.stopVideo?.()
        loadedRef.current = null
      }
      return
    }
    if (loadedRef.current !== np.queueId) {
      p.loadVideoById(np.videoId)
      loadedRef.current = np.queueId
    }
    if (!activeRef.current || s.playerStatus === 'paused') p.pauseVideo?.()
    else p.playVideo?.()
  }

  // creazione del player (una volta sola)
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
            // ENDED = 0: parte in automatico il brano successivo
            if (e.data === YT.PlayerState.ENDED) {
              const np = stateRef.current.nowPlaying
              if (activeRef.current && np && np.queueId === loadedRef.current) finish()
            }
          },
          onError: () => {
            const np = stateRef.current.nowPlaying
            if (activeRef.current && np && np.queueId === loadedRef.current) finish('Video non riproducibile: passo al prossimo')
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

  useEffect(sync, [state.nowPlaying?.queueId, state.playerStatus, state.volume, active])

  // controller della coda (solo se la modalità è karaoke)
  useEffect(() => {
    if (!active) return
    const t = setInterval(async () => {
      if (busyRef.current) return
      const s = stateRef.current
      const q = queueRef.current
      const nowMs = Date.now()
      busyRef.current = true
      try {
        if (s.nowPlaying) return
        if (s.playerStatus === 'between') {
          if (q.length === 0) await patchState({ playerStatus: 'idle', betweenEndsAt: null })
          else if (!s.betweenEndsAt) await patchState({ betweenEndsAt: nowMs + BETWEEN_MS })
          else if (nowMs >= s.betweenEndsAt) await startNextSong(q[0])
        } else if (q.length > 0) {
          await beginBetween()
        } else if (s.playerStatus !== 'idle') {
          await patchState({ playerStatus: 'idle', betweenEndsAt: null })
        }
      } catch (e) {
        console.error(e)
      } finally {
        busyRef.current = false
      }
    }, 500)
    return () => clearInterval(t)
  }, [active])

  // "salta": l'admin incrementa skipNonce
  const skipRef = useRef(state.skipNonce)
  useEffect(() => {
    if (state.skipNonce === skipRef.current) return
    skipRef.current = state.skipNonce
    if (!activeRef.current) return
    const s = stateRef.current
    if (s.nowPlaying) finish()
    else if (s.playerStatus === 'between' && queueRef.current.length > 0 && !busyRef.current) {
      busyRef.current = true
      startNextSong(queueRef.current[0]).catch(console.error).finally(() => { busyRef.current = false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.skipNonce])

  const np = state.nowPlaying
  const head = queue[0]
  const next5 = queue.slice(0, 5)
  const left = state.betweenEndsAt ? state.betweenEndsAt - now : 0

  return (
    <div className={`${active ? '' : 'hidden'} h-full w-full bg-aurora flex gap-[1.5vw] p-[1.5vw]`}>
      {/* Zona video */}
      <div className="relative flex-1 rounded-[1.5vw] overflow-hidden bg-black box-glow-cyan">
        <div ref={hostRef} className="yt-host absolute inset-0" />

        {np && (
          <div className="absolute left-0 top-0 right-0 p-[1.5vw] bg-gradient-to-b from-black/85 to-transparent pointer-events-none">
            <div className="flex items-center gap-[1vw]">
              <span className="text-[3vw]">🎤</span>
              <div className="min-w-0">
                <div className="text-[3.6vw] leading-none font-black text-neon-pink text-glow-pink truncate">{np.nickname}</div>
                <div className="text-[1.6vw] font-semibold text-white/90 truncate mt-[0.4vw]">{np.title}</div>
              </div>
            </div>
          </div>
        )}

        {np && state.playerStatus === 'paused' && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 text-[8vw] font-black text-neon-yellow">⏸ In pausa</div>
        )}

        {!np && state.playerStatus === 'between' && head && (
          <div className="absolute inset-0 bg-aurora flex flex-col items-center justify-center text-center gap-[2vh] px-[4vw]">
            <div className="text-[2.6vw] uppercase tracking-[0.3em] font-bold text-neon-cyan">Prossimo</div>
            <div className="text-[6.5vw] leading-none font-black text-neon-pink text-glow-pink anim-pulse">{head.nickname}</div>
            <div className="text-[2.8vw] font-bold text-white/90 max-w-[55vw] line-clamp-2">{head.title}</div>
            <div className="text-[14vw] leading-none font-black text-neon-lime text-glow-lime tabular-nums">{Math.max(0, Math.ceil(left / 1000))}</div>
            <div className="text-[2.2vw] font-semibold text-white/70">{head.nickname}, preparati e vai sul palco! 🎤</div>
          </div>
        )}

        {!np && state.playerStatus !== 'between' && (
          <div className="absolute inset-0 bg-aurora flex items-center justify-center gap-[4vw] px-[3vw]">
            {head ? (
              <div className="text-[4vw] font-black text-neon-cyan text-glow-cyan">Si parte… 🎶</div>
            ) : (
              <>
                <div className="flex flex-col gap-[2vh]">
                  <Logo size={Math.round(window.innerHeight * 0.14)} className="anim-floaty" />
                  <div className="text-[5.2vw] leading-tight font-black text-neon-pink text-glow-pink">
                    {state.bookingsOpen ? 'Prenota la tua canzone!' : 'Prenotazioni chiuse'}
                  </div>
                  <div className="text-[2.2vw] font-semibold text-white/80">Inquadra il QR code con il telefono</div>
                  <div className="text-[1.8vw] font-bold text-neon-cyan">{shortUrl()}</div>
                </div>
                <QR size={Math.round(Math.min(window.innerHeight * 0.55, window.innerWidth * 0.3))} />
              </>
            )}
          </div>
        )}

        {toast && <div className="absolute bottom-[2vw] left-1/2 -translate-x-1/2 rounded-2xl bg-red-600 px-[2vw] py-[1vw] text-[2vw] font-bold">{toast}</div>}
      </div>

      {/* Coda */}
      <aside className="w-[27vw] flex flex-col gap-[1vw]">
        <div className="text-[1.8vw] uppercase tracking-[0.25em] font-black text-neon-cyan">Prossime canzoni</div>
        <ol className="flex flex-col gap-[0.8vw]">
          {next5.map((it, i) => (
            <li key={it.id} className="card flex items-center gap-[0.9vw] p-[0.7vw]">
              <span className="text-[2.6vw] font-black text-neon-pink w-[2.4vw] text-center">{i + 1}</span>
              <img src={it.thumbnail} alt="" className="w-[7vw] aspect-video object-cover rounded-[0.5vw]" />
              <div className="min-w-0">
                <div className="text-[1.9vw] leading-tight font-black truncate">{it.nickname}</div>
                <div className="text-[1.15vw] text-white/70 line-clamp-2 leading-tight">{it.title}</div>
              </div>
            </li>
          ))}
          {next5.length === 0 && <li className="text-[1.6vw] text-white/50">La coda è vuota</li>}
        </ol>
        {queue.length > 5 && <div className="text-[1.3vw] text-white/60 font-semibold">…e altre {queue.length - 5} in coda</div>}
        <div className="mt-auto card p-[1vw] flex items-center gap-[1vw]">
          <QR size={Math.round(window.innerWidth * 0.1)} />
          <div>
            <div className="text-[1.8vw] font-black text-neon-lime leading-tight">{state.bookingsOpen ? 'Prenota la tua canzone!' : 'Prenotazioni chiuse'}</div>
            <div className="text-[1.1vw] text-white/70 mt-[0.3vw]">{shortUrl()}</div>
          </div>
        </div>
      </aside>
    </div>
  )
}
