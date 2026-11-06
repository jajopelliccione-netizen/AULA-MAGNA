import { useEffect, useRef, useState, type FormEvent } from 'react'
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
      if (r.length === 0) setErr('Nessun risultato, prova con un altro titolo')
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
  const position =
    myIndex === 0 ? 'Sei il prossimo! 🔥' : `Tocca a te tra ${songsAhead} ${plural(songsAhead, 'canzone', 'canzoni')}`

  return (
    <div className="p-4 flex flex-col gap-4">
      {showCall && (
        <div className="fixed inset-0 z-50 anim-flash flex flex-col items-center justify-center text-center p-6 gap-6 text-ink">
          <div className="text-8xl anim-shake">🎤</div>
          <h1 className="text-6xl font-black leading-none">TOCCA A TE!</h1>
          <p className="text-3xl font-extrabold">Vai sul palco</p>
          <p className="text-lg font-bold opacity-80 max-w-xs">{mine?.title ?? np?.title}</p>
          <button className="btn bg-ink text-white text-lg px-8 py-3 mt-4" onClick={() => setDismissed(callKey)}>Ho capito!</button>
        </div>
      )}

      {!state.bookingsOpen && (
        <div className="rounded-xl bg-red-500/20 border border-red-400/50 p-3 text-center font-bold">🔒 Prenotazioni chiuse al momento</div>
      )}

      {mine ? (
        <div className="card p-4 flex flex-col gap-3 box-glow-pink">
          <div className="text-xs uppercase tracking-widest text-neon-pink font-bold">La tua prenotazione</div>
          <div className="flex gap-3 items-center">
            <img src={mine.thumbnail} alt="" width={96} height={54} className="rounded-lg w-24 h-[54px] object-cover" />
            <div className="min-w-0 font-semibold leading-snug line-clamp-3">{mine.title}</div>
          </div>
          <div className="text-xl font-black text-neon-lime text-glow-lime">{position}</div>
          <button className="btn btn-red" onClick={() => cancelBooking(uid)}>Annulla prenotazione</button>
        </div>
      ) : (
        <>
          <form onSubmit={search} className="flex gap-2">
            <input
              className="input flex-1"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder="Cerca una canzone o un artista…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={!state.bookingsOpen}
            />
            <button className="btn btn-cyan" disabled={searching || !state.bookingsOpen}>{searching ? '…' : 'Cerca'}</button>
          </form>
          {!youtubeConfigured && <p className="text-neon-yellow text-sm">Ricerca non attiva: chiedi all'admin di aggiungere la tua canzone.</p>}
          {err && <p className="text-red-300 text-sm">{err}</p>}
          <ul className="flex flex-col gap-2">
            {results.map((r) => (
              <li key={r.videoId} className="card p-2 flex gap-3 items-center">
                <img src={r.thumbnail} alt="" loading="lazy" width={112} height={63} className="rounded-lg w-28 h-[63px] object-cover bg-panel2 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold leading-snug line-clamp-2">{r.title}</div>
                  <div className="text-xs text-white/50 truncate">{r.channel}</div>
                </div>
                <button className="btn btn-pink text-sm px-3 py-2" disabled={booking !== null || !state.bookingsOpen} onClick={() => book(r)}>
                  {booking === r.videoId ? '…' : 'Prenota'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <section>
        <h2 className="text-sm uppercase tracking-widest text-white/50 font-bold mb-2">Sul palco e in coda</h2>
        {np && (
          <div className="card p-3 mb-2 border-neon-lime/60 flex gap-3 items-center">
            <span className="text-2xl">🎤</span>
            <div className="min-w-0">
              <div className="font-bold text-neon-lime truncate">{np.nickname}</div>
              <div className="text-xs text-white/70 line-clamp-1">{np.title}</div>
            </div>
          </div>
        )}
        {queue.length === 0 && !np && <p className="text-white/50 text-sm">Nessuno in coda: sii il primo! 🎶</p>}
        <ol className="flex flex-col gap-1.5">
          {queue.slice(0, 12).map((it, i) => (
            <li key={it.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${it.uid === uid ? 'bg-neon-pink/20 border border-neon-pink/60' : 'bg-white/5'}`}>
              <span className="w-6 text-center font-black text-neon-cyan">{i + 1}</span>
              <span className="font-bold truncate max-w-[35%]">{it.nickname}</span>
              <span className="text-white/60 truncate">{it.title}</span>
            </li>
          ))}
        </ol>
        {queue.length > 12 && <p className="text-xs text-white/40 mt-2">…e altre {queue.length - 12} canzoni</p>}
      </section>
    </div>
  )
}
