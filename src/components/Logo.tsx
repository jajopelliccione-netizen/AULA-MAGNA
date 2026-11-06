import { BRAND } from '../lib/brand'

export function Logo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return <img src={BRAND.logo} alt={`Logo ${BRAND.school}`} width={size} height={size} className={className} style={{ width: size, height: size }} />
}

/** Marchio: logo + "OCCUPAZIONE 2026 / Galileo Galilei · Roma" */
export function BrandTitle({ size = 44, big = false, compact = false }: { size?: number; big?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} />
      <div className="leading-none min-w-0">
        <div className={`display text-white truncate ${big ? 'text-5xl' : 'text-[1.2rem] sm:text-[1.35rem]'}`}>{BRAND.title}</div>
        <div className={`eyebrow truncate ${compact ? 'hidden sm:block' : ''} ${big ? 'text-2xl mt-2' : 'text-[.7rem] mt-1'}`}>
          {BRAND.school} · {BRAND.city}
        </div>
      </div>
    </div>
  )
}
