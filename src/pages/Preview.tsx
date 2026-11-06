// Pagina SOLO per sviluppo (/__preview/<nome>): mostra le schermate con dati finti, per controllarne la grafica.
import { useParams } from 'react-router-dom'
import type { AppState, Game, PlayerDoc, QueueItem } from '../lib/types'
import { DEFAULT_STATE } from '../lib/types'
import KaraokeStage, { CountdownRing } from './screen/KaraokeStage'
import { LobbyScreen, PauseScreen } from './screen/LobbyScreen'
import ImpostorScreen from './screen/ImpostorScreen'
import KaraokeAdmin from './admin/KaraokeAdmin'
import ImpostorAdmin from './admin/ImpostorAdmin'
import { CallOverlay } from './phone/KaraokeView'
import { ReadingView, TurnsView, VotingView } from './phone/ImpostorView'
import { ScreenStart } from '../components/ScreenStart'
import { BrandTitle } from '../components/Logo'

const thumb = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e6fd0"/><stop offset="1" stop-color="#26235f"/></linearGradient></defs><rect width="320" height="180" fill="url(#g)"/><text x="160" y="105" font-size="48" text-anchor="middle" fill="white" font-family="sans-serif">♪</text></svg>')
const mk = (i: number, nickname: string, title: string): QueueItem => ({ id: 'q' + i, videoId: 'dQw4w9WgXcQ', title, thumbnail: thumb, nickname, nicknameKey: nickname.toLowerCase(), uid: 'u' + i, createdAt: 1000 + i, key: 1000 + i })
const queue = [
  mk(1, 'Giulia', 'Vasco Rossi - Albachiara (Karaoke Version)'),
  mk(2, 'Marco_99', 'Måneskin - Zitti e buoni (Base karaoke con testo)'),
  mk(3, 'Sofia', 'Mahmood - Soldi (Karaoke)'),
  mk(4, 'Lorenzo', 'Tiziano Ferro - Sere nere (Karaoke con testo)'),
  mk(5, 'Chiara', 'Annalisa - Sinceramente (Karaoke Instrumental)'),
  mk(6, 'Davide', 'Blanco - Notti in bianco (Karaoke)'),
]
const players: PlayerDoc[] = ['Giulia', 'Marco_99', 'Sofia', 'Lorenzo', 'Chiara', 'Davide', 'Elena', 'Matteo'].map((n, i) => ({ id: 'p' + i, nickname: n, number: i + 1, vote: i % 3 === 0 ? 'p1' : i % 3 === 1 ? 'p2' : i === 5 ? 'p1' : null }))
const baseGame: Game = { status: 'turns', category: 'Cibo', categoryId: 'cibo', word: null, impostorUids: [], impostorNames: [], impostorNumbers: [], endsAt: Date.now() + 7_000, round: 1, readingSec: 8, giro: 2, order: [5, 2, 8, 1, 7, 3, 6, 4], turnIndex: 3 }
const st = (p: Partial<AppState>): AppState => ({ ...DEFAULT_STATE, mode: 'karaoke', ...p })
const clock = () => Date.now()

