import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, doc, getDocFromServer, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './auth'
import { setActionClock } from './actions'
import { snapData } from './util'
import { DEFAULT_GAME, DEFAULT_STATE, type AppState, type Game, type Kind, type PlayerDoc, type QueueItem, type PresenceDoc, type BannedDoc, type RequestStatus } from './types'

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
const GAME_STATUSES = ['lobby', 'reading', 'turns', 'voting', 'reveal']
export function useGame(enabled = true) {
  const res = useDoc<Game>(enabled ? 'impostor/game' : null, DEFAULT_GAME)
  // una partita salvata da una versione precedente (es. stato "playing") riparte dalla lobby
  const data = GAME_STATUSES.includes(res.data.status) ? res.data : { ...res.data, status: 'lobby' as const }
  return { data, ready: res.ready }
}

/**
 * Le canzoni messe dall'admin (uid «manual») sono un riempitivo: stanno SEMPRE dopo quelle dei ragazzi
 * (arrivati dal QR), anche se sono state aggiunte prima. Valgono solo finché l'admin non riordina a mano
 * la coda: dopo un riordino (campo "order") vale la sua scelta.
 */
export const ADMIN_BEHIND_MS = 1e13
export const queueKey = (uid: string, createdAt: number) => (uid === 'manual' ? createdAt + ADMIN_BEHIND_MS : createdAt)

/**
 * Richieste di canzoni. `queue` = solo quelle APPROVATE (la coda vera), `pending` = in attesa di approvazione.
 * Con `kind` si filtra per karaoke o musica.
 */
export function useQueue(kind?: Kind, enabled = true) {
  const { items, ready } = useCollection<QueueItem>(enabled ? 'queue' : null, (id, d) => {
    const createdAt = (d.createdAt as number | undefined) ?? Date.now()
    const order = d.order as number | undefined
    return {
      id,
      kind: (d.kind as Kind | undefined) ?? 'karaoke',
      // i documenti vecchi (senza status) erano già in coda
      status: (d.status as RequestStatus | undefined) ?? 'approved',
      videoId: String(d.videoId ?? ''),
      title: String(d.title ?? ''),
      thumbnail: String(d.thumbnail ?? ''),
      nickname: String(d.nickname ?? ''),
      nicknameKey: String(d.nicknameKey ?? ''),
      uid: String(d.uid ?? ''),
      createdAt,
      order,
      key: order ?? queueKey(String(d.uid ?? ''), createdAt),
    }
  })
  const sortFn = (a: QueueItem, b: QueueItem) => a.key - b.key || a.id.localeCompare(b.id)
  const mine = kind ? items.filter((i) => i.kind === kind) : items
  const queue = mine.filter((i) => i.status === 'approved').sort(sortFn)
  const pending = mine.filter((i) => i.status === 'pending').sort((a, b) => a.createdAt - b.createdAt)
  return { queue, pending, all: items, ready }
}

export function usePlayers(enabled = true) {
  const { items, ready } = useCollection<PlayerDoc>(enabled ? 'impostor/game/players' : null, (id, d) => ({
    id,
    nickname: String(d.nickname ?? '???'),
    vote: (d.vote as string | null | undefined) ?? null,
    number: (d.number as number | undefined) ?? null,
    words: (d.words as Record<string, string> | undefined) ?? {},
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
      const samples: { rtt: number; off: number }[] = []
      for (let i = 0; i < 8 && !stop; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 150 + Math.random() * 250))
        try {
          const t0 = Date.now()
          await setDoc(ref, { nickname: '_clock', nicknameKey: 'clock', lastSeen: serverTimestamp() })
          const snap = await getDocFromServer(ref)
          const t1 = Date.now()
          const srv = (snap.data()?.lastSeen as { toMillis: () => number } | undefined)?.toMillis()
          if (srv) samples.push({ rtt: t1 - t0, off: srv - (t0 + t1) / 2 })
          if (srv && samples.length === 1 && !stop) offset.current = samples[0].off // stima subito disponibile, poi affinata
        } catch (e) {
          console.warn('[clock]', e)
        }
      }
      // si tengono i campioni più veloci (errore minore) e se ne prende la mediana: scarta anche le letture
      // sporcate da un altro schermo che scrive lo stesso documento nello stesso istante
      if (samples.length && !stop) {
        const good = samples.sort((x, y) => x.rtt - y.rtt).slice(0, Math.max(3, Math.ceil(samples.length / 2))).map((x) => x.off).sort((x, y) => x - y)
        offset.current = good[Math.floor(good.length / 2)]
      }
    }
    measure()
    const t = setInterval(measure, 5 * 60_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [user])
  const fn = useCallback(() => Date.now() + offset.current, [])
  setActionClock(fn)
  return fn
}

/**
 * true = i dati che vedi arrivano dal server in tempo reale.
 * false = sei offline o Firestore sta mostrando dati in cache (potrebbero essere vecchi).
 */
export function useLive(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [fromCache, setFromCache] = useState(true)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const unsub = onSnapshot(doc(db, 'state/current'), { includeMetadataChanges: true }, (s) => setFromCache(s.metadata.fromCache), () => setFromCache(true))
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      unsub()
    }
  }, [])
  return online && !fromCache
}

/** true se la connessione è assente da più di 4 secondi (evita il lampeggio all'avvio). */
export function useOfflineBanner(): boolean {
  const live = useLive()
  const [late, setLate] = useState(false)
  useEffect(() => {
    if (live) {
      setLate(false)
      return
    }
    const t = setTimeout(() => setLate(true), 4000)
    return () => clearTimeout(t)
  }, [live])
  return late
}
