import { useState, type FormEvent, type ReactNode } from 'react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { BrandTitle } from './Logo'

export function StaffGate({ title, children }: { title: string; children: ReactNode }) {
  const { ready, user, isStaff } = useAuth()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (!ready) return <div className="min-h-full bg-aurora grid place-items-center text-white/60">Caricamento…</div>
  if (isStaff) return <>{children}</>

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass)
    } catch {
      setErr('Email o password non corrette')
    } finally {
      setBusy(false)
    }
  }

  const wrongAccount = user && !user.isAnonymous

  return (
    <div className="min-h-full bg-aurora grid place-items-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 flex flex-col gap-4">
        <BrandTitle size={56} />
        <h1 className="text-xl font-black">{title}</h1>
        {wrongAccount && <p className="text-neon-yellow text-sm">Questo account non è autorizzato come admin.</p>}
        <input className="input" type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" autoComplete="current-password" placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} required />
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="btn btn-pink" disabled={busy}>{busy ? 'Accesso…' : 'Entra'}</button>
        {wrongAccount && (
          <button type="button" className="btn" onClick={() => signOut(auth)}>Esci</button>
        )}
      </form>
    </div>
  )
}
