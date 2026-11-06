import {
  collection, deleteDoc, doc, getDoc, getDocs, increment, serverTimestamp, setDoc, updateDoc, writeBatch,
  type WriteBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { nicknameKey, shuffle } from './util'
import { pickWord, recordWord, type WordHistory } from './words'
import type { Game, ImpostorConfig, Mode, NowPlaying, PresenceDoc, QueueItem, SyncInfo } from './types'

/* ------------------------------ ragazzi ------------------------------ */

export async function bookSong(uid: string, nickname: string, song: { videoId: string; title: string; thumbnail: string }) {
  await setDoc(doc(db, 'queue', uid), {
    videoId: song.videoId,
    title: song.title.slice(0, 150),
    thumbnail: song.thumbnail,
    nickname,
    nicknameKey: nicknameKey(nickname),
    uid,
    createdAt: serverTimestamp(),
  })
}

export const cancelBooking = (uid: string) => deleteDoc(doc(db, 'queue', uid))

export const heartbeat = (uid: string, nickname: string) =>
  setDoc(doc(db, 'presence', uid), { nickname, nicknameKey: nicknameKey(nickname), lastSeen: serverTimestamp() })

export const joinGame = (uid: string, nickname: string) => setDoc(doc(db, 'impostor/game/players', uid), { nickname, vote: null })
export const leaveGame = (uid: string) => deleteDoc(doc(db, 'impostor/game/players', uid))
export const castVote = (uid: string, target: string | null) => updateDoc(doc(db, 'impostor/game/players', uid), { vote: target })

/* ------------------------------- staff: stato ------------------------------- */

const stateRef = () => doc(db, 'state/current')
export const patchState = (patch: Record<string, unknown>) => setDoc(stateRef(), patch, { merge: true })

export const setMode = (mode: Mode) => patchState({ mode })
export const setPauseMessage = (message: string) => patchState({ message })
export const setVolume = (volume: number) => patchState({ volume })
export const setBookingsOpen = (bookingsOpen: boolean) => patchState({ bookingsOpen })
export const setPlayerStatus = (playerStatus: 'playing' | 'paused') => patchState({ playerStatus })
export const setImpostorConfig = (config: ImpostorConfig) => patchState({ impostorConfig: config })
export const logAction = (by: string, text: string, at: number) => patchState({ lastAction: { by, text, at } })
export const setGobboAudio = (gobboAudio: boolean) => patchState({ gobboAudio })
export const publishSync = (sync: SyncInfo | null) => patchState({ sync })
export const requestSkip = () => patchState({ skipNonce: increment(1) })

/* ------------------------------- staff: coda ------------------------------- */

export const removeFromQueue = (id: string) => deleteDoc(doc(db, 'queue', id))

export async function addManualSong(videoId: string, title: string, nickname: string) {
  await setDoc(doc(collection(db, 'queue')), {
    videoId,
    title: title.slice(0, 150),
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    nickname,
    nicknameKey: nicknameKey(nickname),
    uid: 'manual',
    createdAt: serverTimestamp(),
  })
}

/** Dopo un drag&drop riassegna le chiavi d'ordine esistenti (crescenti) alla nuova sequenza. */
export async function reorderQueue(before: QueueItem[], after: QueueItem[]) {
  const keys = before.map((q) => q.key)
  for (let i = 1; i < keys.length; i++) if (keys[i] <= keys[i - 1]) keys[i] = keys[i - 1] + 1
  const batch = writeBatch(db)
  let n = 0
  after.forEach((item, i) => {
    if (item.key !== keys[i] || item.order === undefined) {
      batch.update(doc(db, 'queue', item.id), { order: keys[i] })
      n++
    }
  })
  if (n) await batch.commit()
}

/** Avanza la coda: il primo brano diventa "nowPlaying" e viene tolto dalla coda. */
export async function startNextSong(head: QueueItem | undefined) {
  if (!head) {
    await patchState({ nowPlaying: null, playerStatus: 'idle', betweenEndsAt: null })
    return
  }
  const np: NowPlaying = {
    queueId: head.id,
    videoId: head.videoId,
    title: head.title,
    nickname: head.nickname,
    uid: head.uid,
    bookedAt: head.createdAt,
    startedAt: Date.now(),
  }
  const batch = writeBatch(db)
  batch.delete(doc(db, 'queue', head.id))
  batch.set(stateRef(), { nowPlaying: np, playerStatus: 'playing', betweenEndsAt: null, sync: null }, { merge: true })
  await batch.commit()
}

export const BETWEEN_MS = 10_000

export async function finishCurrent(hasNext: boolean) {
  await patchState(
    hasNext
      ? { nowPlaying: null, playerStatus: 'between', betweenEndsAt: Date.now() + BETWEEN_MS, sync: null }
      : { nowPlaying: null, playerStatus: 'idle', betweenEndsAt: null, sync: null },
  )
}

export const beginBetween = () => patchState({ playerStatus: 'between', betweenEndsAt: Date.now() + BETWEEN_MS })

/* ------------------------------- staff: ban ------------------------------- */

async function commitChunks(ops: ((b: WriteBatch) => void)[]) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db)
    ops.slice(i, i + 400).forEach((op) => op(b))
    await b.commit()
  }
}

