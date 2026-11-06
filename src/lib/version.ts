import { useEffect, useState } from 'react'

declare const __BUILD_ID__: string
export const BUILD_ID: string = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'

/**
 * Controlla ogni minuto (e quando la pagina torna in primo piano) se è uscita una nuova versione del sito.
 * Serve a non lasciare admin, schermi e telefoni aperti con codice vecchio dopo un aggiornamento.
 */
export function useOutdated(intervalMs = 60_000): boolean {
  const [outdated, setOutdated] = useState(false)
  useEffect(() => {
    if (BUILD_ID === 'dev') return
    let stop = false
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!r.ok) return
        const j = (await r.json()) as { id?: string }
        if (!stop && j.id && j.id !== BUILD_ID) setOutdated(true)
      } catch {
        /* rete assente: riproverà */
      }
    }
    check()
    const t = setInterval(check, intervalMs)
    const vis = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', vis)
    return () => {
      stop = true
      clearInterval(t)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [intervalMs])
  return outdated
}
