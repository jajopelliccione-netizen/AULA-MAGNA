import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Ban, Captions, GripVertical, Lock, Mic, Pause, Play, Plus, SkipForward, Trash2, Unlock, Volume2 } from 'lucide-react'
import type { AppState, BannedDoc, PresenceDoc, QueueItem } from '../../lib/types'
import {
  addManualSong, banNickname, removeFromQueue, reorderQueue, requestSkip, setBookingsOpen, setGobboAudio, setPlayerStatus, setVolume, unban,
} from '../../lib/actions'
import { fetchVideoTitle, parseVideoId, thumbUrl } from '../../lib/youtube'
import { useAct } from './act'

export default function KaraokeAdmin({ state, queue, presence, banned }: { state: AppState; queue: QueueItem[]; presence: PresenceDoc[]; banned: BannedDoc[] }) {
  const act = useAct()
  const np = state.nowPlaying
  const [vol, setVol] = useState(state.volume)
  const volTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => setVol(state.volume), [state.volume])
  const changeVol = (v: number) => {
    setVol(v)
    clearTimeout(volTimer.current)
    volTimer.current = setTimeout(() => act(`ha messo il volume a ${v}`, () => setVolume(v)), 400)
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
    Promise.resolve(act('ha riordinato la coda', () => reorderQueue(queue, arrayMove(queue, from, to)))).catch((err) => alert('Errore nel riordino: ' + err.message))
  }

  return (
    <div className="grid lg:grid-cols-5 gap-5 items-start">
      {/* ---------- colonna sinistra: palco e controlli ---------- */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        <section className="card p-5 flex flex-col gap-4">
          <h2 className="eyebrow text-xs">Sul palco</h2>
          {np ? (
            <div className="flex gap-3 items-center">
              <img src={thumbUrl(np.videoId)} alt="" className="w-28 aspect-video object-cover rounded-xl bg-surface-2" />
              <div className="min-w-0">
                <div className="display text-white text-3xl leading-none truncate">{np.nickname}</div>
                <div className="text-sm text-muted mt-1 line-clamp-2">{np.title}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted rounded-xl bg-white/[.04] border border-line px-4 py-4">
              <Mic className="w-5 h-5" /> {state.playerStatus === 'between' ? 'Prossimo brano in partenza…' : 'Nessun brano in riproduzione'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {state.playerStatus === 'paused' ? (
              <button className="btn btn-success py-3" disabled={!np} onClick={() => act('ha ripreso il video', () => setPlayerStatus('playing'))}><Play className="w-4 h-4" fill="currentColor" /> Riprendi</button>
            ) : (
              <button className="btn btn-secondary py-3" disabled={!np} onClick={() => act('ha messo in pausa il video', () => setPlayerStatus('paused'))}><Pause className="w-4 h-4" fill="currentColor" /> Pausa</button>
            )}
            <button className="btn btn-danger py-3" disabled={!np && state.playerStatus !== 'between'} onClick={() => act('ha saltato la canzone', () => requestSkip())}><SkipForward className="w-4 h-4" fill="currentColor" /> Salta</button>
          </div>

          <label className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-ice shrink-0" />
            <input type="range" min={0} max={100} value={vol} onChange={(e) => changeVol(Number(e.target.value))} className="flex-1 accent-[#2f93f0]" />
            <span className="w-9 text-right font-bold tabular-nums">{vol}</span>
          </label>

          {state.mode !== 'karaoke' && (
            <p className="text-warn text-sm rounded-xl bg-warn/10 border border-warn/30 px-3 py-2">Lo schermo non è in modalità Karaoke: la coda non avanza.</p>
          )}
        </section>

        <section className="card p-5 flex flex-col gap-1">
          <h2 className="eyebrow text-xs mb-2">Impostazioni</h2>
          <Switch
            on={state.bookingsOpen}
            onChange={(v) => act(v ? 'ha aperto le prenotazioni' : 'ha chiuso le prenotazioni', () => setBookingsOpen(v))}
            icon={state.bookingsOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            title="Prenotazioni aperte"
            hint={state.bookingsOpen ? 'I ragazzi possono prenotare' : 'Prenotazioni bloccate'}
          />
          <Switch
            on={state.gobboAudio}
            onChange={(v) => act(v ? 'ha attivato l’audio sul gobbo' : 'ha spento l’audio sul gobbo', () => setGobboAudio(v))}
            icon={<Captions className="w-5 h-5" />}
            title="Audio anche sul gobbo"
            hint="Di norma l’audio esce solo dallo schermo del proiettore"
          />
        </section>

        <AddSong />
      </div>

      {/* ---------- colonna destra: coda e ban ---------- */}
      <div className="lg:col-span-3 flex flex-col gap-5">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="display text-white text-2xl">Coda <span className="text-muted">({queue.length})</span></h2>
            <span className="text-xs text-muted">Trascina per riordinare</span>
          </div>
          {queue.length === 0 && <p className="text-muted text-sm rounded-xl bg-white/[.04] border border-line px-4 py-6 text-center">Coda vuota</p>}
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

        <BanBox presence={presence} queue={queue} banned={banned} />
      </div>
    </div>
  )
}

function Switch({ on, onChange, icon, title, hint }: { on: boolean; onChange: (v: boolean) => void; icon: ReactNode; title: string; hint: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center gap-3 text-left rounded-xl px-2 py-2.5 hover:bg-white/[.05] transition" role="switch" aria-checked={on}>
      <span className={`grid place-items-center w-10 h-10 rounded-xl ${on ? 'bg-brand/20 text-ice' : 'bg-white/[.06] text-muted'}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-sm">{title}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className={`relative w-11 h-6 rounded-full transition ${on ? 'bg-brand' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

function Row({ item, index, presence, queue }: { item: QueueItem; index: number; presence: PresenceDoc[]; queue: QueueItem[] }) {
  const act = useAct()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`flex items-center gap-2.5 rounded-2xl bg-white/[.045] border border-line p-2 ${isDragging ? 'ring-2 ring-brand shadow-2xl' : ''}`}
    >
      <button className="px-1 text-muted cursor-grab touch-none hover:text-white" aria-label="Trascina" {...attributes} {...listeners}><GripVertical className="w-5 h-5" /></button>
      <span className="display text-xl w-6 text-center text-ice">{index + 1}</span>
      <img src={item.thumbnail} alt="" className="w-20 aspect-video object-cover rounded-lg bg-surface-2" />
      <div className="min-w-0 flex-1">
        <div className="font-bold truncate">{item.nickname}{item.uid === 'manual' && <span className="ml-2 chip !py-0 !text-[.65rem]">admin</span>}</div>
        <div className="text-xs text-muted truncate">{item.title}</div>
      </div>
      <button className="btn btn-icon" title="Elimina" onClick={() => act(`ha tolto «${item.nickname}» dalla coda`, () => removeFromQueue(item.id))}><Trash2 className="w-4 h-4" /></button>
      {item.uid !== 'manual' && (
        <button className="btn btn-icon btn-danger" title="Banna nickname" onClick={() => confirm(`Bannare "${item.nickname}"?`) && act(`ha bannato «${item.nickname}»`, () => banNickname(item.nickname, presence, queue))}><Ban className="w-4 h-4" /></button>
      )}
    </li>
  )
}

function AddSong() {
  const act = useAct()
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
      await act(`ha aggiunto «${t}» in coda`, () => addManualSong(id, t, who.trim() || 'Admin'))
      setLink(''); setTitle(''); setWho('')
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="card p-5 flex flex-col gap-3">
      <h2 className="eyebrow text-xs">Aggiungi una canzone a mano</h2>
      <input className="input" placeholder="Link YouTube o ID video" value={link} onChange={(e) => setLink(e.target.value)} />
      <input className="input" placeholder="Titolo (facoltativo)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className="input" placeholder="Chi canta (default Admin)" value={who} onChange={(e) => setWho(e.target.value)} maxLength={16} />
      {err && <p className="text-bad text-sm">{err}</p>}
      <button className="btn btn-primary py-3" disabled={busy || !link.trim()}><Plus className="w-4 h-4" /> {busy ? 'Aggiungo…' : 'Aggiungi in coda'}</button>
    </form>
  )
}

function BanBox({ presence, queue, banned }: { presence: PresenceDoc[]; queue: QueueItem[]; banned: BannedDoc[] }) {
  const act = useAct()
  const [nick, setNick] = useState('')
  const nickBans = banned.filter((b) => !b.uid)
  const deviceBans = banned.filter((b) => b.uid)
  return (
    <section className="card p-5 flex flex-col gap-3">
      <h2 className="eyebrow text-xs">Nickname bannati</h2>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (nick.trim()) Promise.resolve(act(`ha bannato «${nick.trim()}»`, () => banNickname(nick.trim(), presence, queue))).then(() => setNick(''))
        }}
      >
        <input className="input" placeholder="Nickname da bannare" value={nick} onChange={(e) => setNick(e.target.value)} list="online-nicks" />
        <datalist id="online-nicks">{presence.map((p) => <option key={p.id} value={p.nickname} />)}</datalist>
        <button className="btn btn-danger"><Ban className="w-4 h-4" /> Banna</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {nickBans.length === 0 && <span className="text-muted text-sm">Nessun ban attivo</span>}
        {nickBans.map((b) => (
          <button key={b.id} className="chip border-bad/40 bg-bad/10 text-[#ff9aab] hover:bg-bad/20" title="Clicca per togliere il ban" onClick={() => confirm(`Togliere il ban a "${b.nickname}"?`) && act(`ha tolto il ban a «${b.nickname}»`, () => unbanAll(b, banned))}>
            <Ban className="w-3 h-3" /> {b.nickname} <span className="opacity-60">✕</span>
          </button>
        ))}
      </div>
      {deviceBans.length > 0 && <p className="text-xs text-muted">{deviceBans.length} dispositivi bloccati insieme ai nickname.</p>}
    </section>
  )
}

/** Toglie il ban al nickname e ai dispositivi collegati. */
async function unbanAll(b: BannedDoc, all: BannedDoc[]) {
  await unban(b.id)
  await Promise.all(all.filter((x) => x.uid && x.nickname === b.nickname).map((x) => unban(x.id)))
}
