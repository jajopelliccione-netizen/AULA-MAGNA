import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { auth, adminUids } from './firebase'

interface AuthValue {
  user: User | null
  ready: boolean
  isStaff: boolean
}

const Ctx = createContext<AuthValue>({ user: null, ready: false, isStaff: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setReady(true)
    })
  }, [])

  const isStaff = Boolean(user && !user.isAnonymous && (adminUids.length === 0 || adminUids.includes(user.uid)))
  return <Ctx.Provider value={{ user, ready, isStaff }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    p.then(
      (v) => { clearTimeout(t); resolve(v) },
      (e) => { clearTimeout(t); reject(e) },
    )
  })

/**
 * Accesso anonimo automatico per i telefoni dei ragazzi.
 * Con una rete debole la richiesta può restare appesa: ogni tentativo ha un tempo massimo (8 s) e poi si riprova,
 * anche subito quando torna la connessione o la pagina torna in primo piano.
 */
export function useAnonymousSignIn() {
  const { user, ready } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (!ready || user) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    const go = async () => {
      if (cancelled) return
      clearTimeout(timer)
      setTries((n) => n + 1)
      try {
        await withTimeout(signInAnonymously(auth), 8000)
        if (!cancelled) setError(null)
      } catch (e) {
        if (cancelled) return
        setError((e as Error).message)
        attempt++
        timer = setTimeout(go, Math.min(1000 * attempt, 4000))
      }
    }
    const nudge = () => {
      if (document.visibilityState === 'visible') go()
    }
    go()
    window.addEventListener('online', nudge)
    document.addEventListener('visibilitychange', nudge)
    return () => {
      cancelled = true
      clearTimeout(timer)
      window.removeEventListener('online', nudge)
      document.removeEventListener('visibilitychange', nudge)
    }
  }, [ready, user])

  return { user, ready: ready && !!user, error, tries }
}
