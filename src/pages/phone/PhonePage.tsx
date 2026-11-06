import { useEffect, useState, type FormEvent } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAnonymousSignIn } from '../../lib/auth'
import { useAppState, useDoc, HEARTBEAT_MS } from '../../lib/hooks'
import { heartbeat } from '../../lib/actions'
import { useOutdated } from '../../lib/version'
import { UpdateBanner } from '../../components/UpdateBanner'
import { validateNickname } from '../../lib/profanity'
import { nicknameKey } from '../../lib/util'
import { ArrowRight, Ban, Gamepad2, Mic, Pause, User } from 'lucide-react'
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
  const outdated = useOutdated()
  // nuova versione: se il telefono è in attesa (lobby o pausa) si aggiorna da solo, altrimenti compare un avviso
  useEffect(() => {
    if (outdated && (state.mode === 'lobby' || state.mode === 'pause')) window.location.reload()
  }, [outdated, state.mode])

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
        <div className="grid place-content-center justify-items-center flex-1 text-center gap-3 p-6">
          <Ban className="w-14 h-14 text-bad" />
          <h1 className="display text-white text-4xl">Accesso bloccato</h1>
          <p className="text-muted">Non puoi più usare l'app dell'aula magna.</p>
        </div>
      </Shell>
    )
  }

  if (!nick) return <NickForm ready={ready} error={error} onDone={(n) => { try { localStorage.setItem(NICK_KEY, n) } catch { /* ok */ } setNick(n) }} />

  return (
    <Shell
      nick={nick}
      showUpdate={outdated}
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
          <Pause className="w-12 h-12 text-ice mb-4" />
          <div className="eyebrow text-sm">In pausa</div>
          <p className="display grad-text text-5xl mt-2">{state.message || 'Torniamo subito'}</p>
        </Center>
      ) : (
        <Center>
          <Logo size={110} className="anim-floaty mb-4" />
          <p className="text-2xl font-black text-ice ">Benvenuto, {nick}!</p>
          <p className="text-white/70 mt-2 max-w-xs">Tieni aperta questa pagina: appena l'admin avvia il karaoke o il gioco dell'impostore si aggiorna da sola. 🎶</p>
        </Center>
      )}
    </Shell>
  )
}

function Shell({ children, nick, onChangeNick, showUpdate = false }: { children: React.ReactNode; nick?: string; onChangeNick?: () => void; showUpdate?: boolean }) {
  return (
    <div className="min-h-full bg-stage flex flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 px-4 py-2.5 bg-ink/75 backdrop-blur-xl border-b border-line pt-[max(0.6rem,env(safe-area-inset-top))]">
        <BrandTitle size={34} />
        {nick && (
          <button onClick={onChangeNick} className="chip max-w-[42%]" aria-label="Cambia nickname">
            <User className="w-3.5 h-3.5 text-ice shrink-0" />
            <span className="truncate">{nick}</span>
          </button>
        )}
      </header>
      <main className="flex-1 flex flex-col w-full max-w-lg mx-auto">{children}</main>
      {showUpdate && <UpdateBanner />}
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
    <div className="min-h-full bg-stage flex flex-col px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8">
      <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-sm mx-auto">
        <div className="flex flex-col items-center text-center gap-5">
          <Logo size={112} className="drop-shadow-[0_20px_40px_rgba(47,147,240,.45)]" />
          <div>
            <div className="eyebrow text-sm">Aula Magna</div>
            <h1 className="display grad-text text-[3.4rem] mt-1.5">{BRAND.title}</h1>
            <div className="display text-white text-2xl mt-1.5">{BRAND.school} <span className="text-brand">·</span> {BRAND.city}</div>
          </div>
        </div>

        <form onSubmit={submit} className="card w-full p-5 flex flex-col gap-4">
          <div>
            <label htmlFor="nick" className="text-sm font-semibold">Come ti chiami?</label>
            <p className="text-xs text-muted mt-0.5">Questo nome comparirà sul maxischermo.</p>
          </div>
          <input
            id="nick"
            className="input text-lg"
            placeholder="Il tuo nickname"
            maxLength={16}
            autoComplete="nickname"
            autoCapitalize="words"
            value={value}
            onChange={(e) => { setValue(e.target.value); setErr('') }}
          />
          {err && <p className="text-bad text-sm -mt-2">{err}</p>}
          {error && <p className="text-warn text-xs -mt-2">Connessione in corso… riprovo</p>}
          <button className="btn btn-primary text-base py-3.5" disabled={!ready || busy}>
            {ready ? <>Entra <ArrowRight className="w-5 h-5" /></> : 'Mi collego…'}
          </button>
        </form>
        <p className="text-xs text-muted text-center flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Karaoke <span className="opacity-40">•</span> <Gamepad2 className="w-3.5 h-3.5" /> Gioco dell’impostore</p>
      </div>
    </div>
  )
}
