import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Ban, Captions, Check, GripVertical, Lock, Mic, Music2, Pause, Play, PlayCircle, Plus, RotateCcw, Search, SkipForward, Trash2, Unlock, Volume2, X } from 'lucide-react'
import type { AppState, BannedDoc, Kind, PresenceDoc, QueueItem } from '../../lib/types'
import {
  addManualSong, approveAll, approveRequest, banNickname, rejectRequest, removeFromQueue, moveInQueue, requestSkip, restartSong, setAutoApprove, setBookingsOpen, setGobboAudio, setPlayback, setPlayerStatus, startNextSong, setVolume, unban,
} from '../../lib/actions'
import { fetchVideoTitle, parseVideoId, searchSongs, thumbUrl, YtError, type YtResult } from '../../lib/youtube'
import { useAct } from './act'

const LABELS: Record<Kind, { stage: string; mode: string; manual: string }> = {
  karaoke: { stage: 'Sul palco', mode: 'Karaoke', manual: 'Chi canta (default Admin)' },
  music: { stage: 'In riproduzione', mode: 'Musica', manual: 'Chi la chiede (default Admin)' },
}

export default function KaraokeAdmin({ state, queue, pending, presence, banned, kind, serverNow }: { state: AppState; queue: QueueItem[]; pending: QueueItem[]; presence: PresenceDoc[]; banned: BannedDoc[]; kind: Kind; serverNow: () => number }) {
  const act = useAct()
  const L = LABELS[kind]
  const np = state.nowPlaying && (state.nowPlaying.kind ?? 'karaoke') === kind ? state.nowPlaying : null
  const head = queue[0]
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
    Promise.resolve(act('ha riordinato la coda', () => moveInQueue(queue, String(active.id), to))).catch((err) => alert('Errore nel riordino: ' + err.message))
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5 lg:grid lg:grid-cols-5 lg:items-start">
      <NowBar kind={kind} state={state} np={np} head={head} act={act} />

      {/* ============ colonna sinistra: cosa sta suonando e come controllarlo ============ */}
      <div className="contents lg:flex lg:flex-col lg:gap-5 lg:col-span-2">
        <section className="order-2 lg:order-none card p-4 sm:p-5 flex flex-col gap-4">
          <h2 className="display text-white text-2xl">{L.stage}</h2>

          {/* 1) cosa c'è / cosa viene dopo */}
          {np ? (
            <div className="flex gap-3 items-center">
              <img src={thumbUrl(np.videoId)} alt="" className="w-28 aspect-video object-cover rounded-xl bg-surface-2" />
              <div className="min-w-0">
                <div className="display text-white text-3xl leading-none truncate">{np.nickname}</div>
                <div className="text-sm text-muted mt-1 line-clamp-2">{np.title}</div>
              </div>
            </div>
          ) : head ? (
            <div className="rounded-2xl bg-brand/12 border border-brand/40 p-4 flex flex-col gap-3">
              <div className="eyebrow text-xs">{state.playerStatus === 'between' ? 'In partenza tra poco' : 'Prossima canzone · in attesa'}</div>
              <div>
                <div className="display text-white text-3xl leading-none">{kind === 'karaoke' ? 'Sul palco: ' : ''}{head.nickname}</div>
                <div className="text-sm text-muted mt-1 line-clamp-2">{head.title}</div>
              </div>
              <button className="btn btn-primary py-3.5 text-base" onClick={() => act(`ha avviato «${head.title}» di ${head.nickname}`, () => startNextSong(head))}>
                <PlayCircle className="w-5 h-5" /> {state.playerStatus === 'between' ? 'Avvia subito' : 'Avvia la canzone'}
              </button>
              {state.hold && <p className="text-xs text-muted">Sei appena entrato in questa modalità: nulla parte da solo. Avvia quando sei pronto.</p>}
              {!state.hold && state.playback === 'manual' && <p className="text-xs text-muted">Riproduzione manuale: ogni canzone parte solo quando premi Avvia.</p>}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted rounded-xl bg-white/[.04] border border-line px-4 py-4">
              {kind === 'karaoke' ? <Mic className="w-5 h-5" /> : <Music2 className="w-5 h-5" />} Nessun brano in coda
            </div>
          )}

          {np && state.hold && state.playerStatus === 'paused' && (
            <p className="text-warn text-sm rounded-xl bg-warn/10 border border-warn/30 px-3 py-2">Questa canzone era rimasta in pausa: premi Riprendi quando vuoi farla ripartire.</p>
          )}

          {/* 2) comandi del brano: una sola fila di tre pulsanti uguali */}
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Comandi del brano">
            <button className="btn flex-col !gap-1 py-3 text-xs" disabled={!np} onClick={() => act('ha fatto ricominciare la canzone da capo', () => restartSong())}>
              <RotateCcw className="w-5 h-5" /> Da capo
            </button>
            {state.playerStatus === 'paused' ? (
              <button className="btn btn-success flex-col !gap-1 py-3 text-xs" disabled={!np} onClick={() => act('ha ripreso il video', () => setPlayerStatus('playing'))}><Play className="w-5 h-5" fill="currentColor" /> Riprendi</button>
            ) : (
              <button className="btn btn-secondary flex-col !gap-1 py-3 text-xs" disabled={!np} onClick={() => act('ha messo in pausa il video', () => setPlayerStatus('paused'))}><Pause className="w-5 h-5" fill="currentColor" /> Pausa</button>
            )}
            <button className="btn btn-danger flex-col !gap-1 py-3 text-xs" disabled={!np && state.playerStatus !== 'between'} onClick={() => act('ha saltato la canzone', () => requestSkip())}><SkipForward className="w-5 h-5" fill="currentColor" /> Salta</button>
          </div>

          {/* 3) volume */}
          <label className="flex items-center gap-3 rounded-xl bg-white/[.04] border border-line px-3.5 py-2.5">
            <Volume2 className="w-5 h-5 text-ice shrink-0" />
            <input type="range" min={0} max={100} value={vol} onChange={(e) => changeVol(Number(e.target.value))} className="flex-1 accent-[#2f93f0]" aria-label="Volume" />
            <span className="w-9 text-right font-bold tabular-nums">{vol}</span>
          </label>

          {state.mode !== kind && (
            <p className="text-warn text-sm rounded-xl bg-warn/10 border border-warn/30 px-3 py-2">Lo schermo non è in modalità {L.mode}: la coda non avanza.</p>
          )}
        </section>

        <AddSong kind={kind} className="order-4 lg:order-none" />
      </div>

      {/* ============ colonna destra: richieste e coda ============ */}
      <div className="contents lg:flex lg:flex-col lg:gap-5 lg:col-span-3">
        <Requests pending={pending} serverNow={serverNow} auto={!!state.autoApprove?.[kind]} className="order-1 lg:order-none" />

        <section className="order-3 lg:order-none card p-4 sm:p-5">
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
      </div>

      {/* ============ riga in basso: impostazioni e moderazione ============ */}
      <div className="order-5 lg:order-none lg:col-span-5 grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start">
        <section className="card p-4 sm:p-5">
          <h2 className="display text-white text-2xl mb-2">Impostazioni</h2>
          <Group title="Richieste dei ragazzi">
            <Switch
              on={state.bookingsOpen}
              onChange={(v) => act(v ? 'ha aperto le richieste' : 'ha chiuso le richieste', () => setBookingsOpen(v))}
              icon={state.bookingsOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              title="Richieste aperte"
              hint={state.bookingsOpen ? 'I ragazzi possono proporre canzoni' : 'Richieste bloccate'}
            />
            <Switch
              on={!!state.autoApprove?.[kind]}
              onChange={(v) => act(v ? `ha attivato l’approvazione automatica (${L.mode})` : `ha spento l’approvazione automatica (${L.mode})`, () => setAutoApprove(kind, v))}
              icon={<Check className="w-5 h-5" />}
              title="Approvazione automatica"
              hint={state.autoApprove?.[kind] ? 'Le richieste entrano subito in coda (puoi sempre toglierle)' : 'Ogni richiesta aspetta il tuo OK'}
            />
          </Group>
          <Group title="Riproduzione" last>
            <Switch
              on={state.playback === 'auto'}
              onChange={(v) => act(v ? 'ha attivato la riproduzione automatica' : 'ha attivato la riproduzione manuale', () => setPlayback(v ? 'auto' : 'manual'))}
              icon={<PlayCircle className="w-5 h-5" />}
              title="Riproduzione automatica"
              hint={state.playback === 'auto' ? 'Dopo il primo avvio le canzoni partono da sole' : 'Manuale: ogni canzone parte solo quando premi Avvia'}
            />
            {kind === 'karaoke' && (
              <Switch
                on={state.gobboAudio}
                onChange={(v) => act(v ? 'ha attivato l’audio sul gobbo' : 'ha spento l’audio sul gobbo', () => setGobboAudio(v))}
                icon={<Captions className="w-5 h-5" />}
                title="Audio anche sul gobbo"
                hint="Di norma l’audio esce solo dallo schermo del proiettore"
              />
            )}
          </Group>
        </section>

        <BanBox presence={presence} queue={queue} banned={banned} />
      </div>
    </div>
  )
}

