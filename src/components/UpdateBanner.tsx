import { RefreshCw } from 'lucide-react'

/** Avviso "nuova versione disponibile" con pulsante per ricaricare. */
export function UpdateBanner() {
  return (
    <div className="fixed bottom-24 md:bottom-4 left-1/2 w-[calc(100%-1.5rem)] sm:w-auto justify-between -translate-x-1/2 z-[60] flex items-center gap-3 rounded-2xl bg-brand-deep border border-white/25 px-4 py-3 shadow-2xl">
      <RefreshCw className="w-4 h-4" />
      <span className="text-sm font-semibold">È uscita una nuova versione</span>
      <button className="btn !bg-white !text-brand-deep !py-1.5 text-sm" onClick={() => window.location.reload()}>Aggiorna</button>
    </div>
  )
}

/**
 * Sugli schermi (proiettore, gobbo) la pagina NON si ricarica mai da sola: un ricaricamento fa uscire dal tutto schermo
 * e fa perdere l'audio sbloccato. Compare solo un piccolo tasto, da toccare quando si ha un momento.
 */
export function ScreenUpdateChip({ onReload }: { onReload: () => void }) {
  return (
    <button onClick={onReload} className="fixed bottom-[1.2vh] left-[1.2vw] z-[70] flex items-center gap-[.6vw] rounded-full bg-brand-deep/90 border border-white/25 px-[1.1vw] py-[.7vh] text-[1.1vw] font-semibold text-white shadow-xl">
      <RefreshCw className="w-[1.2vw] h-[1.2vw]" /> Nuova versione · tocca per aggiornare
    </button>
  )
}