export default function Preview() {
  const { name } = useParams()
  switch (name) {
    case 'start': return <ScreenStart label="Schermo proiettore" hint="Il clic serve per attivare l'audio del browser" onStart={() => {}} />
    case 'lobby': return <div className="h-screen"><LobbyScreen online={87} /></div>
    case 'pause': return <div className="h-screen"><PauseScreen message="Torniamo tra 10 minuti" /></div>
    case 'k-playing': return <div className="h-screen"><KaraokeStage active serverNow={clock} queue={queue.slice(1)} state={st({ playerStatus: 'playing', nowPlaying: { queueId: 'x', videoId: 'dQw4w9WgXcQ', title: 'Vasco Rossi - Albachiara (Karaoke Version)', nickname: 'Giulia', uid: 'u1', bookedAt: 1, startedAt: 1 } })} /></div>
    case 'k-between': return <div className="h-screen"><KaraokeStage active serverNow={clock} queue={queue} state={st({ playerStatus: 'between', betweenEndsAt: Date.now() + 6500 })} /></div>
    case 'k-empty': return <div className="h-screen"><KaraokeStage active serverNow={clock} queue={[]} state={st({ playerStatus: 'idle' })} /></div>
    case 'i-lobby': return <div className="h-screen"><ImpostorScreen serverNow={clock} game={{ ...baseGame, status: 'lobby' }} players={players} /></div>
    case 'i-reading': return <div className="h-screen"><ImpostorScreen serverNow={clock} game={{ ...baseGame, status: 'reading' }} players={players} /></div>
    case 'i-turns': return <div className="h-screen"><ImpostorScreen serverNow={clock} game={baseGame} players={players} /></div>
    case 'i-turns-end': return <div className="h-screen"><ImpostorScreen serverNow={clock} game={{ ...baseGame, turnIndex: 8 }} players={players} /></div>
    case 'i-voting': return <div className="h-screen"><ImpostorScreen serverNow={clock} game={{ ...baseGame, status: 'voting' }} players={players} /></div>
    case 'i-reveal': return <div className="h-screen"><ImpostorScreen serverNow={clock} game={{ ...baseGame, status: 'reveal', word: 'Carbonara', impostorUids: ['p1'], impostorNames: ['Marco_99'], impostorNumbers: [2] }} players={players} /></div>
    case 'gobbo-between': return <div className="h-screen bg-stage flex flex-col items-center justify-center gap-[3vh] text-center"><div className="eyebrow text-[2vw]">Tocca a</div><div className="display grad-text text-[11vw]">Giulia</div><CountdownRing left={6500} size={300} /></div>
    case 'p-reading': return <div className="min-h-screen bg-stage flex flex-col"><ReadingView role={{ role: 'crew', word: 'Carbonara', category: 'Cibo', round: 1 }} sec={600} number={7} /></div>
    case 'p-reading-imp': return <div className="min-h-screen bg-stage flex flex-col"><ReadingView role={{ role: 'impostor', word: null, category: 'Cibo', round: 1 }} sec={600} number={7} /></div>
    case 'p-turns-wait': return <div className="min-h-screen bg-stage flex flex-col"><TurnsView category="Cibo" number={7} game={baseGame} /></div>
    case 'p-turns-mine': return <div className="min-h-screen bg-stage flex flex-col"><TurnsView category="Cibo" number={1} game={baseGame} /></div>
    case 'p-voting': return <div className="min-h-screen bg-stage flex flex-col"><VotingView uid="p0" me="p2" myNumber={1} players={players} /></div>
    case 'call': return <CallOverlay title="Vasco Rossi - Albachiara (Karaoke Version)" onClose={() => {}} />
    case 'a-karaoke': return <div className="min-h-screen bg-stage p-6"><div className="max-w-6xl mx-auto"><div className="mb-5"><BrandTitle /></div><KaraokeAdmin presence={[]} banned={[{ id: 'x', nickname: 'Troll', createdAt: 1 }]} queue={queue} state={st({ playerStatus: 'playing', nowPlaying: { queueId: 'x', videoId: 'dQw4w9WgXcQ', title: 'Vasco Rossi - Albachiara (Karaoke Version)', nickname: 'Giulia', uid: 'u1', bookedAt: 1, startedAt: 1 } })} /></div></div>
    case 'a-impostor': return <div className="min-h-screen bg-stage p-6"><div className="max-w-6xl mx-auto"><ImpostorAdmin serverNow={clock} game={baseGame} players={players} /></div></div>
    default: return <div className="p-6">Anteprime: start, lobby, pause, k-playing, k-between, k-empty, i-lobby, i-reading, i-turns, i-turns-end, i-voting, i-reveal, gobbo-between, call, a-karaoke, a-impostor</div>
  }
}
