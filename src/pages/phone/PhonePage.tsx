import { useEffect, useState, type FormEvent } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAnonymousSignIn } from '../../lib/auth'
import { useAppState, useDoc, HEARTBEAT_MS } from '../../lib/hooks'
import { heartbeat } from '../../lib/actions'
import { validateNickname } from '../../lib/profanity'
import { nicknameKey } from '../../lib/util'
import { BrandTitle, Logo } from '../../components/Logo'
import { BRAND } from '../../lib/brand'
import KaraokeView from './KaraokeView'
import ImpostorView from './ImpostorView'

const NICK_KEY = 'aula.nick'

function loadNick(): string {
  try {
    return localStorage.getItem(NICK_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function PhonePage() {
  const { user, ready, error } = useAnonymousSignIn()
  const [nick, setNick] = useState(loadNick)
  const uid = user?.uid ?? null

  // il documento "banned/<uid>" o "banned/<nickname>" blocca tutto
  const bannedByUid = useDoc<{ nickname?: string }>(uid && ready ? `banned/${uid}` : null, {})
  const bannedByNick = useDoc<{ nickname?: string }>(nick && ready ? `banned/${nicknameKey(nick)}` : null, {})
  const isBanned = Boolean(bannedByUid.data.nickname || bannedByNick.data.nickname)

  const { data: state } = useAppState(ready && !!nick && !isBanned)

  // presenza: battito ogni minuto finché la pagina è visibile
  useEffect(() => {
    if (!uid || !nick || isBanned) return
    const beat = () => {
      if (document.visibilityState === 'visible') heartbeat(uid, nick).catch(() => {})
    }
    beat()
    const t = setInterval(beat, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [uid, nick, isBanned])

  if (isBanned) {
    return (
      <Shell>
        <div className="grid place-items-center flex-1 text-center gap-3 p-6">
          <div className="text-6xl">🚫</div>
          <h1 className="text-2xl font-black">Sei stato bloccato</h1>
          <p className="text-white/70">Non puoi più usare l'app dell'aula magna.</p>
        </div>
      </Shell>
    )
  }

  if (!nick) return <NickForm ready={ready} error={error} onDone={(n) => { try { localStorage.setItem(NICK_KEY, n) } catch { /* ok */ } setNick(n) }} />

  return (
    <Shell
      nick={nick}
      onChangeNick={() => {
        try { localStorage.removeItem(NICK_KEY) } catch { /* ok */ }
        setNick('')
      }}
    >
      {!ready || !uid ? (
        <Center>Mi collego…</Center>
      ) : state.mode === 'karaoke' ? (
        <KaraokeView uid={uid} nick={nick} state={state} />
      ) : state.mode === 'impostor' ? (
        <ImpostorView uid={uid} nick={nick} />
      ) : state.mode === 'pause' ? (
        <Center>
          <div className="text-6xl mb-3">⏸️</div>
          <p className="text-2xl font-black text-neon-yellow">{state.message || 'Pausa'}</p>
        </Center>
      ) : (
        <Center>
          <Logo size={110} className="anim-floaty mb-4" />
          <p className="text-2xl font-black text-neon-cyan text-glow-cyan">Benvenuto, {nick}!</p>
          <p className="text-white/70 mt-2 max-w-xs">Tieni aperta questa pagina: appena l'admin avvia il karaoke o il gioco dell'impostore si aggiorna da sola. 🎶</p>
        </Center>
      )}
    </Shell>
  )
}

function Shell({ children, nick, onChangeNick }: { children: React.ReactNode; nick?: string; onChangeNick?: () => void }) {
  return (
    <div className="min-h-full bg-aurora flex flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 px-4 py-2 bg-ink/80 backdrop-blur border-b border-white/10 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <BrandTitle size={36} />
        {nick && (
          <button onClick={onChangeNick} className="text-xs text-white/60 underline underline-offset-2 text-right max-w-[40%] truncate">
            {nick} · cambia
          </button>
        )}
      </header>
      <main className="flex-1 flex flex-col w-full max-w-lg mx-auto">{children}</main>
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 grid place-content-center justify-items-center text-center p-6">{children}</div>
}

function NickForm({ ready, error, onDone }: { ready: boolean; error: string | null; onDone: (n: string) => void }) {
  const [value, setValue] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const nick = value.trim().replace(/\s+/g, ' ')
    const problem = validateNickname(nick)
    if (problem) return setErr(problem)
    setBusy(true)
    try {
      const snap = await getDoc(doc(db, 'banned', nicknameKey(nick)))
      if (snap.exists()) return setErr('Questo nickname è stato bloccato')
    } catch {
      /* se la lettura fallisce lasciamo passare: le rules bloccano comunque */
    } finally {
      setBusy(false)
    }
    onDone(nick)
  }

  return (
    <div className="min-h-full bg-aurora grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-5 text-center">
        <Logo size={120} className="mx-auto anim-floaty" />
        <div>
          <h1 className="text-3xl font-black text-neon-pink text-glow-pink leading-tight">{BRAND.title}</h1>
          <p className="text-neon-cyan font-bold text-lg">{BRAND.school} · {BRAND.city}</p>
          <p className="text-white/70 mt-2">Aula magna: karaoke e gioco dell'impostore</p>
        </div>
        <input
          className="input text-center text-xl"
          placeholder="Il tuo nickname"
          maxLength={16}
          autoFocus
          autoComplete="nickname"
          value={value}
          onChange={(e) => { setValue(e.target.value); setErr('') }}
        />
        {err && <p className="text-red-400 text-sm -mt-2">{err}</p>}
        {error && <p className="text-neon-yellow text-xs -mt-2">Connessione in corso… riprovo</p>}
        <button className="btn btn-pink text-lg py-3" disabled={!ready || busy}>{ready ? 'Entra 🎉' : 'Mi collego…'}</button>
      </form>
    </div>
  )
}
