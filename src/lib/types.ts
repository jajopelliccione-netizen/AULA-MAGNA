export type Mode = 'lobby' | 'karaoke' | 'music' | 'impostor' | 'pause'
/** Le due code di canzoni: karaoke (basi con testo) e musica libera. */
export type Kind = 'karaoke' | 'music'
export type RequestStatus = 'pending' | 'approved' | 'rejected'
/**
 * idle = niente in coda · waiting = prossima canzone pronta, aspetta che l'admin prema Avvia
 * between = conto alla rovescia prima dell'avvio automatico · playing / paused = brano in corso
 */
export type PlayerStatus = 'idle' | 'waiting' | 'between' | 'playing' | 'paused'
/** auto = dopo il primo avvio le canzoni partono da sole · manual = ogni canzone parte solo quando l'admin preme Avvia */
export type Playback = 'auto' | 'manual'

export interface NowPlaying {
  kind?: Kind
  queueId: string
  videoId: string
  title: string
  nickname: string
  uid: string
  bookedAt: number
  startedAt: number
}

/** Posizione del video pubblicata dallo schermo (master) per tenere il gobbo allineato. */
export interface SyncInfo {
  queueId: string
  /** istante (ms, ora del server) in cui il video era a 0:00: posizione = (ora - base) / 1000 */
  base: number
  paused: boolean
  /** posizione in secondi quando in pausa */
  pos: number
}

/** Impostazioni "Nuova partita" condivise fra tutti i pannelli admin. */
export interface ImpostorConfig {
  categoryId: string
  impostors: number
  readingSec: number
}

/** Ultima azione fatta da un admin: serve a mostrare agli altri "chi ha fatto cosa". */
export interface LastAction {
  by: string
  text: string
  at: number
}

export interface AppState {
  mode: Mode
  message: string
  nowPlaying: NowPlaying | null
  playerStatus: PlayerStatus
  bookingsOpen: boolean
  volume: number
  betweenEndsAt: number | null
  skipNonce: number
  /** incrementato dall'admin per far ricominciare da capo la canzone in corso */
  restartNonce: number
  gobboAudio: boolean
  playback: Playback
  /** true = appena entrati in karaoke/musica: niente parte finché l'admin non avvia */
  hold: boolean
  sync: SyncInfo | null
  impostorConfig: ImpostorConfig
  lastAction: LastAction | null
}

export const DEFAULT_STATE: AppState = {
  mode: 'lobby',
  message: 'Torniamo subito!',
  nowPlaying: null,
  playerStatus: 'idle',
  bookingsOpen: true,
  volume: 80,
  betweenEndsAt: null,
  skipNonce: 0,
  restartNonce: 0,
  gobboAudio: false,
  playback: 'auto',
  hold: false,
  sync: null,
  impostorConfig: { categoryId: 'random', impostors: 1, readingSec: 8 },
  lastAction: null,
}

export interface QueueItem {
  id: string
  kind: Kind
  /** pending = in attesa di approvazione; solo gli approved sono in coda */
  status: RequestStatus
  videoId: string
  title: string
  thumbnail: string
  nickname: string
  nicknameKey: string
  uid: string
  createdAt: number
  order?: number
  /** chiave di ordinamento: order se presente, altrimenti createdAt */
  key: number
}

/** lobby → reading (parola sui telefoni) → turns (giri) → voting → reveal */
export type GameStatus = 'lobby' | 'reading' | 'turns' | 'voting' | 'reveal'

export interface Game {
  status: GameStatus
  category: string
  categoryId: string
  word: string | null
  impostorUids: string[]
  impostorNames: string[]
  /** numeri degli impostori (pubblici solo al "Rivela") */
  impostorNumbers: number[]
  /** fine del tempo di lettura della parola (ms, ora del server) */
  endsAt: number | null
  /** contatore delle partite (serve a ignorare i ruoli vecchi) */
  round: number
  readingSec: number
  /** numero del giro in corso (1, 2, 3…) */
  giro: number
  /** ordine in cui parlano i giocatori nel giro (numeri) */
  order: number[]
  /** posizione in `order` di chi sta parlando; = order.length a giro finito */
  turnIndex: number
}

export const DEFAULT_GAME: Game = {
  status: 'lobby',
  category: '',
  categoryId: '',
  word: null,
  impostorUids: [],
  impostorNames: [],
  impostorNumbers: [],
  endsAt: null,
  round: 0,
  readingSec: 8,
  giro: 0,
  order: [],
  turnIndex: 0,
}

export interface PlayerDoc {
  id: string
  nickname: string
  vote: string | null
  /** numero assegnato a inizio partita ("Giocatore N") */
  number: number | null
}

export interface RoleDoc {
  role: 'crew' | 'impostor'
  word: string | null
  category: string
  round: number
}

export interface PresenceDoc {
  id: string
  nickname: string
  nicknameKey: string
  lastSeen: number
}

export interface BannedDoc {
  id: string
  nickname: string
  uid?: string
  createdAt: number
}
