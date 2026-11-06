import { BrandTitle } from './Logo'

export function SetupMissing() {
  return (
    <div className="min-h-full bg-stage p-6 flex flex-col gap-4 items-start">
      <BrandTitle />
      <h1 className="text-2xl font-black">Configurazione mancante ⚙️</h1>
      <p className="text-white/80 max-w-xl">
        Mancano le variabili d'ambiente di Firebase. Copia <code className="text-ice">.env.example</code> in <code className="text-ice">.env</code>,
        compila i valori e riavvia. Su Cloudflare Pages vanno inserite in <em>Settings → Variables and Secrets</em> (vedi README).
      </p>
    </div>
  )
}
