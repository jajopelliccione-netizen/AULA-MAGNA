import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
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
    <StaffGate title="Pannello admin">
      <AdminInner />
    </StaffGate>
  )
}

const MODES: { id: Mode; label: string; emoji: string }[] = [
  { id: 'lobby', label: 'Lobby', emoji: '🏠' },
  { id: 'karaoke', label: 'Karaoke', emoji: '🎤' },
  { id: 'impostor', label: 'Impostore', emoji: '🕵️' },
  { id: 'pause', label: 'Pausa', emoji: '⏸️' },
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

  if (!ready) return <div className="min-h-full bg-aurora grid place-items-center text-white/60">Carico…</div>

  return (
    <div className="min-h-full bg-aurora">
      <header className="sticky top-0 z-20 bg-ink/85 backdrop-blur border-b border-white/10 px-4 py-2 flex items-center justify-between gap-3">
        <BrandTitle size={38} />
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-neon-lime/15 border border-neon-lime/50 px-3 py-1 text-sm font-black text-neon-lime">🟢 {count} online</div>
          <a href="/schermo" target="_blank" rel="noreferrer" className="btn text-xs py-1.5 px-3">Schermo ↗</a>
          <button className="btn text-xs py-1.5 px-3" onClick={() => signOut(auth)}>Esci</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 flex flex-col gap-4">
        <section className="card p-4">
          <h2 className="text-xs uppercase tracking-widest text-white/50 font-bold mb-3">Cosa mostra lo schermo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`btn flex-col py-4 text-lg ${state.mode === m.id ? 'btn-pink box-glow-pink' : ''}`}
              >
                <span className="text-3xl">{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="input"
              placeholder="Messaggio per la pausa (es. Torniamo tra 10 minuti)"
              value={msg}
              onChange={(e) => { setMsg(e.target.value); setMsgDirty(true) }}
              maxLength={120}
            />
            <button className="btn btn-cyan" onClick={() => setPauseMessage(msg).then(() => setMsgDirty(false))}>Salva</button>
          </div>
        </section>

        <div className="flex gap-2">
          <button className={`btn flex-1 ${tab === 'karaoke' ? 'btn-cyan' : ''}`} onClick={() => setTab('karaoke')}>🎤 Karaoke</button>
          <button className={`btn flex-1 ${tab === 'impostor' ? 'btn-cyan' : ''}`} onClick={() => setTab('impostor')}>🕵️ Impostore</button>
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
