import { QRCodeSVG } from 'qrcode.react'
import { publicUrl } from '../../lib/brand'

export function QR({ size }: { size: number }) {
  return (
    <div className="rounded-3xl bg-white p-[3%] box-glow-pink inline-block" style={{ width: size, height: size }}>
      <QRCodeSVG value={publicUrl()} size={256} level="M" style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export const shortUrl = () => publicUrl().replace(/^https?:\/\//, '')
