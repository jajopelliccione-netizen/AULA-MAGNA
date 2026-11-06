import { createContext, useContext } from 'react'

/** Esegue un'azione e la annuncia agli altri pannelli admin ("Marco ha messo in pausa"). */
export type Act = (text: string, fn: () => unknown) => Promise<void>

export const ActCtx = createContext<Act>(async (_text, fn) => {
  await fn()
})
export const useAct = () => useContext(ActCtx)
