import { useCallback, useEffect, useRef, useState } from 'react'

/* ----------------------------------------------------------------------------------------------
 * Modalità LIM / chiosco: lo schermo (proiettore o gobbo) resta a tutto schermo e non si può uscire
 * toccandolo. Solo l'admin può sbloccare: con la sua password (premendo a lungo l'angolo in alto a sinistra)
 * oppure con il pulsante «Sblocca schermo LIM» del pannello admin.
 *
 * Una pagina web non può bloccare il sistema operativo (chiudere il browser dalla barra della LIM, ecc.):
 * per un blocco totale si usa anche la modalità chiosco del browser (vedi README).
 * -------------------------------------------------------------------------------------------- */

const KEY = 'aula.lim'

export function limRequested(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('lim') === '1') return true
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
export function saveLim(on: boolean) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ok */ }
}

let reloadAllowed = false
/** Da chiamare prima di un ricaricamento voluto (es. nuova versione del sito), altrimenti il blocco lo segnala. */
export function allowReload() {
  reloadAllowed = true
}

const fsSupported = () => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

export interface Kiosk {
  /** il blocco è attivo (richiesto e non sbloccato) */
  locked: boolean
  /** il tutto schermo è stato perso: serve un tocco per tornare */
  fsLost: boolean
  /** blocco richiesto ma sbloccato dall'admin */
  unlocked: boolean
  reenter: () => void
  unlock: () => void
  relock: () => void
}

/**
 * @param requested modalità LIM scelta all'avvio della pagina
 * @param started  la pagina è stata avviata (clic su «Clicca per avviare»)
 * @param remoteNonce contatore del pannello admin: ogni incremento sblocca lo schermo
 */
export function useKioskLock(requested: boolean, started: boolean, remoteNonce: number | undefined): Kiosk {
  const [unlocked, setUnlocked] = useState(false)
  const [fsLost, setFsLost] = useState(false)
  const [armed, setArmed] = useState(false)
  const locked = requested && started && !unlocked

  const reenter = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    try { (navigator as unknown as { keyboard?: { lock?: (k: string[]) => Promise<void> } }).keyboard?.lock?.(['Escape'])?.catch(() => {}) } catch { /* ok */ }
  }, [])

  const unlock = useCallback(() => {
    setUnlocked(true)
    setFsLost(false)
    try { (navigator as unknown as { keyboard?: { unlock?: () => void } }).keyboard?.unlock?.() } catch { /* ok */ }
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  }, [])

  const relock = useCallback(() => {
    setUnlocked(false)
    reenter()
  }, [reenter])

  // sblocco da remoto (pannello admin)
  const nonceRef = useRef(remoteNonce)
  useEffect(() => {
    if (remoteNonce === nonceRef.current) return
    nonceRef.current = remoteNonce
    if (locked) unlock()
  }, [remoteNonce, locked, unlock])

  // piccolo margine all'avvio: il tutto schermo impiega un attimo ad attivarsi
  useEffect(() => {
    if (!locked) { setArmed(false); return }
    const t = setTimeout(() => setArmed(true), 1800)
    return () => clearTimeout(t)
  }, [locked])

  useEffect(() => {
    if (!locked) {
      document.body.classList.remove('kiosk-lock')
      return
    }
    document.body.classList.add('kiosk-lock')
    reenter()

    const stop = (e: Event) => e.preventDefault()
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const combo = (e.ctrlKey || e.metaKey) && ['r', 'w', 't', 'n', 'l', 'p', 's', 'u', 'f', '+', '-', '=', '0'].includes(k)
      if (e.key === 'F5' || e.key === 'F11' || e.key === 'F12' || e.key === 'Escape' || combo || (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) e.preventDefault()
    }
    const multi = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault() }
    const move = (e: TouchEvent) => { if (!(e.target as HTMLElement | null)?.closest?.('[data-kiosk-scroll]')) e.preventDefault() }
    const wheel = (e: WheelEvent) => { if (e.ctrlKey) e.preventDefault() }
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (reloadAllowed) return
      e.preventDefault()
      e.returnValue = ''
    }
    // il tasto «indietro» non porta fuori dalla pagina
    history.pushState({ kiosk: 1 }, '', window.location.href)
    const pop = () => history.pushState({ kiosk: 1 }, '', window.location.href)

    document.addEventListener('contextmenu', stop)
    document.addEventListener('keydown', keys, true)
    document.addEventListener('touchstart', multi, { passive: false })
    document.addEventListener('touchmove', move, { passive: false })
    document.addEventListener('gesturestart', stop as EventListener)
    document.addEventListener('gesturechange', stop as EventListener)
    window.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('popstate', pop)
    window.addEventListener('beforeunload', beforeUnload)

    const checkFs = () => setFsLost(fsSupported() && !document.fullscreenElement)
    document.addEventListener('fullscreenchange', checkFs)
    const poll = setInterval(checkFs, 1000)

    return () => {
      document.body.classList.remove('kiosk-lock')
      document.removeEventListener('contextmenu', stop)
      document.removeEventListener('keydown', keys, true)
      document.removeEventListener('touchstart', multi)
      document.removeEventListener('touchmove', move)
      document.removeEventListener('gesturestart', stop as EventListener)
      document.removeEventListener('gesturechange', stop as EventListener)
      window.removeEventListener('wheel', wheel)
      window.removeEventListener('popstate', pop)
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('fullscreenchange', checkFs)
      clearInterval(poll)
    }
  }, [locked, reenter])

  return { locked, fsLost: locked && armed && fsLost, unlocked: requested && started && unlocked, reenter, unlock, relock }
}

/** Questo dispositivo è un «secondo schermo»: mostra lo stesso video del principale senza comandare la coda. */
export function secondRequested(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('secondo')) return true
    return localStorage.getItem('aula.secondScreen') === '1'
  } catch {
    return false
  }
}

export function saveSecond(on: boolean) {
  try {
    localStorage.setItem('aula.secondScreen', on ? '1' : '0')
  } catch { /* ok */ }
}
