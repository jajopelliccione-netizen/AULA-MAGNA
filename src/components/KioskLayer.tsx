import { useEffect, useRef, useState, type FormEvent } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { Lock, LockOpen } from 'lucide-react'
import { auth } from '../lib/firebase'
import { BRAND } from '../lib/brand'
import { Logo } from './Logo'
import type { Kiosk } from '../lib/kiosk'

/**
 * Livelli della modalità LIM: avviso «schermo bloccato» se si esce dal tutto schermo,
 * angolo nascosto (pressione lunga) per sbloccare con la password dell'admin, e pulsante per ribloccare.
 */
export function KioskLayer({ kiosk }: { kiosk: Kiosk }) {
  const [askPw, setAskPw] = useState(false)
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!kiosk.locked) setAskPw(false)
  }, [kiosk.locked])

  const startHold = () => {
    clearTimeout(hold.current)
    hold.current = setTimeout(() => setAskPw(true), 2500)
  }
  const cancelHold = () => clearTimeout(hold.current)

  return (
    <>
      {/* angolo nascosto: tenere premuto 2,5 secondi */}
      {kiosk.locked && !askPw && (
        <div
          data-testid="kiosk-hotspot"
          className="fixed top-0 left-0 z-[300] w-[9vw] h-[9vh] min-w-14 min-h-14"
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
        />
      )}

      {/* il tutto schermo è stato perso: serve un tocco per tornare */}
      {kiosk.fsLost && !askPw && (
        <div className="fixed inset-0 z-[250] bg-ink grid place-items-center">
          <div className="flex flex-col items-center gap-[3vh] text-center px-[6vw]">
            <Logo size={Math.round(window.innerHeight * 0.16)} />
            <Lock className="w-[7vw] h-[7vw] text-ice" strokeWidth={1.4} />
            <div className="display text-white text-[5vw]">Schermo bloccato</div>
            <button className="btn btn-primary text-[2.2vw] px-[3vw] py-[1.8vh] rounded-full" onClick={kiosk.reenter}>Tocca per tornare a schermo intero</button>
            <button className="text-[1.3vw] text-muted underline underline-offset-4 mt-[2vh]" onClick={() => setAskPw(true)}>Sblocca (solo admin)</button>
            <div className="eyebrow text-[1.2vw] text-white/40">{BRAND.title} · {BRAND.school}</div>
          </div>
        </div>
      )}

      {askPw && <UnlockModal onClose={() => setAskPw(false)} onUnlock={() => { setAskPw(false); kiosk.unlock() }} />}

      {/* sbloccato: pulsante discreto per ribloccare */}
      {kiosk.unlocked && (
        <button className="fixed bottom-[1.2vh] left-[1.2vw] z-[200] btn !py-2 !px-3 text-sm opacity-50 hover:opacity-100" onClick={kiosk.relock}>
          <Lock className="w-4 h-4" /> Blocca di nuovo
        </button>
      )}
    </>
  )
}

function UnlockModal({ onClose, onUnlock }: { onClose: () => void; onUnlock: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const user = auth.currentUser
    if (!user?.email) return setErr('Account non valido')
    setBusy(true)
    setErr('')
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pw))
      onUnlock()
    } catch (ex) {
      const code = (ex as { code?: string }).code
      setErr(code === 'auth/too-many-requests' ? 'Troppi tentativi: aspetta un minuto' : code === 'auth/network-request-failed' ? 'Niente connessione' : 'Password non corretta')
      setPw('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur grid place-items-center p-6" data-kiosk-scroll>
      <form onSubmit={submit} className="card w-full max-w-md p-7 flex flex-col gap-4 bg-surface">
        <div className="flex items-center gap-3">
          <LockOpen className="w-6 h-6 text-ice" />
          <h2 className="display text-white text-3xl">Sblocca lo schermo</h2>
        </div>
        <p className="text-sm text-muted">Solo l'admin può uscire dalla modalità LIM. Inserisci la password dell'account admin.</p>
        <input
          className="input"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password admin"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {err && <p className="text-bad text-sm">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn py-3" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary py-3" disabled={busy || !pw}>{busy ? 'Controllo…' : 'Sblocca'}</button>
        </div>
      </form>
    </div>
  )
}
