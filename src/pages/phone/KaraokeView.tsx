import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, Lock, Mic, Music2, Plus, Search, X } from 'lucide-react'
import { useQueue } from '../../lib/hooks'
import { bookSong, cancelBooking } from '../../lib/actions'
import { searchKaraoke, youtubeConfigured, YtError, type YtResult } from '../../lib/youtube'
import { isProfane } from '../../lib/profanity'
import { plural } from '../../lib/util'
import type { AppState } from '../../lib/types'

export default function KaraokeView({ uid, nick, state }: { uid: string; nick: string; state: AppState }) {
  const { queue } = useQueue()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<YtResult[]>([])
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState('')
  const [booking, setBooking] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState('')

  const myIndex = queue.findIndex((i) => i.uid === uid)
  const mine = myIndex >= 0 ? queue[myIndex] : null
  const np = state.nowPlaying

  // "TOCCA A TE": sono il prossimo mentre scorre il conto alla rovescia, oppure sto cantando
  const head = queue[0]
  const callKey =
    state.playerStatus === 'between' && head && head.uid === uid
      ? `${uid}:${head.createdAt}`
      : np && np.uid === uid
        ? `${uid}:${np.bookedAt}`
        : ''
  const showCall = callKey !== '' && callKey !== dismissed
  const lastVibrated = useRef('')
  useEffect(() => {
    if (showCall && lastVibrated.current !== callKey) {
      lastVibrated.current = callKey
      try { navigator.vibrate?.([300, 150, 300, 150, 600]) } catch { /* ok */ }
    }
  }, [showCall, callKey])

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (q.trim().length < 2) return
    if (isProfane(q)) return setErr('Ricerca non consentita')
    setSearching(true)
    setErr('')
    try {
      const r = await searchKaraoke(q)
      setResults(r.filter((x) => !isProfane(x.title)))
      if (r.length === 0) setErr('Nessuna versione karaoke trovata: prova con titolo + artista (es. "Albachiara Vasco Rossi")')
    } catch (ex) {
      setErr(ex instanceof YtError ? ex.message : 'Errore nella ricerca')
    } finally {
      setSearching(false)
    }
  }

  const book = async (r: YtResult) => {
    if (mine || !state.bookingsOpen) return
    setBooking(r.videoId)
    setErr('')
    try {
      await bookSong(uid, nick, r)
      setResults([])
      setQ('')
    } catch {
      setErr('Non sono riuscito a prenotare: le prenotazioni potrebbero essere chiuse o hai già una canzone in coda')
    } finally {
      setBooking(null)
    }
  }

  const songsAhead = myIndex + (np ? 1 : 0)
  const position = myIndex === 0 ? 'Sei il prossimo' : `Tocca a te tra ${songsAhead} ${plural(songsAhead, 'canzone', 'canzoni')}`

  return (
    <div className="p-4 flex flex-col gap-5 pb-10">
      {showCall && <CallOverlay title={mine?.title ?? np?.title ?? ''} onClose={() => setDismissed(callKey)} />}

      {!state.bookingsOpen && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-bad/12 border border-bad/40 px-4 py-3 text-sm font-semibold text-[#ff9aab]">
          <Lock className="w-4 h-4 shrink-0" /> Le prenotazioni sono chiuse al momento
        </div>
      )}

      {mine ? (
        <section className="card p-4 flex flex-col gap-4 ring-1 ring-brand/50">
          <div className="eyebrow text-xs">La tua prenotazione</div>
          <div className="flex gap-3 items-center">
            <img src={mine.thumbnail} alt="" width={112} height={63} className="rounded-xl w-28 aspect-video object-cover bg-surface-2" />
            <div className="min-w-0 font-semibold leading-snug line-clamp-3 text-sm">{mine.title}</div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-brand/12 border border-brand/35 px-4 py-3">
            <Music2 className="w-5 h-5 text-ice shrink-0" />
            <div className="display text-white text-[1.7rem]">{position}</div>
          </div>
          <button className="btn btn-danger" onClick={() => cancelBooking(uid)}><X className="w-4 h-4" /> Annulla prenotazione</button>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="display text-white text-3xl">Prenota la tua canzone</h2>
            <p className="text-sm text-muted mt-1">Cerca titolo e artista: mostriamo solo basi karaoke con il testo.</p>
          </div>
          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                className="input !pl-10"
                type="search"
                inputMode="search"
                enterKeyHint="search"
                placeholder="Es. Albachiara Vasco Rossi"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={!state.bookingsOpen}
              />
            </div>
            <button className="btn btn-primary px-5" disabled={searching || !state.bookingsOpen}>{searching ? '…' : 'Cerca'}</button>
          </form>
          {!youtubeConfigured && <p className="text-warn text-sm">Ricerca non attiva: chiedi all'admin di aggiungere la tua canzone.</p>}
          {err && <p className="text-bad text-sm">{err}</p>}
          <ul className="flex flex-col gap-2.5">
            {results.map((r) => (
              <li key={r.videoId} className="card p-2.5 flex gap-3 items-center">
                <img src={r.thumbnail} alt="" loading="lazy" width={112} height={63} className="rounded-lg w-28 aspect-video object-cover bg-surface-2 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-snug line-clamp-2">{r.title}</div>
                  <div className="text-xs text-muted truncate mt-0.5">{r.channel}</div>
                </div>
                <button className="btn btn-primary px-3 py-2.5" disabled={booking !== null || !state.bookingsOpen} onClick={() => book(r)} aria-label="Prenota">
                  {booking === r.videoId ? '…' : <><Plus className="w-4 h-4" /> Prenota</>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="eyebrow text-xs">Sul palco e in coda</h2>
          {queue.length > 0 && <span className="chip">{queue.length}</span>}
        </div>
        {np && (
          <div className="card p-3 mb-2.5 flex gap-3 items-center ring-1 ring-good/50">
            <span className="grid place-items-center w-10 h-10 rounded-full bg-good/15 text-good shrink-0"><Mic className="w-5 h-5" /></span>
            <div className="min-w-0">
              <div className="text-[.65rem] font-bold uppercase tracking-widest text-good">Ora sul palco</div>
              <div className="font-bold truncate">{np.nickname}</div>
              <div className="text-xs text-muted truncate">{np.title}</div>
            </div>
          </div>
        )}
        {queue.length === 0 && !np && <p className="text-muted text-sm">Nessuno in coda: sii il primo!</p>}
        <ol className="flex flex-col gap-1.5">
          {queue.slice(0, 12).map((it, i) => (
            <li key={it.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm border ${it.uid === uid ? 'bg-brand/12 border-brand/50' : 'bg-white/[.04] border-line'}`}>
              <span className="display text-xl w-6 text-center text-ice">{i + 1}</span>
              <span className="font-bold truncate max-w-[36%]">{it.nickname}</span>
              <span className="text-muted truncate">{it.title}</span>
            </li>
          ))}
        </ol>
        {queue.length > 12 && <p className="text-xs text-muted mt-2">e altre {queue.length - 12} canzoni</p>}
      </section>
    </div>
  )
}

export function CallOverlay({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 anim-flash flex flex-col items-center justify-center text-center p-6 gap-7 text-white overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(80vmin 80vmin at 50% 38%, rgba(255,255,255,.22), transparent 70%)' }}>
      <div className="relative grid place-items-center w-36 h-36">
        <span className="ring-pulse w-36 h-36" />
        <span className="ring-pulse w-36 h-36" style={{ animationDelay: '.7s' }} />
        <div className="relative grid place-items-center w-36 h-36 rounded-full bg-white text-brand-deep shadow-2xl">
          <Mic className="w-16 h-16 anim-shake" />
        </div>
      </div>
      <div>
        <h1 className="display text-[5.5rem] leading-[.9]">Tocca a te</h1>
        <p className="display text-3xl mt-3 text-white/90">Vai sul palco</p>
      </div>
      {title && <p className="max-w-xs text-sm font-semibold bg-black/25 rounded-full px-4 py-2 line-clamp-2">{title}</p>}
      <button className="btn bg-white !text-brand-deep text-base px-8 py-3.5 mt-2 shadow-xl hover:!bg-white" onClick={onClose}><Check className="w-5 h-5" /> Ho capito</button>
    </div>
  )
}
