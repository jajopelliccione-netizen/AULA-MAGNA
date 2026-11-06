import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { Captions, Home, LogOut, Mic, Monitor, Pause, VenetianMask } from 'lucide-react'
import { auth } from '../../lib/firebase'
import { StaffGate } from '../../components/StaffGate'
import { BrandTitle } from '../../components/Logo'
import { useAppState, useBanned, useGame, usePlayers, usePresence, useQueue } from '../../lib/hooks'
import { ensureInitialDocs, setMode, setPauseMessage } from '../../lib/actions'
import type { Mode } from '../../lib/types'
import KaraokeAdmin from './KaraokeAdmin'
import ImpostorAdmin from './ImpostorAdmin'

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
  { id: 'impostor', label: 'Impostore', hint: 'Gioco di gruppo', icon: VenetianMask },
  { id: 'pause', label: 'Pausa', hint: 'Messaggio a schermo', icon: Pause },
]

function AdminInner() {
  const { data: state, ready } = useAppState()
  const { queue } = useQueue()
  const { data: game } = useGame()
  const { players } = usePlayers()
  const { online, count } = usePresence()
  const banned = useBanned()
  const [msg, setMsg] = useState('')
  const [msgDirty, setMsgDirty] = useState(false)
  const [tab, setTab] = useState<'karaoke' | 'impostor'>('karaoke')

  useEffect(() => { ensureInitialDocs().catch((e) => console.error(e)) }, [])
  useEffect(() => { if (!msgDirty) setMsg(state.message) }, [state.message, msgDirty])
  useEffect(() => { if (state.mode === 'karaoke' || state.mode === 'impostor') setTab(state.mode) }, [state.mode])

  if (!ready) return <div className="min-h-full bg-stage grid place-items-center text-muted">Carico…</div>

  return (
    <div className="min-h-full bg-stage">
      <header className="sticky top-0 z-30 bg-ink/80 backdrop-blur-xl border-b border-line">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <BrandTitle size={38} />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="chip border-good/40 bg-good/10 text-good"><span className="dot-live" /> {count} online</span>
            <a href="/schermo" target="_blank" rel="noreferrer" className="btn text-sm py-2 px-3"><Monitor className="w-4 h-4" /> Proiettore</a>
            <a href="/gobbo" target="_blank" rel="noreferrer" className="btn text-sm py-2 px-3"><Captions className="w-4 h-4" /> Gobbo</a>
            <button className="btn text-sm py-2 px-3" onClick={() => signOut(auth)}><LogOut className="w-4 h-4" /> Esci</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 pb-12 flex flex-col gap-5">
        {/* ---------- cosa mostra lo schermo ---------- */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="display text-white text-2xl">Cosa mostra lo schermo</h2>
            <span className="eyebrow text-xs hidden sm:block">In onda ora: {MODES.find((m) => m.id === state.mode)?.label}</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {MODES.map((m) => {
              const on = state.mode === m.id
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`relative text-left rounded-2xl border p-4 transition ${on ? 'bg-brand/18 border-brand ring-1 ring-brand shadow-[0_12px_40px_-16px_rgba(47,147,240,.9)]' : 'bg-white/[.04] border-line hover:bg-white/[.08]'}`}
                >
                  {on && <span className="absolute top-3 right-3 chip border-good/40 bg-good/10 text-good !py-0.5 !text-[.65rem]"><span className="dot-live !w-1.5 !h-1.5" /> In onda</span>}
                  <Icon className={`w-7 h-7 ${on ? 'text-ice' : 'text-muted'}`} />
                  <div className="display text-white text-2xl mt-3">{m.label}</div>
                  <div className="text-xs text-muted mt-0.5">{m.hint}</div>
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              className="input"
              placeholder="Messaggio per la pausa (es. Torniamo tra 10 minuti)"
              value={msg}
              onChange={(e) => { setMsg(e.target.value); setMsgDirty(true) }}
              maxLength={120}
            />
            <button className="btn btn-secondary" onClick={() => setPauseMessage(msg).then(() => setMsgDirty(false))}>Salva</button>
          </div>
        </section>

        {/* ---------- schede ---------- */}
        <div className="inline-flex self-start rounded-2xl bg-white/[.05] border border-line p-1">
          {([['karaoke', 'Karaoke', Mic], ['impostor', 'Impostore', VenetianMask]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${tab === id ? 'bg-brand text-white shadow' : 'text-muted hover:text-white'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === 'karaoke' ? (
          <KaraokeAdmin state={state} queue={queue} presence={online} banned={banned} />
        ) : (
          <ImpostorAdmin game={game} players={players} />
        )}
      </main>
    </div>
  )
}
