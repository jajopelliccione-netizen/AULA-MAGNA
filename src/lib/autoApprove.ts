import { useEffect, useRef } from 'react'
import { approveByRequestTime } from './actions'
import type { AppState, QueueItem } from './types'

/**
 * Se l'approvazione automatica è accesa per un tipo (karaoke/musica), le richieste in attesa
 * di quel tipo entrano in coda da sole. Gira sugli schermi dello staff (admin e proiettore):
 * le richieste restano modificabili, l'admin può sempre toglierle dalla coda.
 */
export function useAutoApprove(state: AppState, all: QueueItem[], enabled = true) {
  const sent = useRef(new Map<string, number>())
  useEffect(() => {
    if (!enabled) return
    const now = Date.now()
    const todo = all.filter((i) => i.status === 'pending' && state.autoApprove?.[i.kind] && now - (sent.current.get(i.id) ?? 0) > 6000)
    if (todo.length === 0) return
    todo.forEach((i) => sent.current.set(i.id, now))
    approveByRequestTime(todo).catch((e) => {
      console.error('[autoApprove]', e)
      todo.forEach((i) => sent.current.delete(i.id))
    })
  }, [all, state.autoApprove, enabled])
}
