import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, doc, getDocFromServer, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './auth'
import { snapData } from './util'
import { DEFAULT_GAME, DEFAULT_STATE, type AppState, type Game, type PlayerDoc, type QueueItem, type PresenceDoc, type BannedDoc } from './types'

/** Ascolta un documento. Se non esiste restituisce il fallback. */
export function useDoc<T extends object>(path: string | null, fallback: T): { data: T; ready: boolean } {
  const fb = useRef(fallback)
  const [data, setData] = useState<T>(fallback)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!path) {
      setData(fb.current)
      setReady(false)
      return
    }
    return onSnapshot(
      doc(db, path),
      (s) => {
        const d = snapData<T>(s)
        setData(d ? ({ ...fb.current, ...d } as T) : fb.current)
        setReady(true)
      },
      (e) => {
        console.error('[doc]', path, e)
        setReady(true)
      },
    )
  }, [path])
  return { data, ready }
}

/** Ascolta una collezione e la trasforma con map. */
export function useCollection<T>(path: string | null, map: (id: string, d: Record<string, unknown>) => T): { items: T[]; ready: boolean } {
  const mapRef = useRef(map)
  mapRef.current = map
  const [items, setItems] = useState<T[]>([])
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!path) {
      setItems([])
      setReady(false)
      return
    }
    return onSnapshot(
      collection(db, path),
      (s) => {
        setItems(s.docs.map((d) => mapRef.current(d.id, snapData<Record<string, unknown>>(d) ?? {})))
        setReady(true)
      },
      (e) => {
        console.error('[col]', path, e)
        setReady(true)
      },
    )
  }, [path])
  return { items, ready }
}

export const useAppState = (enabled = true) => useDoc<AppState>(enabled ? 'state/current' : null, DEFAULT_STATE)
export const useGame = (enabled = true) => useDoc<Game>(enabled ? 'impostor/game' : null, DEFAULT_GAME)

export function useQueue(enabled = true) {
  const { items, ready } = useCollection<QueueItem>(enabled ? 'queue' : null, (id, d) => {
    const createdAt = (d.createdAt as number | undefined) ?? Date.now()
    const order = d.order as number | undefined
    return {
      id,
      videoId: String(d.videoId ?? ''),
      title: String(d.title ?? ''),
      thumbnail: String(d.thumbnail ?? ''),
      nickname: String(d.nickname ?? ''),
      nicknameKey: String(d.nicknameKey ?? ''),
      uid: String(d.uid ?? ''),
      createdAt,
      order,
      key: order ?? createdAt,
    }
  })
  const sorted = [...items].sort((a, b) => a.key - b.key || a.id.localeCompare(b.id))
  return { queue: sorted, ready }
}

export function usePlayers(enabled = true) {
  const { items, ready } = useCollection<PlayerDoc>(enabled ? 'impostor/game/players' : null, (id, d) => ({
    id,
    nickname: String(d.nickname ?? '???'),
    vote: (d.vote as string | null | undefined) ?? null,
    number: (d.number as number | undefined) ?? null,
  }))
  const players = [...items].sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9) || a.nickname.localeCompare(b.nickname))
  return { players, ready }
}

export function usePresence(enabled = true) {
  const { items } = useCollection<PresenceDoc>(enabled ? 'presence' : null, (id, d) => ({
    id,
    nickname: String(d.nickname ?? ''),
    nicknameKey: String(d.nicknameKey ?? ''),
    lastSeen: (d.lastSeen as number | undefined) ?? 0,
  }))
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])
  const online = items.filter((p) => !p.nickname.startsWith('_') && now - p.lastSeen < PRESENCE_TTL)
  return { online, count: online.length }
}

export function useBanned(enabled = true) {
  const { items } = useCollection<BannedDoc>(enabled ? 'banned' : null, (id, d) => ({
    id,
    nickname: String(d.nickname ?? id),
    uid: d.uid as string | undefined,
    createdAt: (d.createdAt as number | undefined) ?? 0,
  }))
  return items
}

/** Un utente risulta online se l'ultimo battito è più recente di questo (ms). */
export const PRESENCE_TTL = 150_000
export const HEARTBEAT_MS = 60_000

/** Orologio che si aggiorna ogni `ms` millisecondi. */
export function useNow(ms = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/**
 * Stima lo scarto tra l'orologio di questo dispositivo e quello del server Firestore,
 * così schermo e gobbo ragionano sullo stesso tempo anche se i PC hanno orari diversi.
 * Usa il proprio documento "presence/<uid>" con nickname "_clock" (ignorato nel conteggio).
 */
export function useServerClock(): () => number {
  const { user } = useAuth()
  const offset = useRef(0)
  useEffect(() => {
    if (!user) return
    let stop = false
    const ref = doc(db, 'presence', user.uid)
    const measure = async () => {
      let best: { rtt: number; off: number } | null = null
      for (let i = 0; i < 3 && !stop; i++) {
        try {
          const t0 = Date.now()
          await setDoc(ref, { nickname: '_clock', nicknameKey: 'clock', lastSeen: serverTimestamp() })
          const snap = await getDocFromServer(ref)
          const t1 = Date.now()
          const srv = (snap.data()?.lastSeen as { toMillis: () => number } | undefined)?.toMillis()
          if (srv) {
            const cand = { rtt: t1 - t0, off: srv - (t0 + t1) / 2 }
            if (!best || cand.rtt < best.rtt) best = cand
          }
        } catch (e) {
          console.warn('[clock]', e)
        }
      }
      if (best && !stop) offset.current = best.off
    }
    measure()
    const t = setInterval(measure, 5 * 60_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [user])
  return useCallback(() => Date.now() + offset.current, [])
}
