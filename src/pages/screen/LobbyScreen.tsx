import { Gamepad2, Mic, Music2, Smartphone } from 'lucide-react'
import { BRAND } from '../../lib/brand'
import { Logo } from '../../components/Logo'
import { QRCard } from './QR'

export function LobbyScreen({ online, onPick }: { online: number; onPick?: (mode: 'karaoke' | 'music' | 'impostor') => void }) {
  const qr = Math.round(Math.min(window.innerHeight * 0.52, window.innerWidth * 0.27))
  const c = !!onPick // con i comandi touch il contenuto è più compatto, per far stare i tasti grandi
  return (
    <div className="h-full w-full bg-stage flex items-center justify-between px-[6vw]">
      <div className={`flex flex-col ${c ? 'gap-[2.4vh]' : 'gap-[3.2vh]'} max-w-[52vw]`}>
        <Logo size={Math.round(window.innerHeight * (c ? 0.13 : 0.2))} className="anim-floaty" />
        <div>
          <div className="eyebrow text-[2.2vw]">Aula Magna</div>
          <h1 className={`display grad-text ${c ? 'text-[5.8vw]' : 'text-[10vw]'} mt-[1vh]`}>{BRAND.title}</h1>
          <div className={`display text-white ${c ? 'text-[2.6vw]' : 'text-[3.6vw]'} mt-[1.5vh]`}>{BRAND.school} <span className="text-brand">·</span> {BRAND.city}</div>
        </div>
        <div className="flex items-center gap-[1.4vw]">
          <div className="card flex items-center gap-[1.2vw] px-[1.8vw] py-[1.4vh]">
            <span className="dot-live" />
            <span className="display text-[4vw] tabular text-white">{online}</span>
            <span className="text-[1.6vw] font-semibold text-muted leading-tight">{online === 1 ? 'persona\ncollegata' : 'persone\ncollegate'}</span>
          </div>
          {!c && <div className="card flex items-center gap-[.8vw] px-[1.4vw] py-[1.4vh] text-[1.5vw] font-semibold"><Mic className="w-[1.8vw] h-[1.8vw] text-brand" /> Karaoke</div>}
          {!c && <div className="card flex items-center gap-[.8vw] px-[1.4vw] py-[1.4vh] text-[1.5vw] font-semibold"><Gamepad2 className="w-[1.8vw] h-[1.8vw] text-brand" /> L’impostore</div>}
        </div>

        {/* comandi touch: i ragazzi scelgono il gioco dallo schermo */}
        {onPick && (
          <div>
            <div className="eyebrow text-[1.6vw] mb-[1.2vh]">Tocca per giocare</div>
            <div className="grid grid-cols-3 gap-[1.2vw]">
              {([['karaoke', 'Karaoke', Mic], ['music', 'Musica', Music2], ['impostor', 'L’impostore', Gamepad2]] as const).map(([m, label, Icon]) => (
                <button key={m} onClick={() => onPick(m)} className="card flex flex-col items-center justify-center gap-[1vh] py-[2.8vh] ring-1 ring-brand/60 active:scale-95 transition hover:bg-white/10">
                  <Icon className="w-[3.6vw] h-[3.6vw] text-ice" />
                  <span className="display text-white text-[2.3vw]">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-[2vh]">
        <QRCard size={qr} title="Inquadra e partecipa" />
        <div className="flex items-center gap-[.7vw] text-[1.4vw] text-muted"><Smartphone className="w-[1.6vw] h-[1.6vw]" /> Apri la fotocamera del telefono</div>
      </div>
    </div>
  )
}

export function PauseScreen({ message }: { message: string }) {
  return (
    <div className="h-full w-full bg-stage flex flex-col items-center justify-center gap-[4vh] text-center px-[6vw]">
      <Logo size={Math.round(window.innerHeight * 0.18)} className="anim-floaty" />
      <div className="eyebrow text-[2vw]">In pausa</div>
      <h1 className="display grad-text text-[9vw] max-w-[85vw]">{message || 'Torniamo subito'}</h1>
      <p className="eyebrow text-[1.6vw] text-white/50">{BRAND.title} · {BRAND.school}</p>
    </div>
  )
}
