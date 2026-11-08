import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import { Activity, Captions, ChevronDown, Hand, ExternalLink, Home, LockOpen, LogOut, Menu, Mic, Monitor, Music2, Pause, UserRound, VenetianMask, Wifi, WifiOff, X } from 'lucide-react'
import { auth } from '../../lib/firebase'
import { StaffGate } from '../../components/StaffGate'
import { UpdateBanner } from '../../components/UpdateBanner'
import { BrandTitle } from '../../components/Logo'
import { useAppState, useBanned, useGame, useLive, usePlayers, usePresence, useQueue, useServerClock } from '../../lib/hooks'
import { useOutdated } from '../../lib/version'
import { ScreensPanel } from './ScreensPanel'
import { useAutoApprove } from '../../lib/autoApprove'
import { ensureInitialDocs, logAction, requestKioskUnlock, setImpostorConfig, setPauseMessage, setScreenControls, switchMode } from '../../lib/actions'
import type { ImpostorConfig, LastAction, Mode } from '../../lib/types'
import KaraokeAdmin, { Switch } from './KaraokeAdmin'
import ImpostorAdmin from './ImpostorAdmin'
import { ActCtx, type Act } from './act'

export default function AdminPage() {
  return (
    <StaffGate title="Pannello di controllo" subtitle="Area riservata agli organizzatori">
      <AdminInner />
    </StaffGate>
  )
}

const MODES: { id: Mode; label: string; hint: string; icon: typeof Home }[] = [
  { id: 'lobby', label: 'Lobby', hint: 'QR e benvenuto', icon: Home },
  { id: 'karaoke', label: 'Karaoke', hint: 'Video e coda', icon: Mic },
  { id: 'music', label: 'Musica', hint: 'Richieste libere', icon: Music2 },
  { id: 'impostor', label: 'Impostore', hint: 'Gioco di gruppo', icon: VenetianMask },
  { id: 'pause', label: 'Pausa', hint: 'Messaggio a schermo', icon: Pause },
]

const NAME_KEY = 'aula.adminName'
const loadName = () => {
  try { return localStorage.getItem(NAME_KEY) || 'Admin' } catch { return 'Admin' }
}
const clock = (ms: number) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

