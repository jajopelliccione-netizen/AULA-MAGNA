import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore'

/** Converte i Timestamp di Firestore in millisecondi (ricorsivo solo al primo livello). */
export function normalize<T>(data: DocumentData): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && typeof (v as { toMillis?: unknown }).toMillis === 'function') {
      out[k] = (v as { toMillis: () => number }).toMillis()
    } else {
      out[k] = v
    }
  }
  return out as T
}

export function snapData<T>(s: DocumentSnapshot | QueryDocumentSnapshot): T | undefined {
  const d = s.data({ serverTimestamps: 'estimate' })
  return d ? normalize<T>(d) : undefined
}

export function nicknameKey(nick: string): string {
  return nick
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 32)
}

export function decodeEntities(s: string): string {
  const t = document.createElement('textarea')
  t.innerHTML = s
  return t.value
}

export function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many
}

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