export async function banNickname(nickname: string, presence: PresenceDoc[], queue: QueueItem[]) {
  const key = nicknameKey(nickname)
  if (!key) return
  const uids = new Set<string>()
  presence.filter((p) => p.nicknameKey === key).forEach((p) => uids.add(p.id))
  queue.filter((q) => q.nicknameKey === key && q.uid !== 'manual').forEach((q) => uids.add(q.uid))
  const ops: ((b: WriteBatch) => void)[] = []
  ops.push((b) => b.set(doc(db, 'banned', key), { nickname, createdAt: serverTimestamp() }))
  uids.forEach((uid) => {
    ops.push((b) => b.set(doc(db, 'banned', uid), { nickname, uid, createdAt: serverTimestamp() }))
    ops.push((b) => b.delete(doc(db, 'impostor/game/players', uid)))
  })
  queue.filter((q) => q.nicknameKey === key || uids.has(q.uid)).forEach((q) => ops.push((b) => b.delete(doc(db, 'queue', q.id))))
  await commitChunks(ops)
}

export const unban = (id: string) => deleteDoc(doc(db, 'banned', id))

/* ------------------------------- staff: impostore ------------------------------- */

const gameRef = () => doc(db, 'impostor/game')

export interface RoundOptions {
  categoryId: string
  impostors: number
  /** secondi in cui la parola resta visibile sui telefoni */
  readingSec: number
}

/**
 * Nuova partita: numera i giocatori a caso, assegna i ruoli (privati) e la parola.
 * `nowMs` = ora del server (così il conto alla rovescia sullo schermo è giusto).
 */
export async function startRound(opts: RoundOptions, nowMs: number) {
  const playersSnap = await getDocs(collection(db, 'impostor/game/players'))
  const players = playersSnap.docs.map((d) => ({ uid: d.id, nickname: String(d.data().nickname ?? '???') }))
  if (players.length < 3) throw new Error('Servono almeno 3 giocatori collegati alla partita')

  const numbered = shuffle(players).map((p, i) => ({ ...p, number: i + 1 }))
  const nImp = Math.max(1, Math.min(opts.impostors, players.length - 2))
  // memoria delle parole già uscite (documento riservato all'admin)
  const privSnap = await getDoc(doc(db, 'impostor/private'))
  const history = (privSnap.data()?.history as WordHistory | undefined) ?? {}
  const lastCategoryId = privSnap.data()?.lastCategoryId as string | undefined
  const { category, word, key: wordK } = pickWord(opts.categoryId, history, nowMs, lastCategoryId)
  const impostors = shuffle(numbered).slice(0, nImp)
  const impUids = new Set(impostors.map((p) => p.uid))

  const prev = await getDoc(gameRef())
  const round = ((prev.data()?.round as number | undefined) ?? 0) + 1

  // 1) cancella i vecchi ruoli
  const oldRoles = await getDocs(collection(db, 'impostor/game/roles'))
  await commitChunks(oldRoles.docs.map((d) => (b: WriteBatch) => b.delete(d.ref)))

  // 2) nuovi ruoli (privati) + numeri + reset voti
  const ops: ((b: WriteBatch) => void)[] = []
  numbered.forEach((p) => {
    const isImp = impUids.has(p.uid)
    ops.push((b) =>
      b.set(doc(db, 'impostor/game/roles', p.uid), {
        role: isImp ? 'impostor' : 'crew',
        word: isImp ? null : word,
        category: category.label,
        round,
      }),
    )
    ops.push((b) => b.update(doc(db, 'impostor/game/players', p.uid), { vote: null, number: p.number }))
  })
  ops.push((b) =>
    b.set(doc(db, 'impostor/private'), {
      word,
      impostorUids: [...impUids],
      impostorNames: impostors.map((p) => p.nickname),
      impostorNumbers: impostors.map((p) => p.number).sort((x, y) => x - y),
      round,
      history: recordWord(history, wordK, nowMs),
      lastCategoryId: category.id,
    }),
  )
  await commitChunks(ops)

  // 3) per ultimo il documento pubblico: i telefoni trovano già i ruoli pronti
  await setDoc(gameRef(), {
    status: 'reading',
    category: category.label,
    categoryId: category.id,
    word: null,
    impostorUids: [],
    impostorNames: [],
    impostorNumbers: [],
    endsAt: nowMs + opts.readingSec * 1000,
    round,
    readingSec: opts.readingSec,
    giro: 0,
    order: [],
    turnIndex: 0,
  })
}

