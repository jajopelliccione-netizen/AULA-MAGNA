import { Lock, Play } from 'lucide-react'
import { BRAND } from '../lib/brand'
import { Logo } from './Logo'

/** Schermata iniziale di /schermo e /gobbo: il clic sblocca l'audio del browser e attiva lo schermo intero. */
export function ScreenStart({ label, hint, lim, onLim, onStart }: { label: string; hint: string; lim: boolean; onLim: (on: boolean) => void; onStart: () => void }) {
  return (
    <div className="h-full bg-stage flex flex-col items-center justify-center">
      <button
        onClick={() => {
          onStart()
          document.documentElement.requestFullscreen?.().catch(() => {})
        }}
        className="group card flex flex-col items-center gap-[3.5vh] px-[7vw] py-[7vh] transition hover:scale-[1.02]"
      >
        <Logo size={Math.round(window.innerHeight * 0.2)} />
        <div className="text-center">
          <div className="display grad-text text-[6.5vw]">{BRAND.title}</div>
          <div className="eyebrow text-[1.9vw] mt-[1.2vh]">{BRAND.school} · {BRAND.city}</div>
        </div>
        <div className="eyebrow text-[1.5vw] text-white/60">{label}</div>
        <span className="btn btn-primary text-[2.1vw] px-[3vw] py-[1.6vh] rounded-full">
          <Play className="w-[2.2vw] h-[2.2vw]" fill="currentColor" /> Clicca per avviare
        </span>
        <span className="text-[1.15vw] text-muted">{hint}</span>
      </button>
      <label className="mt-[3vh] flex items-center gap-[1vw] text-[1.4vw] text-muted cursor-pointer select-none card px-[1.6vw] py-[1.2vh]">
        <input type="checkbox" className="w-[1.6vw] h-[1.6vw] accent-[#2f93f0]" checked={lim} onChange={(e) => onLim(e.target.checked)} />
        <Lock className="w-[1.6vw] h-[1.6vw] text-ice" />
        <span><b className="text-white">Modalità LIM</b>: blocca l'uscita dal tutto schermo (si sblocca solo con la password admin)</span>
      </label>
    </div>
  )
}
