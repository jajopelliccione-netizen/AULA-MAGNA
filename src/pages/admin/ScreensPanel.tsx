import { useEffect, useState } from 'react'
import { Lock, Minus, Monitor, Plus, Trash2 } from 'lucide-react'
import { forgetScreen, SCREEN_ONLINE_MS, setScreenName, setScreenOffset, useScreens, type ScreenDoc } from '../../lib/screens'
import type { Act } from './act'

const ROLE: Record<ScreenDoc['role'], string> = { principale: 'Proiettore principale', secondo: 'Secondo schermo', gobbo: 'Gobbo' }

/** Elenco degli schermi (LIM, proiettori, gobbo) collegati: ognuno si vede singolarmente e riceve il suo nome. */
export function ScreensPanel({ act, serverNow }: { act: Act; serverNow: () => number }) {
  const screens = useScreens()
  const [now, setNow] = useState(() => serverNow())
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 5000)
    return () => clearInterval(t)
  }, [serverNow])
  const online = screens.filter((s) => now - s.lastSeen < SCREEN_ONLINE_MS).length
  return (
    <div className="mt-3 sm:mt-4 flex flex-col gap-2" data-testid="screens-panel">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-muted flex items-center gap-1.5"><Monitor className="w-4 h-4" /> Schermi collegati</h3>
        <span className="chip !py-0.5 !text-[.7rem]">{online} accesi</span>
      </div>
      {screens.length === 0 ? (
        <p className="text-xs text-muted">Nessuno schermo si è ancora collegato. Apri /schermo o /gobbo su una LIM: comparirà qui e potrai dargli un nome.</p>
      ) : (
        screens.map((s) => <ScreenRow key={s.id} s={s} on={now - s.lastSeen < SCREEN_ONLINE_MS} act={act} />)
      )}
    </div>
  )
}

function ScreenRow({ s, on, act }: { s: ScreenDoc; on: boolean; act: Act }) {
  const [v, setV] = useState(s.name)
  const [dirty, setDirty] = useState(false)
  useEffect(() => { if (!dirty) setV(s.name) }, [s.name, dirty])
  const save = () => act(v.trim() ? `ha chiamato «${v.trim()}» uno schermo (${ROLE[s.role]})` : `ha tolto il nome a uno schermo (${ROLE[s.role]})`, () => setScreenName(s.id, v)).then(() => setDirty(false))
  return (
    <div className={`rounded-xl border border-line bg-white/[.03] p-2.5 flex flex-col gap-2 ${on ? '' : 'opacity-60'}`} data-testid="screen-row">
      <div className="flex items-center gap-2 text-xs">
        <span className={on ? 'dot-live' : 'inline-block w-2 h-2 rounded-full bg-muted/50'} />
        <span className="font-semibold text-white">{on ? 'Acceso' : 'Spento'}</span>
        <span className="text-muted">· {ROLE[s.role]}</span>
        {s.lim && <span className="chip !py-0 !text-[.65rem]"><Lock className="w-3 h-3" /> LIM</span>}
        {!on && (
          <button className="ml-auto text-muted hover:text-bad" aria-label="Dimentica questo schermo" onClick={() => act('ha tolto uno schermo dall’elenco', () => forgetScreen(s.id))}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Dai un nome (es. LIM 1ª B, Palestra)"
          aria-label="Nome dello schermo"
          value={v}
          maxLength={40}
          onChange={(e) => { setV(e.target.value); setDirty(true) }}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <button className="btn btn-secondary shrink-0" onClick={save}>Salva</button>
      </div>
      {s.role !== 'principale' && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs" data-testid="screen-offset">
          <span className="text-muted mr-1" title="Se questo schermo suona in ritardo rispetto al principale, aumenta l’anticipo">Anticipo</span>
          {[-100, -25].map((d) => (
            <button key={d} className="btn btn-secondary !px-2 !py-1" aria-label={`Anticipo ${d} millisecondi`} onClick={() => act(`ha regolato l’anticipo di uno schermo a ${s.offsetMs + d} ms`, () => setScreenOffset(s.id, s.offsetMs + d))}><Minus className="w-3 h-3" />{-d}</button>
          ))}
          <span className="font-semibold text-white tabular min-w-[4.5rem] text-center" data-testid="offset-value">{s.offsetMs > 0 ? '+' : ''}{s.offsetMs} ms</span>
          {[25, 100].map((d) => (
            <button key={d} className="btn btn-secondary !px-2 !py-1" aria-label={`Anticipo +${d} millisecondi`} onClick={() => act(`ha regolato l’anticipo di uno schermo a ${s.offsetMs + d} ms`, () => setScreenOffset(s.id, s.offsetMs + d))}><Plus className="w-3 h-3" />{d}</button>
          ))}
          {s.offsetMs !== 0 && <button className="text-muted underline ml-1" onClick={() => act('ha azzerato l’anticipo di uno schermo', () => setScreenOffset(s.id, 0))}>Azzera</button>}
        </div>
      )}
    </div>
  )
}
