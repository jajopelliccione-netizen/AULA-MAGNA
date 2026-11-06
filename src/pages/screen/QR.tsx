import { QRCodeSVG } from 'qrcode.react'
import { publicUrl } from '../../lib/brand'

export const shortUrl = () => publicUrl().replace(/^https?:\/\//, '').replace(/\/$/, '')

/** Solo il QR: moduli blu notte su fondo bianco con zona di rispetto e logo al centro. */
export function QR({ size }: { size: number }) {
  return (
    <div className="rounded-[7%] bg-white shadow-[0_30px_80px_-30px_rgba(47,147,240,.9)]" style={{ width: size, height: size, padding: size * 0.05 }}>
      <QRCodeSVG
        value={publicUrl()}
        size={512}
        level="H"
        marginSize={0}
        bgColor="#ffffff"
        fgColor="#0b1230"
        style={{ width: '100%', height: '100%', display: 'block' }}
        imageSettings={{ src: '/logo.png', height: 96, width: 96, excavate: true }}
      />
    </div>
  )
}

/** QR in una scheda con didascalia e indirizzo, pronto da mostrare sul proiettore. */
export function QRCard({ size, title = 'Scansiona e partecipa', compact = false }: { size: number; title?: string; compact?: boolean }) {
  return (
    <div className="card flex flex-col items-center" style={{ padding: size * 0.07, gap: size * 0.05 }}>
      <QR size={size} />
      <div className="text-center leading-tight">
        <div className="display text-white" style={{ fontSize: size * (compact ? 0.11 : 0.12) }}>{title}</div>
        <div className="font-semibold text-ice" style={{ fontSize: size * 0.065, marginTop: size * 0.02 }}>{shortUrl()}</div>
      </div>
    </div>
  )
}
