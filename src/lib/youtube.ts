import { decodeEntities } from './util'
import type { Kind } from './types'

export interface YtResult {
  videoId: string
  title: string
  channel: string
  thumbnail: string
}

const KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined
export const youtubeConfigured = Boolean(KEY)

const TTL = 24 * 3600 * 1000
export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`

function readCache(q: string): YtResult[] | null {
  try {
    const raw = localStorage.getItem('aula.yt2.' + q)
    if (!raw) return null
    const { t, r } = JSON.parse(raw) as { t: number; r: YtResult[] }
    return Date.now() - t < TTL ? r : null
  } catch {
    return null
  }
}

function writeCache(q: string, r: YtResult[]) {
  try {
    localStorage.setItem('aula.yt2.' + q, JSON.stringify({ t: Date.now(), r }))
  } catch {
    /* quota piena: ignora */
  }
}

export class YtError extends Error {}

// Un video è accettato solo se titolo o canale dichiarano che è una base karaoke / strumentale.
const KARAOKE_RE = /karaok|strumental|instrumental|base\s+musical|sing[\s-]?along|con\s+testo\s+e\s+base|backing\s+track/i
// ...e scartato se è chiaramente un altro tipo di video (a meno che non dica anche karaoke nel titolo)
const NOT_KARAOKE_RE = /\b(official\s+(music\s+)?video|videoclip|video\s+ufficiale|live\s+at|reaction|tutorial|lezione)\b/i

export function isKaraoke(title: string, channel: string): boolean {
  const t = decodeEntities(title)
  const c = decodeEntities(channel)
  if (/karaok/i.test(t)) return true
  if (NOT_KARAOKE_RE.test(t)) return false
  return KARAOKE_RE.test(t) || /karaok/i.test(c)
}

/**
 * Cerca su YouTube (con cache locale di 24h per risparmiare quota).
 *  - karaoke: aggiunge "karaoke" alla query e tiene solo le basi karaoke
 *  - music: cerca musica normale (categoria Musica), senza filtri karaoke
 */
export async function searchSongs(input: string, kind: Kind): Promise<YtResult[]> {
  if (!KEY) throw new YtError('Ricerca non configurata (manca la chiave YouTube)')
  const text = input.trim().replace(/\s+/g, ' ')
  const query = kind === 'karaoke' && !/karaoke/i.test(text) ? `${text} karaoke` : text
  const ck = `${kind}:${query.toLowerCase()}`
  const cached = readCache(ck)
  if (cached) return cached

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    safeSearch: 'moderate',
    maxResults: kind === 'karaoke' ? '25' : '12',
    ...(kind === 'music' ? { videoCategoryId: '10' } : {}),
    regionCode: 'IT',
    relevanceLanguage: 'it',
    fields: 'items(id/videoId,snippet(title,channelTitle))',
    q: query,
    key: KEY,
  })
  let res: Response
  try {
    res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  } catch {
    throw new YtError('Niente connessione, riprova tra poco')
  }
  if (!res.ok) {
    let reason = ''
    try {
      const j = (await res.json()) as { error?: { errors?: { reason?: string }[]; message?: string } }
      reason = j.error?.errors?.[0]?.reason ?? ''
      console.error('[youtube]', res.status, j.error?.message)
    } catch {
      /* ignora */
    }
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded')
      throw new YtError('Ricerca non disponibile: limite giornaliero raggiunto. Chiedi all\'admin di aggiungere la canzone.')
    if (res.status === 403 || res.status === 400)
      throw new YtError(`Ricerca non configurata correttamente (${reason || res.status}). Avvisa l'admin.`)
    throw new YtError('Errore nella ricerca, riprova')
  }
  const json = (await res.json()) as { items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[] }
  const out: YtResult[] = (json.items ?? [])
    .filter((i) => i.id?.videoId)
    .filter((i) => kind === 'music' || isKaraoke(i.snippet.title, i.snippet.channelTitle))
    .map((i) => ({
      videoId: i.id.videoId,
      title: decodeEntities(i.snippet.title),
      channel: decodeEntities(i.snippet.channelTitle),
      thumbnail: thumbUrl(i.id.videoId),
    }))
  writeCache(ck, out)
  return out
}

/** Estrae l'ID video da un link YouTube o da un ID nudo. */
export function parseVideoId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  try {
    const u = new URL(s)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1, 12) || null
    const v = u.searchParams.get('v')
    if (v && /^[\w-]{11}$/.test(v)) return v
    const m = u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

/** Recupera il titolo di un video (1 unità di quota). */
export async function fetchVideoTitle(videoId: string): Promise<string | null> {
  if (!KEY) return null
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&fields=items(snippet/title)&key=${KEY}`)
    if (!r.ok) return null
    const j = (await r.json()) as { items?: { snippet: { title: string } }[] }
    const t = j.items?.[0]?.snippet.title
    return t ? decodeEntities(t) : null
  } catch {
    return null
  }
}
