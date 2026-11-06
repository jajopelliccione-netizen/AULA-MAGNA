export type Mode = 'lobby' | 'karaoke' | 'impostor' | 'pause'
export type PlayerStatus = 'idle' | 'playing' | 'paused' | 'between'

export interface NowPlaying {
  queueId: string
  videoId: string
  title: string
  nickname: string
  uid: string
  bookedAt: number
  startedAt: number
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
}

export interface QueueItem {
  id: string
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

export type GameStatus = 'lobby' | 'playing' | 'voting' | 'reveal'

export interface Game {
  status: GameStatus
  category: string
  categoryId: string
  word: string | null
  impostorUids: string[]
  impostorNames: string[]
  endsAt: number | null
  round: number
  discussionSec: number
}

export const DEFAULT_GAME: Game = {
  status: 'lobby',
  category: '',
  categoryId: '',
  word: null,
  impostorUids: [],
  impostorNames: [],
  endsAt: null,
  round: 0,
  discussionSec: 180,
}

export interface PlayerDoc {
  id: string
  nickname: string
  vote: string | null
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
