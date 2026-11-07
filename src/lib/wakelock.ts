import { useEffect } from 'react'

interface Sentinel {
  released: boolean
  release: () => Promise<void>
}

/**
 * Tiene acceso lo schermo del telefono mentre si gioca / si aspetta il proprio turno.
 * Un telefono che va in stand-by smette di ricevere gli aggiornamenti in tempo reale
 * e il «Tocca a te» arriva in ritardo.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock
    if (!enabled || !wl) return
    let lock: Sentinel | null = null
    let stopped = false
    const acquire = async () => {
      try {
        const l = await wl.request('screen')
        if (stopped) l.release().catch(() => {})
        else lock = l
      } catch {
        /* non concesso (es. batteria scarica): pazienza */
      }
    }
    acquire()
    const vis = () => {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) acquire()
    }
    document.addEventListener('visibilitychange', vis)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', vis)
      lock?.release().catch(() => {})
    }
  }, [enabled])
}
