import { useEffect, useState } from 'react'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './auth'
import { useCollection, useDoc } from './hooks'

/**
 * Schermi collegati (proiettore, secondi schermi, gobbo). Ogni dispositivo ha un suo codice e un suo documento
 * `state/screen-<codice>` (le regole già permettono agli admin di scrivere in `state`): lì lo schermo segnala di essere
 * acceso e l'admin gli dà un nome. Così si vedono uno per uno e ognuno mostra il proprio nome.
 */
export type ScreenRole = 'principale' | 'secondo' | 'gobbo'

export interface ScreenDoc {
  id: string
  role: ScreenRole
  name: string
  lim: boolean
  lastSeen: number
}

const ROLE_ORDER: Record<ScreenRole, number> = { principale: 0, secondo: 1, gobbo: 2 }
export const SCREEN_ONLINE_MS = 60_000
const KEY = 'aula.deviceId'

/** Codice di questo dispositivo, salvato sul dispositivo. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'tmp' + Math.random().toString(36).slice(2, 8)
  }
}

const screenPath = (id: string) => `state/screen-${id}`

/** Da usare sugli schermi: segnala che è acceso e restituisce il nome dato dall'admin (vuoto se non ne ha). */
export function useScreenSelf(role: ScreenRole, lim: boolean, enabled: boolean): string {
  const { user } = useAuth()
  const [id] = useState(deviceId)
  useEffect(() => {
    if (!enabled || !user) return
    const beat = () => setDoc(doc(db, screenPath(id)), { kind: 'screen', role, lim, lastSeen: serverTimestamp() }, { merge: true }).catch((e) => console.warn('[screen]', e))
    beat()
    const t = setInterval(beat, 20_000)
    return () => clearInterval(t)
  }, [enabled, user, id, role, lim])
  const { data } = useDoc<{ name?: string }>(enabled && user ? screenPath(id) : null, {})
  return (data.name ?? '').trim()
}

/** Per l'admin: tutti gli schermi che si sono mai collegati. */
export function useScreens(enabled = true) {
  const { items } = useCollection<ScreenDoc | null>(enabled ? 'state' : null, (id, d) =>
    id.startsWith('screen-') && d.kind === 'screen'
      ? { id: id.slice(7), role: (d.role as ScreenRole) ?? 'secondo', name: String(d.name ?? ''), lim: !!d.lim, lastSeen: (d.lastSeen as number | undefined) ?? 0 }
      : null,
  )
  return items.filter((x): x is ScreenDoc => !!x).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.id.localeCompare(b.id))
}

export const setScreenName = (id: string, name: string) => setDoc(doc(db, screenPath(id)), { name: name.trim().slice(0, 40) }, { merge: true })
export const forgetScreen = (id: string) => deleteDoc(doc(db, screenPath(id)))
