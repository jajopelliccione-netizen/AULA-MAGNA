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

/** Accesso anonimo automatico per i telefoni dei ragazzi (con ritentativi). */
export function useAnonymousSignIn() {
  const { user, ready } = useAuth()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!ready || user) return
    let cancelled = false
    let attempt = 0
    const go = async () => {
      try {
        await signInAnonymously(auth)
        if (!cancelled) setError(null)
      } catch (e) {
        if (cancelled) return
        setError((e as Error).message)
        attempt++
        setTimeout(go, Math.min(1000 * 2 ** attempt, 15000))
      }
    }
    go()
    return () => {
      cancelled = true
    }
  }, [ready, user])
  return { user, ready: ready && !!user, error }
}
