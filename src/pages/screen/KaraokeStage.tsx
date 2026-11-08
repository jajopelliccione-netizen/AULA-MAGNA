import { useState } from 'react'
import { Mic, Pause, Music2, Users } from 'lucide-react'
import type { AppState, Kind, QueueItem } from '../../lib/types'
import { BETWEEN_BY_KIND, BETWEEN_MS } from '../../lib/actions'
import { useNow } from '../../lib/hooks'
import KaraokePlayer from '../../components/KaraokePlayer'
import { Logo } from '../../components/Logo'
import { BRAND } from '../../lib/brand'
import { QR, QRCard, shortUrl } from './QR'
import { useKaraokeController } from './useKaraokeController'

/** Schermo del proiettore in modalità karaoke o musica: video + coda + QR. Qui gira anche il controller della coda. */
export default function KaraokeStage({ state, queue, active, serverNow, kind, follower = false, venue = '', offsetMs = 0 }: { offsetMs?: number; venue?: string; follower?: boolean; state: AppState; queue: QueueItem[]; active: boolean; serverNow: () => number; kind: Kind }) {
  const { finish, toast } = useKaraokeController(state, queue, active && !follower, kind)
  const music = kind === 'music'
  useNow(100)
  const [qrSize] = useState(() => Math.round(Math.min(window.innerWidth * 0.115, window.innerHeight * 0.22)))
  const np = state.nowPlaying
  const head = queue[0]
  const next5 = queue.slice(0, 5)
  const left = state.betweenEndsAt ? Math.max(0, state.betweenEndsAt - serverNow()) : 0

  return (
    <div className={`${active ? '' : 'hidden'} h-full w-full bg-stage flex gap-[1.5vw] p-[1.5vw]`}>
      {/* ---------- video ---------- */}
      <section className="relative flex-1 min-w-0 rounded-[1.3vw] overflow-hidden bg-black ring-1 ring-white/15 shadow-[0_40px_120px_-40px_rgba(47,147,240,.7)]">
        <KaraokePlayer
          state={state}
          active={active}
          role={follower ? 'follower' : 'master'}
          offsetMs={offsetMs}
          nextVideoId={queue[0]?.videoId}
          serverNow={serverNow}
          onEnded={(id) => finish(id)}
          onError={(id) => finish(id, 'Video non riproducibile: passo al prossimo')}
        />

        {np && (
          <div className="absolute inset-x-0 bottom-0 pointer-events-none bg-gradient-to-t from-black/90 via-black/55 to-transparent px-[2vw] pt-[8vh] pb-[2.4vh]">
            <div className="flex items-center gap-[1.4vw]">
              <div className="grid place-items-center w-[4.6vw] h-[4.6vw] rounded-full bg-brand shadow-[0_0_40px_rgba(47,147,240,.7)]">
                {music ? <Music2 className="w-[2.3vw] h-[2.3vw] text-white" /> : <Mic className="w-[2.3vw] h-[2.3vw] text-white" />}
              </div>
              <div className="min-w-0">
                <div className="eyebrow text-[1.2vw]">{music ? 'Ora in onda' : 'Ora sul palco'}</div>
                {music ? (
                  <>
                    <div className="display text-white text-[3.2vw] truncate">{np.title}</div>
                    <div className="text-[1.45vw] font-medium text-white/80 truncate">Richiesta da <b className="text-white">{np.nickname}</b></div>
                  </>
                ) : (
                  <>
                    <div className="display text-white text-[4.4vw] truncate">{np.nickname}</div>
                    <div className="text-[1.45vw] font-medium text-white/80 truncate">{np.title}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {np && state.playerStatus === 'paused' && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-[2vh]">
              <Pause className="w-[8vw] h-[8vw] text-white" />
              <div className="display text-white text-[5vw]">In pausa</div>
            </div>
          </div>
        )}

        {/* ---------- prossimo: conto alla rovescia ---------- */}
        {!np && (state.playerStatus === 'between' || state.playerStatus === 'waiting') && head && (
          <div className="absolute inset-0 bg-stage flex flex-col items-center justify-center text-center gap-[2.4vh] px-[4vw]">
            <div className="eyebrow text-[1.8vw]">{music ? 'Prossima canzone' : 'Prossimo al microfono'}</div>
            {music ? (
              <>
                <div className="display grad-text text-[5.5vw] max-w-[62vw] line-clamp-2">{head.title}</div>
                <div className="text-[2.1vw] font-medium text-white/85">Richiesta da <b className="text-white">{head.nickname}</b></div>
              </>
            ) : (
              <>
                <div className="display grad-text text-[8.5vw] max-w-[60vw] truncate">{head.nickname}</div>
                <div className="text-[2.1vw] font-medium text-white/85 max-w-[52vw] line-clamp-2">{head.title}</div>
              </>
            )}
            {state.playerStatus === 'between' ? (
              <CountdownRing left={left} total={BETWEEN_BY_KIND[kind]} size={Math.round(window.innerHeight * 0.26)} />
            ) : (
              <div className="chip !px-[1.6vw] !py-[1vh] text-[1.7vw] border-brand/50 bg-brand/15 text-ice anim-pulse">In attesa dell’avvio</div>
            )}
            {!music && <div className="text-[1.5vw] text-muted">{head.nickname}, preparati e raggiungi il palco</div>}
          </div>
        )}

        {/* ---------- coda vuota ---------- */}
        {!np && state.playerStatus !== 'between' && state.playerStatus !== 'waiting' && (
          <div className="absolute inset-0 bg-stage flex items-center justify-center gap-[5vw] px-[4vw]">
            {head ? (
              <div className="display grad-text text-[6vw]">Si parte…</div>
            ) : (
              <>
                <div className="flex flex-col gap-[2.4vh] max-w-[30vw]">
                  <Logo size={Math.round(window.innerHeight * 0.13)} className="anim-floaty" />
                  <div className="eyebrow text-[1.6vw]">{music ? 'Musica' : 'Karaoke'}{venue ? ` · ${venue}` : ''}</div>
                  <div className="display grad-text text-[5.8vw]">{state.bookingsOpen ? (music ? 'Scegli la musica!' : 'Prenota la tua canzone!') : 'Richieste chiuse'}</div>
                  {state.bookingsOpen && (
                    <ol className="flex flex-col gap-[1.2vh] text-[1.5vw] font-medium text-white/85">
                      {(music ? ['Inquadra il QR con il telefono', 'Cerca la canzone che vuoi sentire', 'Un admin la approva e parte'] : ['Inquadra il QR con il telefono', 'Scegli la tua canzone karaoke', 'Un admin la approva, poi vai sul palco']).map((t, i) => (
                        <li key={t} className="flex items-center gap-[1vw]">
                          <span className="grid place-items-center w-[2.4vw] h-[2.4vw] rounded-full bg-brand/25 border border-brand/60 text-ice font-bold text-[1.2vw]">{i + 1}</span>
                          {t}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <QRCard size={Math.round(Math.min(window.innerHeight * 0.5, window.innerWidth * 0.26))} title={music ? 'Proponi qui' : 'Prenota qui'} />
              </>
            )}
          </div>
        )}

        {toast && <div className="absolute top-[2vw] left-1/2 -translate-x-1/2 rounded-2xl bg-bad px-[2vw] py-[1vw] text-[1.6vw] font-bold shadow-xl">{toast}</div>}
      </section>

      {/* ---------- colonna coda ---------- */}
      <aside className="w-[25vw] shrink-0 flex flex-col gap-[1.6vh] min-h-0">
        <div className="flex items-center gap-[.9vw]">
          <Logo size={Math.round(window.innerWidth * 0.035)} />
          <div className="leading-none">
            <div className="display text-white text-[1.7vw]">{BRAND.title}</div>
            <div className="eyebrow text-[.9vw] mt-[.3vw]">{BRAND.school} · {BRAND.city}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-[.6vh]">
          <div className="flex items-center gap-[.6vw] eyebrow text-[1.15vw]"><Music2 className="w-[1.3vw] h-[1.3vw]" /> In coda</div>
          <span className="chip text-[1vw]"><Users className="w-[1vw] h-[1vw]" /> {queue.length}</span>
        </div>

        <ol className="flex flex-col gap-[.8vh] flex-1 min-h-0">
          {next5.map((it, i) => (
            <li key={it.id} className={`card flex items-center gap-[.8vw] p-[.6vw] ${i === 0 ? 'ring-1 ring-brand/70' : ''}`}>
              <span className={`display text-[2.2vw] w-[2vw] shrink-0 text-center ${i === 0 ? 'text-brand' : 'text-white/45'}`}>{i + 1}</span>
              <img src={it.thumbnail} alt="" className="w-[6vw] shrink-0 aspect-video object-cover rounded-[.5vw] bg-surface-2" />
              <div className="min-w-0">
                <div className="text-[1.55vw] leading-tight font-bold truncate">{it.nickname}</div>
                <div className="text-[1vw] text-muted leading-tight line-clamp-2">{it.title}</div>
              </div>
            </li>
          ))}
          {next5.length === 0 && <li className="card p-[1.4vw] text-[1.3vw] text-muted">Nessuno in coda. Chiedila dal telefono!</li>}
          {queue.length > 5 && <li className="text-[1.1vw] text-muted font-semibold px-[.4vw]">{queue.length - 5 === 1 ? 'e un’altra canzone' : `e altre ${queue.length - 5} canzoni`}</li>}
        </ol>

        <div className="card flex items-center gap-[1vw] p-[.9vw]">
          <QR size={qrSize} />
          <div className="min-w-0">
            <div className="display text-white text-[1.9vw]">{state.bookingsOpen ? (music ? 'Proponi una canzone' : 'Prenota la tua canzone') : 'Richieste chiuse'}</div>
            <div className="text-[1vw] font-semibold text-ice mt-[.4vw] break-all">{shortUrl()}</div>
          </div>
        </div>
      </aside>
    </div>
  )
}

export function CountdownRing({ left, size, total = BETWEEN_MS }: { left: number; size: number; total?: number }) {
  const r = 46
  const c = 2 * Math.PI * r
  const frac = Math.min(1, left / total)
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#2f93f0" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <span className="display text-white tabular" style={{ fontSize: size * 0.5 }}>{Math.max(0, Math.ceil(left / 1000))}</span>
    </div>
  )
}
