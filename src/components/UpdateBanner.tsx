import { RefreshCw } from 'lucide-react'

/** Avviso "nuova versione disponibile" con pulsante per ricaricare. */
export function UpdateBanner() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-2xl bg-brand-deep border border-white/25 px-4 py-3 shadow-2xl">
      <RefreshCw className="w-4 h-4" />
      <span className="text-sm font-semibold">È uscita una nuova versione</span>
      <button className="btn !bg-white !text-brand-deep !py-1.5 text-sm" onClick={() => window.location.reload()}>Aggiorna</button>
    </div>
  )
}
