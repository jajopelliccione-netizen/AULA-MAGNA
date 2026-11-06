import { BRAND } from '../lib/brand'

export function Logo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return <img src={BRAND.logo} alt={`Logo ${BRAND.school}`} width={size} height={size} className={className} style={{ width: size, height: size }} />
}

/** Marchio: logo + "OCCUPAZIONE 2026 / Galileo Galilei · Roma" */
export function BrandTitle({ size = 44, big = false }: { size?: number; big?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} />
      <div className="leading-none">
        <div className={`display text-white ${big ? 'text-5xl' : 'text-[1.35rem]'}`}>{BRAND.title}</div>
        <div className={`eyebrow ${big ? 'text-2xl mt-2' : 'text-[.7rem] mt-1'}`}>
          {BRAND.school} · {BRAND.city}
        </div>
      </div>
    </div>
  )
}