function AdminInner() {
  const { data: state, ready } = useAppState()
  const { queue: karaokeQueue, pending: karaokePending, all } = useQueue('karaoke')
  const { queue: musicQueue, pending: musicPending } = useQueue('music')
  useAutoApprove(state, all, ready)
  const { data: game } = useGame()
  const { players } = usePlayers()
  const { online, count } = usePresence()
  const banned = useBanned()
  const serverNow = useServerClock()
  const live = useLive()
  const outdated = useOutdated()
  const [msg, setMsg] = useState('')
  const [msgDirty, setMsgDirty] = useState(false)
  const [tab, setTab] = useState<'karaoke' | 'music' | 'impostor'>('karaoke')
  const [name, setName] = useState(loadName)
  const [feed, setFeed] = useState<LastAction[]>([])
  const [toast, setToast] = useState<LastAction | null>(null)
  const [showFeed, setShowFeed] = useState(false)
  const [menu, setMenu] = useState(false)
  const [screensOpen, setScreensOpen] = useState(false)
  const lastSeen = useRef<string | null>(null)
  const nameRef = useRef(name)
  nameRef.current = name

  useEffect(() => { ensureInitialDocs().catch((e) => console.error(e)) }, [])
  useEffect(() => { if (!msgDirty) setMsg(state.message) }, [state.message, msgDirty])
  useEffect(() => { if (state.mode === 'karaoke' || state.mode === 'music' || state.mode === 'impostor') setTab(state.mode) }, [state.mode])

  // scrive l'azione e la annuncia agli altri admin
  const act: Act = useCallback(async (text, fn) => {
    await fn()
    logAction(nameRef.current || 'Admin', text, serverNow()).catch(() => {})
  }, [serverNow])

  // riceve le azioni degli altri admin: elenco "Attività" + avviso a comparsa
  const la = state.lastAction
  const booted = useRef(false)
  useEffect(() => {
    if (!ready) return
    const first = !booted.current
    booted.current = true
    if (!la) return
    const key = `${la.at}|${la.by}|${la.text}`
    if (lastSeen.current === key) return
    lastSeen.current = key
    setFeed((f) => [la, ...f].slice(0, 12))
    // niente avviso per l'ultima azione già presente all'apertura della pagina
    if (!first && la.by !== nameRef.current) {
      setToast(la)
      const t = setTimeout(() => setToast((cur) => (cur === la ? null : cur)), 6000)
      return () => clearTimeout(t)
    }
  }, [la, ready])

  // il titolo della scheda mostra le richieste da approvare, anche se la pagina è in secondo piano
  const totalPending = karaokePending.length + musicPending.length
  useEffect(() => {
    document.title = totalPending > 0 ? `(${totalPending}) Da approvare · Admin` : 'Pannello admin · Occupazione 2026'
  }, [totalPending])

  const ctxValue = useMemo(() => act, [act])
  const config = state.impostorConfig
  const changeConfig = (c: ImpostorConfig) => setImpostorConfig(c).catch(() => {})
  const saveName = (v: string) => {
    setName(v)
    try { localStorage.setItem(NAME_KEY, v) } catch { /* ok */ }
  }

  if (!ready) return <div className="min-h-full bg-stage grid place-items-center text-muted">Carico…</div>

  const tabs = [
    { id: 'karaoke' as const, label: 'Karaoke', Icon: Mic, n: karaokePending.length },
    { id: 'music' as const, label: 'Musica', Icon: Music2, n: musicPending.length },
    { id: 'impostor' as const, label: 'Impostore', Icon: VenetianMask, n: 0 },
  ]

  return (
    <ActCtx.Provider value={ctxValue}>
      <div className="min-h-full bg-stage overflow-x-hidden">
        <header className="sticky top-0 z-30 bg-ink/85 backdrop-blur-xl border-b border-line pt-[env(safe-area-inset-top)]">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1"><BrandTitle size={34} compact /></div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className={`chip !px-2.5 ${live ? 'border-good/40 bg-good/10 text-good' : 'border-bad/50 bg-bad/15 text-[#ff9aab]'}`} title={live ? 'I dati si aggiornano in tempo reale' : 'Sei offline: i dati potrebbero non essere aggiornati'}>
                {live ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{live ? 'In tempo reale' : 'Offline'}</span>
              </span>
              <span className="chip !px-2.5"><span className="dot-live" /> {count}<span className="hidden sm:inline"> online</span></span>

              {/* da tablet in su: Attività · Schermi · account */}
              <div className="hidden md:flex items-center gap-2">
                <button className={`btn text-sm py-2 px-3 ${showFeed ? 'btn-secondary' : ''}`} onClick={() => setShowFeed((v) => !v)}><Activity className="w-4 h-4" /> Attività</button>

                <div className="relative">
                  <button className={`btn text-sm py-2 px-3 ${screensOpen ? 'btn-secondary' : ''}`} onClick={() => setScreensOpen((v) => !v)} aria-expanded={screensOpen}>
                    <Monitor className="w-4 h-4" /> Schermi <ChevronDown className={`w-4 h-4 transition ${screensOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {screensOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setScreensOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 z-40 w-72 card-solid p-2 shadow-2xl anim-slide">
                        <a href="/schermo" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[.07]" onClick={() => setScreensOpen(false)}>
                          <Monitor className="w-5 h-5 text-ice" /><span className="flex-1"><span className="block font-semibold text-sm">Proiettore</span><span className="block text-xs text-muted">Video, coda e giochi</span></span><ExternalLink className="w-4 h-4 text-muted" />
                        </a>
                        <a href="/gobbo" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[.07]" onClick={() => setScreensOpen(false)}>
                          <Captions className="w-5 h-5 text-ice" /><span className="flex-1"><span className="block font-semibold text-sm">Gobbo</span><span className="block text-xs text-muted">Solo il testo, per chi canta</span></span><ExternalLink className="w-4 h-4 text-muted" />
                        </a>
                        <div className="my-1.5 border-t border-line" />
                        <button className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[.07] text-left" onClick={() => { setScreensOpen(false); act('ha sbloccato lo schermo LIM', () => requestKioskUnlock()) }}>
                          <LockOpen className="w-5 h-5 text-warn" /><span className="flex-1"><span className="block font-semibold text-sm">Sblocca schermo LIM</span><span className="block text-xs text-muted">Fa uscire la LIM dal tutto schermo</span></span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-line bg-white/[.04] pl-3 pr-1 py-1" title="Il tuo nome: compare agli altri admin quando fai qualcosa">
                  <UserRound className="w-4 h-4 text-ice shrink-0" />
                  <input className="bg-transparent outline-none w-24 text-sm font-semibold" value={name} maxLength={16} onChange={(e) => saveName(e.target.value)} aria-label="Il tuo nome" />
                  <button className="btn btn-icon !p-2 !min-w-0 !min-h-0 !border-0 !bg-transparent" title="Esci" aria-label="Esci" onClick={() => signOut(auth)}><LogOut className="w-4 h-4" /></button>
                </div>
              </div>

              {/* telefono: un solo pulsante menu */}
              <button className="btn btn-icon md:hidden relative" onClick={() => setMenu(true)} aria-label="Menu">
                <Menu className="w-5 h-5" />
                {feed.length > 0 && !showFeed && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand" />}
              </button>
            </div>
          </div>
          {!live && (
            <div className="bg-bad/20 border-t border-bad/40 text-center text-xs sm:text-sm font-semibold py-1.5 px-3 text-[#ffb3c0]">
              Connessione assente: i dati potrebbero non essere aggiornati. Si ricollega da sola.
            </div>
          )}
        </header>

        {showFeed && (
          <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-3">
            <section className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="eyebrow text-xs">Attività degli admin</h2>
                <button className="btn btn-icon !p-1.5" onClick={() => setShowFeed(false)} aria-label="Chiudi"><X className="w-4 h-4" /></button>
              </div>
              {feed.length === 0 && <p className="text-sm text-muted">Nessuna attività finora. Le azioni di tutti gli admin compaiono qui in diretta.</p>}
              <ul className="flex flex-col gap-1.5">
                {feed.map((a, i) => (
                  <li key={i} className="text-sm leading-snug">
                    <span className="text-muted tabular-nums text-xs mr-2">{clock(a.at)}</span>
                    <b className="text-white">{a.by}</b> <span className="text-muted">{a.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        <main className="max-w-6xl mx-auto p-3 sm:p-4 pb-48 md:pb-16 flex flex-col gap-4 sm:gap-5">
          {/* ---------- cosa mostra lo schermo ---------- */}
          <section className="card p-3.5 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="display text-white text-xl sm:text-2xl">Cosa mostra lo schermo</h2>
              <span className="eyebrow text-xs hidden sm:block">In onda ora: {MODES.find((m) => m.id === state.mode)?.label}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
              {MODES.map((m) => {
                const on = state.mode === m.id
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => act(`ha messo lo schermo su ${m.label}`, () => switchMode(m.id, state))}
                    aria-pressed={on}
                    className={`relative flex flex-col items-center text-center lg:items-start lg:text-left rounded-2xl border px-1 py-3 lg:p-4 transition min-w-0 ${on ? 'bg-brand/20 border-brand ring-1 ring-brand shadow-[0_12px_40px_-16px_rgba(47,147,240,.9)]' : 'bg-white/[.04] border-line hover:bg-white/[.08]'}`}
                  >
                    {on && <span className="absolute top-1.5 right-1.5 lg:hidden dot-live" />}
                    {on && <span className="hidden lg:flex absolute top-3 right-3 chip border-good/40 bg-good/10 text-good !py-0.5 !text-[.65rem]"><span className="dot-live !w-1.5 !h-1.5" /> In onda</span>}
                    <Icon className={`w-6 h-6 lg:w-7 lg:h-7 ${on ? 'text-ice' : 'text-muted'}`} />
                    <div className="display text-white text-[.82rem] sm:text-lg lg:text-2xl leading-none mt-1.5 lg:mt-3 max-w-full">{m.label}</div>
                    <div className="text-xs text-muted mt-0.5 hidden lg:block">{m.hint}</div>
                  </button>
                )
              })}
            </div>
            <div className="mt-3 sm:mt-4 border-t border-line pt-1.5">
              <Switch
                on={!!state.screenControls}
                onChange={(v) => act(v ? 'ha attivato i comandi touch sullo schermo' : 'ha spento i comandi touch sullo schermo', () => setScreenControls(v))}
                icon={<Hand className="w-5 h-5" />}
                title="Comandi touch sullo schermo (LIM)"
                hint={state.screenControls ? 'I ragazzi scelgono il gioco e vanno avanti toccando lo schermo' : 'Lo schermo è solo da guardare: gestisci tutto tu'}
              />
            </div>

            <ScreensPanel act={act} serverNow={serverNow} />

            {state.mode === 'pause' && (
              <div className="mt-3 sm:mt-4 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted" htmlFor="pause-msg">Messaggio mostrato sullo schermo in pausa</label>
                <div className="flex gap-2">
                  <input
                    id="pause-msg"
                    className="input"
                    placeholder="Es. Torniamo tra 10 minuti"
                    value={msg}
                    onChange={(e) => { setMsg(e.target.value); setMsgDirty(true) }}
                    maxLength={120}
                  />
                  <button className="btn btn-secondary shrink-0" onClick={() => act(`ha cambiato il messaggio di pausa: «${msg}»`, () => setPauseMessage(msg)).then(() => setMsgDirty(false))}>Salva</button>
                </div>
              </div>
            )}
          </section>

          {/* ---------- schede (da tablet in su; su telefono sono nella barra in basso) ---------- */}
          <div className="hidden md:inline-flex self-start rounded-2xl bg-white/[.05] border border-line p-1">
            {tabs.map(({ id, label, Icon, n }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${tab === id ? 'bg-brand text-white shadow' : 'text-muted hover:text-white'}`}
              >
                <Icon className="w-4 h-4" /> {label}
                {n > 0 && <span className="grid place-items-center min-w-5 h-5 px-1 rounded-full bg-warn text-ink text-xs font-black animate-pulse">{n}</span>}
              </button>
            ))}
          </div>

          {tab === 'karaoke' && <KaraokeAdmin kind="karaoke" state={state} queue={karaokeQueue} pending={karaokePending} presence={online} banned={banned} serverNow={serverNow} />}
          {tab === 'music' && <KaraokeAdmin kind="music" state={state} queue={musicQueue} pending={musicPending} presence={online} banned={banned} serverNow={serverNow} />}
          {tab === 'impostor' && <ImpostorAdmin game={game} players={players} serverNow={serverNow} config={config} onConfig={changeConfig} />}
        </main>

        {/* ---------- barra di navigazione in basso (telefono) ---------- */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink/92 backdrop-blur-xl border-t border-line pb-safe" aria-label="Sezioni">
          <div className="grid grid-cols-3">
            {tabs.map(({ id, label, Icon, n }) => (
              <button key={id} onClick={() => { setTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[.7rem] font-bold transition ${tab === id ? 'text-white' : 'text-muted'}`} aria-current={tab === id}>
                {tab === id && <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-brand" />}
                <span className="relative"><Icon className={`w-6 h-6 ${tab === id ? 'text-ice' : ''}`} />{n > 0 && <span className="absolute -top-1.5 -right-2.5 grid place-items-center min-w-4 h-4 px-1 rounded-full bg-warn text-ink text-[.65rem] font-black">{n}</span>}</span>
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* ---------- menu (telefono) ---------- */}
        {menu && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMenu(false)}>
            <div className="absolute bottom-0 inset-x-0 card-solid rounded-b-none rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] flex flex-col gap-3 anim-slide" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="display text-white text-2xl">Menu</h2>
                <button className="btn btn-icon" onClick={() => setMenu(false)} aria-label="Chiudi"><X className="w-5 h-5" /></button>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold flex items-center gap-2"><UserRound className="w-4 h-4 text-ice" /> Il tuo nome</span>
                <input className="input" value={name} maxLength={16} onChange={(e) => saveName(e.target.value)} placeholder="Compare agli altri admin" />
              </label>
              <button className="btn py-3.5 justify-start" onClick={() => { setShowFeed(true); setMenu(false); window.scrollTo({ top: 0 }) }}><Activity className="w-5 h-5" /> Attività degli altri admin</button>
              <div className="grid grid-cols-2 gap-2">
                <a href="/schermo" target="_blank" rel="noreferrer" className="btn py-3.5"><Monitor className="w-5 h-5" /> Proiettore</a>
                <a href="/gobbo" target="_blank" rel="noreferrer" className="btn py-3.5"><Captions className="w-5 h-5" /> Gobbo</a>
              </div>
              <button className="btn py-3.5 justify-start" onClick={() => { setMenu(false); act('ha sbloccato lo schermo LIM', () => requestKioskUnlock()) }}><LockOpen className="w-5 h-5 text-warn" /> Sblocca schermo LIM</button>
              <button className="btn btn-danger py-3.5" onClick={() => signOut(auth)}><LogOut className="w-5 h-5" /> Esci</button>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed top-16 inset-x-3 sm:inset-x-auto sm:right-4 z-50 card px-4 py-3 shadow-2xl sm:max-w-xs anim-slide ring-1 ring-brand/60">
            <div className="eyebrow text-[.65rem]">{toast.by}</div>
            <div className="text-sm font-semibold mt-0.5">{toast.text}</div>
          </div>
        )}
        {outdated && <UpdateBanner />}
      </div>
    </ActCtx.Provider>
  )
}