async function newGiro(giro: number) {
  const snap = await getDocs(collection(db, 'impostor/game/players'))
  const numbers = snap.docs.map((d) => d.data().number as number | undefined).filter((n): n is number => typeof n === 'number')
  await setDoc(gameRef(), { status: 'turns', giro, order: shuffle(numbers), turnIndex: 0, endsAt: null }, { merge: true })
}

/** Dopo la lettura della parola: parte il primo giro (ordine di parola casuale). */
export const startTurns = () => newGiro(1)
/** Giro concluso: l'admin ne fa fare un altro con un nuovo ordine. */
export const nextGiro = (currentGiro: number) => newGiro(currentGiro + 1)
/** Avanti / indietro di un giocatore nel giro. */
export const moveTurn = (game: Game, delta: number) =>
  setDoc(gameRef(), { turnIndex: Math.max(0, Math.min(game.order.length, game.turnIndex + delta)) }, { merge: true })

/** Azzera la memoria delle parole (tutte tornano disponibili). */
export async function resetWordHistory() {
  const ref = doc(db, 'impostor/private')
  if ((await getDoc(ref)).exists()) await updateDoc(ref, { history: {} })
}

export const startVoting = () => setDoc(gameRef(), { status: 'voting', endsAt: null }, { merge: true })

export async function revealRound() {
  const priv = await getDoc(doc(db, 'impostor/private'))
  const d = priv.data()
  if (!d) throw new Error('Nessuna partita in corso')
  await setDoc(
    gameRef(),
    { status: 'reveal', word: d.word, impostorUids: d.impostorUids, impostorNames: d.impostorNames, impostorNumbers: d.impostorNumbers ?? [], endsAt: null },
    { merge: true },
  )
}

export async function expelPlayer(uid: string) {
  await deleteDoc(doc(db, 'impostor/game/players', uid))
  await deleteDoc(doc(db, 'impostor/game/roles', uid))
}

export async function resetLobby() {
  const [players, roles] = await Promise.all([
    getDocs(collection(db, 'impostor/game/players')),
    getDocs(collection(db, 'impostor/game/roles')),
  ])
  await commitChunks([...players.docs, ...roles.docs].map((d) => (b: WriteBatch) => b.delete(d.ref)))
  const prev = await getDoc(gameRef())
  await setDoc(gameRef(), {
    status: 'lobby', category: '', categoryId: '', word: null, impostorUids: [], impostorNames: [], impostorNumbers: [],
    endsAt: null, round: (prev.data()?.round as number | undefined) ?? 0, readingSec: 8, giro: 0, order: [], turnIndex: 0,
  })
}

/** Crea i documenti iniziali se mancano (solo staff). */
export async function ensureInitialDocs() {
  const s = await getDoc(stateRef())
  if (!s.exists()) {
    await setDoc(stateRef(), {
      mode: 'lobby', message: 'Torniamo subito!', nowPlaying: null, playerStatus: 'idle',
      bookingsOpen: true, volume: 80, betweenEndsAt: null, skipNonce: 0, gobboAudio: false, sync: null,
      impostorConfig: { categoryId: 'random', impostors: 1, readingSec: 8 }, lastAction: null,
    })
  }
  const g = await getDoc(gameRef())
  if (!g.exists()) {
    await setDoc(gameRef(), {
      status: 'lobby', category: '', categoryId: '', word: null, impostorUids: [], impostorNames: [], impostorNumbers: [],
      endsAt: null, round: 0, readingSec: 8, giro: 0, order: [], turnIndex: 0,
    })
  }
}
