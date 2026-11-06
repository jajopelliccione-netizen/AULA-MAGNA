import { BRAND } from '../../lib/brand'
import { Logo } from '../../components/Logo'
import { QR, shortUrl } from './QR'

export function LobbyScreen({ online }: { online: number }) {
  return (
    <div className="h-full w-full bg-aurora flex items-center justify-center gap-[5vw] px-[5vw]">
      <div className="flex-1 flex flex-col items-start gap-[2vh]">
        <Logo size={Math.round(window.innerHeight * 0.22)} className="anim-floaty" />
        <h1 className="text-[7.5vw] leading-none font-black text-neon-pink text-glow-pink">{BRAND.title}</h1>
        <h2 className="text-[4.2vw] leading-tight font-extrabold text-neon-cyan text-glow-cyan">{BRAND.school} · {BRAND.city}</h2>
        <p className="text-[2.4vw] text-white/80 font-semibold">Aula magna · Karaoke e gioco dell'impostore</p>
        <div className="mt-[2vh] rounded-3xl bg-panel/90 border border-neon-lime/50 px-[2.5vw] py-[1.5vh]">
          <span className="text-[4.5vw] font-black text-neon-lime text-glow-lime tabular-nums">{online}</span>
          <span className="text-[2.4vw] font-bold ml-[1vw]">{online === 1 ? 'persona collegata' : 'persone collegate'}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-[2vh]">
        <QR size={Math.round(Math.min(window.innerHeight * 0.62, window.innerWidth * 0.36))} />
        <p className="text-[2.4vw] font-extrabold text-center">Inquadra e collegati!</p>
        <p className="text-[1.7vw] text-neon-cyan font-bold">{shortUrl()}</p>
      </div>
    </div>
  )
}

export function PauseScreen({ message }: { message: string }) {
  return (
    <div className="h-full w-full bg-aurora flex flex-col items-center justify-center gap-[4vh] text-center px-[6vw]">
      <Logo size={Math.round(window.innerHeight * 0.2)} className="anim-floaty" />
      <div className="text-[8vw] leading-none">⏸️</div>
      <h1 className="text-[7vw] leading-tight font-black text-neon-yellow">{message || 'Pausa'}</h1>
      <p className="text-[2.5vw] text-neon-cyan font-bold">{BRAND.title} · {BRAND.school}</p>
    </div>
  )
}
