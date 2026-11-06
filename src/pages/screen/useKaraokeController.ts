import { useEffect, useRef, useState } from 'react'
import type { AppState, Kind, QueueItem } from '../../lib/types'
import { BETWEEN_BY_KIND, beginBetween, finishCurrent, patchState, startNextSong } from '../../lib/actions'

/**
 * Manda avanti la coda da sola. Gira SOLO sullo schermo del proiettore, quando la modalità è "karaoke":
 *  fine video → 10 secondi di "Prossimo" → parte il brano successivo.
 */
export function useKaraokeController(state: AppState, queue: QueueItem[], active: boolean, kind: Kind) {
  const stateRef = useRef(state)
  const queueRef = useRef(queue)
  const activeRef = useRef(active)
  const busyRef = useRef(false)
  stateRef.current = state
  queueRef.current = queue
  activeRef.current = active
  const [toast, setToast] = useState('')

  const finish = async (queueId: string, reason?: string) => {
    const np = stateRef.current.nowPlaying
    if (!activeRef.current || !np || np.queueId !== queueId || busyRef.current) return
    busyRef.current = true
    try {
      if (reason) {
        setToast(reason)
        setTimeout(() => setToast(''), 5000)
      }
      await finishCurrent(queueRef.current.length > 0, kind)
    } catch (e) {
      console.error(e)
    } finally {
      busyRef.current = false
    }
  }

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
          else if (!s.betweenEndsAt) await patchState({ betweenEndsAt: nowMs + BETWEEN_BY_KIND[kind] })
          else if (nowMs >= s.betweenEndsAt) await startNextSong(q[0])
        } else if (q.length > 0) {
          await beginBetween(kind)
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
  }, [active, kind])

  // "salta": l'admin incrementa skipNonce
  const skipRef = useRef(state.skipNonce)
  useEffect(() => {
    if (state.skipNonce === skipRef.current) return
    skipRef.current = state.skipNonce
    if (!activeRef.current) return
    const s = stateRef.current
    if (s.nowPlaying) finish(s.nowPlaying.queueId)
    else if (s.playerStatus === 'between' && queueRef.current.length > 0 && !busyRef.current) {
      busyRef.current = true
      startNextSong(queueRef.current[0]).catch(console.error).finally(() => { busyRef.current = false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.skipNonce])

  return { finish, toast }
}
