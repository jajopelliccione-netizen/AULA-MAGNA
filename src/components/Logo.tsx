import { BRAND } from '../lib/brand'

export function Logo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return <img src={BRAND.logo} alt={`Logo ${BRAND.school}`} width={size} height={size} className={className} style={{ width: size, height: size }} />
}

/** Intestazione di marca: logo + "Occupazione 2026 · Galileo Galilei" */
export function BrandTitle({ size = 44, big = false }: { size?: number; big?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} />
      <div className="leading-tight">
        <div className={`font-black tracking-wide text-neon-pink text-glow-pink ${big ? 'text-5xl' : 'text-base'}`}>{BRAND.title}</div>
        <div className={`font-semibold text-neon-cyan ${big ? 'text-3xl' : 'text-xs'}`}>
          {BRAND.school} · {BRAND.city}
        </div>
      </div>
    </div>
  )
}
