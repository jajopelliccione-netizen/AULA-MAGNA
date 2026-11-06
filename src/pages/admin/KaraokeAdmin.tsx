import { useEffect, useRef, useState, type FormEvent } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { AppState, BannedDoc, PresenceDoc, QueueItem } from '../../lib/types'
import {
  addManualSong, banNickname, removeFromQueue, reorderQueue, requestSkip, setBookingsOpen, setPlayerStatus, setVolume, unban,
} from '../../lib/actions'
import { fetchVideoTitle, parseVideoId } from '../../lib/youtube'

export default function KaraokeAdmin({ state, queue, presence, banned }: { state: AppState; queue: QueueItem[]; presence: PresenceDoc[]; banned: BannedDoc[] }) {
  const np = state.nowPlaying
  const [vol, setVol] = useState(state.volume)
  const volTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => setVol(state.volume), [state.volume])
  const changeVol = (v: number) => {
    setVol(v)
    clearTimeout(volTimer.current)
    volTimer.current = setTimeout(() => setVolume(v), 250)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = queue.findIndex((q) => q.id === active.id)
    const to = queue.findIndex((q) => q.id === over.id)
    if (from < 0 || to < 0) return
    reorderQueue(queue, arrayMove(queue, from, to)).catch((err) => alert('Errore nel riordino: ' + err.message))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Player */}
      <section className="card p-4 flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-widest text-white/50 font-bold">Sul palco</h2>
        {np ? (
          <div>
            <div className="text-2xl font-black text-neon-pink">🎤 {np.nickname}</div>
            <div className="text-white/80">{np.title}</div>
          </div>
        ) : (
          <div className="text-white/60">
            {state.playerStatus === 'between' ? 'Prossimo brano in partenza…' : 'Nessun brano in riproduzione'}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {state.playerStatus === 'paused' ? (
            <button className="btn btn-lime" disabled={!np} onClick={() => setPlayerStatus('playing')}>▶ Riprendi</button>
          ) : (
            <button className="btn btn-cyan" disabled={!np} onClick={() => setPlayerStatus('paused')}>⏸ Pausa</button>
          )}
          <button className="btn btn-red" disabled={!np && state.playerStatus !== 'between'} onClick={() => requestSkip()}>⏭ Salta</button>
          <button className={`btn ${state.bookingsOpen ? '' : 'btn-red'}`} onClick={() => setBookingsOpen(!state.bookingsOpen)}>
            {state.bookingsOpen ? '🔓 Prenotazioni aperte' : '🔒 Prenotazioni bloccate'}
          </button>
        </div>
        <label className="flex items-center gap-3">
          <span className="text-xl">🔊</span>
          <input type="range" min={0} max={100} value={vol} onChange={(e) => changeVol(Number(e.target.value))} className="flex-1 accent-fuchsia-500" />
          <span className="w-10 text-right font-bold tabular-nums">{vol}</span>
        </label>
        {state.mode !== 'karaoke' && <p className="text-neon-yellow text-sm">⚠️ Lo schermo non è in modalità Karaoke: la coda non avanza.</p>}
      </section>

      {/* Coda */}
      <section className="card p-4">
        <h2 className="text-xs uppercase tracking-widest text-white/50 font-bold mb-3">Coda ({queue.length}) · trascina ⠿ per riordinare</h2>
        {queue.length === 0 && <p className="text-white/50">Coda vuota</p>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={queue.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {queue.map((q, i) => (
                <Row key={q.id} item={q} index={i} presence={presence} queue={queue} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </section>

      <AddSong />

      <BanBox presence={presence} queue={queue} banned={banned} />
    </div>
  )
}

function Row({ item, index, presence, queue }: { item: QueueItem; index: number; presence: PresenceDoc[]; queue: QueueItem[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`flex items-center gap-2 rounded-xl bg-white/5 p-2 ${isDragging ? 'ring-2 ring-neon-pink' : ''}`}
    >
      <button className="px-2 text-2xl text-white/60 cursor-grab touch-none" aria-label="Trascina" {...attributes} {...listeners}>⠿</button>
      <span className="w-6 text-center font-black text-neon-cyan">{index + 1}</span>
      <img src={item.thumbnail} alt="" className="w-16 aspect-video object-cover rounded" />
      <div className="min-w-0 flex-1">
        <div className="font-bold truncate">{item.nickname}{item.uid === 'manual' && <span className="ml-1 text-xs text-white/50">(admin)</span>}</div>
        <div className="text-xs text-white/60 truncate">{item.title}</div>
      </div>
      <button className="btn text-sm px-3 py-1.5" title="Elimina" onClick={() => removeFromQueue(item.id)}>🗑</button>
      {item.uid !== 'manual' && (
        <button
          className="btn text-sm px-3 py-1.5"
          title="Banna nickname"
          onClick={() => confirm(`Bannare "${item.nickname}"?`) && banNickname(item.nickname, presence, queue)}
        >🚫</button>
      )}
    </li>
  )
}

function AddSong() {
  const [link, setLink] = useState('')
  const [title, setTitle] = useState('')
  const [who, setWho] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const id = parseVideoId(link)
    if (!id) return setErr('Link o ID YouTube non valido')
    setBusy(true)
    setErr('')
    try {
      const t = title.trim() || (await fetchVideoTitle(id)) || 'Video YouTube'
      await addManualSong(id, t, who.trim() || 'Admin')
      setLink(''); setTitle(''); setWho('')
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="card p-4 flex flex-col gap-2">
      <h2 className="text-xs uppercase tracking-widest text-white/50 font-bold">Aggiungi canzone a mano</h2>
      <input className="input" placeholder="Link YouTube o ID video" value={link} onChange={(e) => setLink(e.target.value)} />
      <div className="grid sm:grid-cols-2 gap-2">
        <input className="input" placeholder="Titolo (facoltativo)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" placeholder="Nome di chi canta (default Admin)" value={who} onChange={(e) => setWho(e.target.value)} maxLength={16} />
      </div>
      {err && <p className="text-red-300 text-sm">{err}</p>}
      <button className="btn btn-pink" disabled={busy || !link.trim()}>{busy ? 'Aggiungo…' : '＋ Aggiungi in coda'}</button>
    </form>
  )
}

function BanBox({ presence, queue, banned }: { presence: PresenceDoc[]; queue: QueueItem[]; banned: BannedDoc[] }) {
  const [nick, setNick] = useState('')
  const nickBans = banned.filter((b) => !b.uid)
  const deviceBans = banned.filter((b) => b.uid)
  return (
    <section className="card p-4 flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-white/50 font-bold">Ban nickname</h2>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (nick.trim()) banNickname(nick.trim(), presence, queue).then(() => setNick(''))
        }}
      >
        <input className="input" placeholder="Nickname da bannare" value={nick} onChange={(e) => setNick(e.target.value)} list="online-nicks" />
        <datalist id="online-nicks">{presence.map((p) => <option key={p.id} value={p.nickname} />)}</datalist>
        <button className="btn btn-red">Banna</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {nickBans.length === 0 && <span className="text-white/50 text-sm">Nessun ban attivo</span>}
        {nickBans.map((b) => (
          <button key={b.id} className="rounded-full bg-red-500/20 border border-red-400/40 px-3 py-1 text-sm" onClick={() => confirm(`Togliere il ban a "${b.nickname}"?`) && unbanAll(b, banned)}>
            🚫 {b.nickname} ✕
          </button>
        ))}
      </div>
      {deviceBans.length > 0 && <p className="text-xs text-white/40">{deviceBans.length} dispositivi bloccati insieme ai nickname.</p>}
    </section>
  )
}

/** Toglie il ban al nickname e ai dispositivi collegati. */
async function unbanAll(b: BannedDoc, all: BannedDoc[]) {
  await unban(b.id)
  await Promise.all(all.filter((x) => x.uid && x.nickname === b.nickname).map((x) => unban(x.id)))
}
