import { useState, type FormEvent, type ReactNode } from 'react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { Lock, LogIn } from 'lucide-react'
import { auth } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { Logo } from './Logo'
import { BRAND } from '../lib/brand'

const ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Email o password non corrette',
  'auth/wrong-password': 'Password non corretta',
  'auth/user-not-found': 'Utente non trovato',
  'auth/invalid-email': 'Email non valida (controlla di non avere spazi)',
  'auth/operation-not-allowed': 'Il metodo Email/Password non è attivo su Firebase (Authentication → Metodo di accesso)',
  'auth/network-request-failed': 'Niente connessione a Firebase',
  'auth/too-many-requests': 'Troppi tentativi: aspetta qualche minuto',
}

/** Accesso con email e password: protegge /admin, /schermo e /gobbo. */
export function StaffGate({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { ready, user, isStaff } = useAuth()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (!ready) return <div className="min-h-full bg-stage grid place-items-center text-muted">Caricamento…</div>
  if (isStaff) return <>{children}</>

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass)
    } catch (ex) {
      const code = (ex as { code?: string }).code ?? ''
      setErr(`${ERRORS[code] ?? 'Accesso non riuscito'}${code ? ` (${code})` : ''}`)
    } finally {
      setBusy(false)
    }
  }

  const wrongAccount = user && !user.isAnonymous

  return (
    <div className="min-h-full bg-stage grid place-items-center p-6">
      <form onSubmit={submit} className="card w-full max-w-md p-8 flex flex-col gap-5 shadow-[0_40px_100px_-40px_rgba(47,147,240,.6)]">
        <div className="flex flex-col items-center text-center gap-3">
          <Logo size={72} />
          <div>
            <div className="display text-white text-3xl">{BRAND.title}</div>
            <div className="eyebrow text-xs mt-1">{BRAND.school} · {BRAND.city}</div>
          </div>
        </div>
        <div className="border-t border-line pt-5">
          <h1 className="flex items-center gap-2 text-xl font-bold"><Lock className="w-5 h-5 text-brand" /> {title}</h1>
          {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        </div>
        {wrongAccount && <p className="text-warn text-sm">Questo account non è autorizzato.</p>}
        <input className="input" type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" autoComplete="current-password" placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} required />
        {err && <p className="text-bad text-sm">{err}</p>}
        <button className="btn btn-primary py-3.5 text-base" disabled={busy}><LogIn className="w-5 h-5" /> {busy ? 'Accesso…' : 'Entra'}</button>
        {wrongAccount && <button type="button" className="btn" onClick={() => signOut(auth)}>Esci dall'account</button>}
      </form>
    </div>
  )
}