/** Gruppo di impostazioni con un titoletto. */
function Group({ title, children, last = false }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`${last ? '' : 'border-b border-line pb-2 mb-2'}`}>
      <div className="eyebrow text-[.68rem] px-2 pt-2 pb-1">{title}</div>
      {children}
    </div>
  )
}

export function Switch({ on, onChange, icon, title, hint }: { on: boolean; onChange: (v: boolean) => void; icon: ReactNode; title: string; hint: string }) {
  return (
    <button onClick={() => onChange(!on)} className="w-full flex items-center gap-3 text-left rounded-xl px-2 py-2.5 hover:bg-white/[.05] transition" role="switch" aria-checked={on}>
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
      className={`flex items-center gap-1.5 sm:gap-2.5 rounded-2xl bg-white/[.045] border border-line p-1.5 sm:p-2 ${isDragging ? 'ring-2 ring-brand shadow-2xl' : ''}`}
    >
      <button className="px-1.5 py-3 text-muted cursor-grab touch-none hover:text-white" aria-label="Trascina" {...attributes} {...listeners}><GripVertical className="w-5 h-5" /></button>
      <span className="display text-lg sm:text-xl w-5 sm:w-6 text-center text-ice">{index + 1}</span>
      <img src={item.thumbnail} alt="" className="hidden min-[400px]:block w-16 sm:w-20 aspect-video object-cover rounded-lg bg-surface-2" />
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

/** Aggiunta di una canzone da parte dell'admin: si cerca come fanno i ragazzi (oppure si incolla un link) e va subito in coda. */
function AddSong({ kind, className = '' }: { kind: Kind; className?: string }) {
  const act = useAct()
  const [q, setQ] = useState('')
  const [onlyKaraoke, setOnlyKaraoke] = useState(true)
  const [results, setResults] = useState<YtResult[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [who, setWho] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // link (alternativa alla ricerca)
  const [link, setLink] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const nick = () => who.trim() || 'Admin'

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (q.trim().length < 2) return
    setSearching(true)
    setErr('')
    setMsg('')
    try {
      // per il karaoke, "solo karaoke" tiene le basi con testo; spento cerca qualsiasi video musicale
      const r = await searchSongs(q, kind === 'karaoke' && onlyKaraoke ? 'karaoke' : 'music')
      setResults(r)
      if (r.length === 0) setErr('Nessun risultato: prova con titolo + artista')
    } catch (ex) {
      setErr(ex instanceof YtError ? ex.message : 'Errore nella ricerca')
    } finally {
      setSearching(false)
    }
  }

  const add = async (r: YtResult) => {
    setAdding(r.videoId)
    setErr('')
    try {
      await act(`ha aggiunto «${r.title}» in coda`, () => addManualSong(r.videoId, r.title, nick(), kind))
      setMsg(`Aggiunta in coda: ${r.title}`)
      setResults([])
      setQ('')
      setWho('')
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setAdding(null)
    }
  }

  const submitLink = async (e: FormEvent) => {
    e.preventDefault()
    const id = parseVideoId(link)
    if (!id) return setErr('Link o ID YouTube non valido')
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      const t = title.trim() || (await fetchVideoTitle(id)) || 'Video YouTube'
      await act(`ha aggiunto «${t}» in coda`, () => addManualSong(id, t, nick(), kind))
      setMsg(`Aggiunta in coda: ${t}`)
      setLink('')
      setTitle('')
      setWho('')
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`card p-4 sm:p-5 flex flex-col gap-3 ${className}`}>
      <h2 className="display text-white text-2xl">Aggiungi una canzone</h2>
      <p className="text-xs text-muted -mt-2">Le tue canzoni stanno sempre <b className="text-white/80">dopo quelle dei ragazzi</b>: chi prenota dal QR passa davanti.</p>

      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input className="input !pl-10" type="search" enterKeyHint="search" placeholder={kind === 'karaoke' ? 'Cerca titolo e artista' : 'Cerca una canzone'} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn btn-primary shrink-0" disabled={searching || q.trim().length < 2}>{searching ? '…' : 'Cerca'}</button>
      </form>

      <input className="input" placeholder={LABELS[kind].manual} value={who} onChange={(e) => setWho(e.target.value)} maxLength={16} />

      {kind === 'karaoke' && (
        <label className="flex items-center gap-2.5 text-sm text-muted cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 accent-[#2f93f0]" checked={onlyKaraoke} onChange={(e) => setOnlyKaraoke(e.target.checked)} />
          Mostra solo basi karaoke
        </label>
      )}

      {msg && <p className="text-good text-sm flex items-center gap-2"><Check className="w-4 h-4 shrink-0" /> {msg}</p>}
      {err && <p className="text-bad text-sm">{err}</p>}

      {results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((r) => (
            <li key={r.videoId} className="rounded-2xl bg-white/[.045] border border-line p-2 flex items-center gap-2.5">
              <img src={r.thumbnail} alt="" loading="lazy" className="w-20 sm:w-24 aspect-video object-cover rounded-lg bg-surface-2 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-snug line-clamp-2">{r.title}</div>
                <div className="text-xs text-muted truncate">{r.channel}</div>
              </div>
              <button className="btn btn-primary px-3 py-2.5 shrink-0" disabled={adding !== null} onClick={() => add(r)}>
                {adding === r.videoId ? '…' : <><Plus className="w-4 h-4" /> Aggiungi</>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="group rounded-xl border border-line bg-white/[.03]">
        <summary className="cursor-pointer select-none px-3.5 py-2.5 text-sm text-muted hover:text-white list-none flex items-center justify-between">
          Hai un link? Incollalo <span className="transition group-open:rotate-180">⌄</span>
        </summary>
        <form onSubmit={submitLink} className="flex flex-col gap-2 p-3.5 pt-1">
          <input className="input" placeholder="Link YouTube o ID video" value={link} onChange={(e) => setLink(e.target.value)} />
          <input className="input" placeholder="Titolo (facoltativo)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="btn" disabled={busy || !link.trim()}><Plus className="w-4 h-4" /> {busy ? 'Aggiungo…' : 'Aggiungi dal link'}</button>
        </form>
      </details>
    </section>
  )
}

function BanBox({ presence, queue, banned, className = '' }: { presence: PresenceDoc[]; queue: QueueItem[]; banned: BannedDoc[]; className?: string }) {
  const act = useAct()
  const [nick, setNick] = useState('')
  const nickBans = banned.filter((b) => !b.uid)
  const deviceBans = banned.filter((b) => b.uid)
  return (
    <section className={`card p-4 sm:p-5 flex flex-col gap-3 ${className}`}>
      <h2 className="display text-white text-2xl">Moderazione</h2>
      <p className="text-xs text-muted -mt-2">Nickname bannati: non possono più prenotare né giocare.</p>
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

/** Richieste in attesa: nessuna canzone entra in coda senza l'approvazione di un admin. */
function Requests({ pending, serverNow, auto, className = '' }: { pending: QueueItem[]; serverNow: () => number; auto: boolean; className?: string }) {
  const act = useAct()
  return (
    <section className={`card p-4 sm:p-5 ${pending.length ? 'ring-1 ring-warn/60 shadow-[0_12px_50px_-24px_rgba(255,200,87,.9)]' : ''} ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h2 className="display text-white text-2xl flex items-center gap-2">
          Da approvare
          <span className={`chip ${pending.length ? 'border-warn/50 bg-warn/15 text-warn' : ''}`}>{pending.length}</span>
        </h2>
        {pending.length > 1 && (
          <button className="btn btn-success text-sm py-2 px-3" onClick={() => act(`ha approvato ${pending.length} richieste`, () => approveAll(pending.map((p) => p.id), serverNow()))}>
            <Check className="w-4 h-4" /> Approva tutte
          </button>
        )}
      </div>
      {auto && <p className="text-sm rounded-xl bg-good/10 border border-good/35 text-good px-4 py-2.5 mb-3 flex items-center gap-2"><Check className="w-4 h-4 shrink-0" /> Approvazione automatica attiva: le nuove richieste entrano da sole in coda.</p>}
      {pending.length === 0 && <p className="text-muted text-sm rounded-xl bg-white/[.04] border border-line px-4 py-5 text-center">{auto ? 'Nessuna richiesta in sospeso.' : 'Nessuna richiesta in attesa. Quando qualcuno propone una canzone compare qui.'}</p>}
      <ul className="flex flex-col gap-2">
        {pending.map((r) => (
          <li key={r.id} className="rounded-2xl bg-warn/[.07] border border-warn/30 p-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <img src={r.thumbnail} alt="" className="w-20 sm:w-24 aspect-video object-cover rounded-lg bg-surface-2 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">{r.nickname}</div>
                <div className="text-xs text-muted line-clamp-2">{r.title}</div>
                <a className="text-[.7rem] text-ice underline underline-offset-2" href={`https://www.youtube.com/watch?v=${r.videoId}`} target="_blank" rel="noreferrer">Guarda su YouTube</a>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex">
              <button className="btn btn-success px-3 py-3 sm:py-2.5" onClick={() => act(`ha approvato «${r.title}» di ${r.nickname}`, () => approveRequest(r.id, serverNow()))}><Check className="w-4 h-4" /> Approva</button>
              <button className="btn btn-danger btn-icon" title="Rifiuta" onClick={() => act(`ha rifiutato «${r.title}» di ${r.nickname}`, () => rejectRequest(r.id))}><X className="w-4 h-4" /></button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Barra fissa in basso (solo telefono): comandi del brano sempre a portata di pollice,
 * anche scorrendo una coda lunga.
 */
function NowBar({ kind, state, np, head, act }: { kind: Kind; state: AppState; np: AppState['nowPlaying']; head?: QueueItem; act: ReturnType<typeof useAct> }) {
  if (!np && !head) return null
  const paused = state.playerStatus === 'paused'
  return (
    <div className="md:hidden fixed inset-x-0 z-30 px-3 bottom-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="card-solid !bg-surface-2/95 backdrop-blur-xl shadow-2xl ring-1 ring-brand/40 p-2.5 flex items-center gap-2.5">
        <span className="grid place-items-center w-10 h-10 rounded-xl bg-brand/20 text-ice shrink-0">{kind === 'karaoke' ? <Mic className="w-5 h-5" /> : <Music2 className="w-5 h-5" />}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[.62rem] font-bold uppercase tracking-widest text-ice">{np ? (paused ? 'In pausa' : kind === 'karaoke' ? 'Sul palco' : 'In onda') : 'Prossimo'}</div>
          <div className="font-bold truncate">{(np ?? head)?.nickname}</div>
          <div className="text-xs text-muted truncate">{(np ?? head)?.title}</div>
        </div>
        {np ? (
          <>
            {paused ? (
              <button className="btn btn-success btn-icon" aria-label="Riprendi" onClick={() => act('ha ripreso il video', () => setPlayerStatus('playing'))}><Play className="w-5 h-5" fill="currentColor" /></button>
            ) : (
              <button className="btn btn-secondary btn-icon" aria-label="Pausa" onClick={() => act('ha messo in pausa il video', () => setPlayerStatus('paused'))}><Pause className="w-5 h-5" fill="currentColor" /></button>
            )}
            <button className="btn btn-danger btn-icon" aria-label="Salta" onClick={() => act('ha saltato la canzone', () => requestSkip())}><SkipForward className="w-5 h-5" fill="currentColor" /></button>
          </>
        ) : head ? (
          <button className="btn btn-primary px-4 py-3" onClick={() => act(`ha avviato «${head.title}» di ${head.nickname}`, () => startNextSong(head))}><PlayCircle className="w-5 h-5" /> Avvia</button>
        ) : null}
      </div>
    </div>
  )
}
