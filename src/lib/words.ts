export interface Category {
  id: string
  label: string
  emoji: string
  words: string[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'calcio', label: 'Calcio', emoji: '⚽',
    words: ['Totti', 'De Rossi', 'Del Piero', 'Baggio', 'Maldini', 'Pirlo', 'Buffon', 'Messi', 'Cristiano Ronaldo', 'Maradona', 'Pelé', 'Zidane', 'Mbappé', 'Haaland', 'Neymar', 'Lukaku', 'Dybala', 'Insigne', 'Immobile', 'Chiesa', 'Barella', 'Donnarumma', 'Osimhen', 'Vlahović', 'Pellegrini', 'Ibrahimović', 'Roma', 'Lazio', 'Juventus', 'Inter', 'Milan', 'Napoli', 'Barcellona', 'Real Madrid', 'Liverpool', 'Stadio Olimpico', 'Rigore', 'Fuorigioco', 'Var', 'Pallone d\'oro'],
  },
  {
    id: 'cibo', label: 'Cibo', emoji: '🍕',
    words: ['Pizza', 'Carbonara', 'Amatriciana', 'Gricia', 'Cacio e pepe', 'Supplì', 'Tiramisù', 'Gelato', 'Lasagna', 'Tortellini', 'Gnocchi', 'Risotto', 'Panino', 'Kebab', 'Sushi', 'Hamburger', 'Patatine', 'Nutella', 'Cornetto', 'Maritozzo', 'Arancino', 'Focaccia', 'Parmigiana', 'Polpette', 'Bruschetta', 'Cannolo', 'Panettone', 'Pizza bianca', 'Carciofi alla giudia', 'Saltimbocca', 'Spaghetti', 'Ravioli', 'Nuggets', 'Crepes', 'Pancake', 'Popcorn', 'Mozzarella', 'Prosciutto', 'Tonno', 'Cotoletta'],
  },
  {
    id: 'animali', label: 'Animali', emoji: '🦁',
    words: ['Cane', 'Gatto', 'Leone', 'Tigre', 'Elefante', 'Giraffa', 'Zebra', 'Scimmia', 'Gorilla', 'Panda', 'Koala', 'Canguro', 'Pinguino', 'Delfino', 'Squalo', 'Balena', 'Polpo', 'Tartaruga', 'Coccodrillo', 'Serpente', 'Aquila', 'Gufo', 'Pappagallo', 'Cavallo', 'Mucca', 'Maiale', 'Pecora', 'Lupo', 'Orso', 'Volpe', 'Coniglio', 'Criceto', 'Ippopotamo', 'Rinoceronte', 'Cammello', 'Pipistrello', 'Farfalla', 'Ape', 'Ragno', 'Gabbiano', 'Cinghiale', 'Piccione'],
  },
  {
    id: 'scuola', label: 'Scuola', emoji: '🎒',
    words: ['Lavagna', 'Banco', 'Cattedra', 'Registro', 'Interrogazione', 'Compito in classe', 'Ricreazione', 'Campanella', 'Zaino', 'Astuccio', 'Diario', 'Quaderno', 'Preside', 'Bidello', 'Professore', 'Gita', 'Occupazione', 'Assemblea', 'Pagella', 'Debito', 'Recupero', 'Collettivo', 'Autogestione', 'Vocabolario', 'Calcolatrice', 'Evidenziatore', 'Fotocopie', 'Cartina', 'Lezione', 'Verifica', 'Maturità', 'Voto', 'Sufficienza', 'Ritardo', 'Giustifica', 'Palestra', 'Laboratorio', 'Biblioteca', 'Segreteria', 'Aula magna'],
  },
  {
    id: 'film', label: 'Film', emoji: '🎬',
    words: ['Titanic', 'Avatar', 'Frozen', 'Il Re Leone', 'Shrek', 'Toy Story', 'Harry Potter', 'Il Signore degli Anelli', 'Star Wars', 'Jurassic Park', 'Matrix', 'Avengers', 'Spider-Man', 'Batman', 'Joker', 'Barbie', 'Oppenheimer', 'Fast & Furious', 'Rocky', 'Il Gladiatore', 'Il Padrino', 'La vita è bella', 'Quo vado?', 'Perfetti sconosciuti', 'Lo chiamavano Jeeg Robot', 'Un sacco bello', 'Inception', 'Interstellar', 'Coco', 'Up', 'Alla ricerca di Nemo', 'Cars', 'Minions', 'Pulp Fiction', 'Forrest Gump', 'Shining', 'Ritorno al futuro', 'Cars 2', 'Madagascar'],
  },
  {
    id: 'cantanti', label: 'Cantanti', emoji: '🎤',
    words: ['Mahmood', 'Blanco', 'Sfera Ebbasta', 'Fedez', 'Annalisa', 'Elodie', 'Geolier', 'Lazza', 'Marracash', 'Madame', 'Achille Lauro', 'Måneskin', 'Tiziano Ferro', 'Laura Pausini', 'Vasco Rossi', 'Ligabue', 'Jovanotti', 'Eros Ramazzotti', 'Renato Zero', 'Antonello Venditti', 'Francesco De Gregori', 'Max Pezzali', 'Tananai', 'Angelina Mango', 'Ultimo', 'Rkomi', 'Salmo', 'Tedua', 'Shiva', 'Ghali', 'Taylor Swift', 'Ed Sheeran', 'Billie Eilish', 'Dua Lipa', 'The Weeknd', 'Harry Styles', 'Rihanna', 'Beyoncé', 'Drake', 'Bad Bunny'],
  },
  {
    id: 'roma', label: 'Luoghi di Roma', emoji: '🏛️',
    words: ['Colosseo', 'Fontana di Trevi', 'Pantheon', 'Piazza di Spagna', 'Castel Sant\'Angelo', 'Circo Massimo', 'Trastevere', 'Villa Borghese', 'Piazza Navona', 'San Pietro', 'Campo de\' Fiori', 'Testaccio', 'Garbatella', 'Pigneto', 'San Lorenzo', 'Monti', 'Gianicolo', 'Altare della Patria', 'Foro Romano', 'Terme di Caracalla', 'Appia Antica', 'EUR', 'Stadio Olimpico', 'Porta Portese', 'Ponte Milvio', 'Tevere', 'Isola Tiberina', 'Bocca della Verità', 'Villa Ada', 'Termini', 'Ostia', 'Cinecittà', 'Quirinale', 'Piramide', 'Via del Corso', 'Lungotevere', 'Trinità dei Monti', 'Auditorium', 'Raccordo Anulare', 'Metro A'],
  },
  {
    id: 'sport', label: 'Sport', emoji: '🏀',
    words: ['Tennis', 'Pallavolo', 'Basket', 'Nuoto', 'Rugby', 'Scherma', 'Atletica', 'Ciclismo', 'Formula 1', 'MotoGP', 'Boxe', 'Judo', 'Karate', 'Sci', 'Snowboard', 'Surf', 'Golf', 'Padel', 'Pallanuoto', 'Ping pong', 'Baseball', 'Hockey', 'Calcio a 5', 'Tuffi', 'Ginnastica', 'Equitazione', 'Arrampicata', 'Maratona', 'Triathlon', 'Skateboard', 'Freccette', 'Bocce', 'Badminton', 'Canottaggio', 'Vela', 'Wrestling', 'Beach volley', 'Parkour'],
  },
  {
    id: 'mestieri', label: 'Mestieri', emoji: '🛠️',
    words: ['Medico', 'Infermiere', 'Avvocato', 'Ingegnere', 'Architetto', 'Pizzaiolo', 'Cuoco', 'Cameriere', 'Barista', 'Pilota', 'Hostess', 'Poliziotto', 'Carabiniere', 'Pompiere', 'Idraulico', 'Elettricista', 'Falegname', 'Muratore', 'Meccanico', 'Parrucchiere', 'Estetista', 'Giornalista', 'Fotografo', 'Attore', 'Youtuber', 'Streamer', 'Programmatore', 'Veterinario', 'Dentista', 'Farmacista', 'Insegnante', 'Bibliotecario', 'Tassista', 'Autista dell\'ATAC', 'Vigile urbano', 'Giardiniere', 'Commesso', 'Pescatore', 'Astronauta', 'Gladiatore'],
  },
  {
    id: 'videogiochi', label: 'Videogiochi e social', emoji: '🎮',
    words: ['Fortnite', 'Minecraft', 'FIFA', 'Among Us', 'GTA', 'Roblox', 'Call of Duty', 'Mario Kart', 'Zelda', 'Pokémon', 'Tetris', 'Pac-Man', 'Brawl Stars', 'Clash Royale', 'League of Legends', 'Valorant', 'The Sims', 'Candy Crush', 'TikTok', 'Instagram', 'WhatsApp', 'Snapchat', 'YouTube', 'Twitch', 'Discord', 'Netflix', 'Spotify', 'BeReal', 'Telegram', 'ChatGPT', 'PlayStation', 'Nintendo Switch', 'Xbox', 'Super Mario', 'Sonic'],
  },
  {
    id: 'serietv', label: 'Serie TV', emoji: '📺',
    words: ['Mare Fuori', 'Squid Game', 'Stranger Things', 'Breaking Bad', 'La Casa di Carta', 'Friends', 'The Office', 'Game of Thrones', 'Gomorra', 'Skam Italia', 'Suburra', 'Elite', 'Riverdale', 'Wednesday', 'Boris', 'I Simpson', 'Rick and Morty', 'Peaky Blinders', 'Bridgerton', 'Lupin', 'Black Mirror', 'The Witcher', 'Un posto al sole', 'Don Matteo', 'Montalbano', 'Doctor Who', 'Dark', 'Euphoria', 'Gossip Girl', 'Grey\'s Anatomy', 'South Park', 'Naruto', 'One Piece', 'Dragon Ball'],
  },
]

export const RANDOM_CATEGORY_ID = 'random'

/* ----------------------------------------------------------------------------
 * Memoria delle parole: ogni parola ricorda quando è uscita l'ultima volta.
 *  - entro REST_MS (8 ore) non può uscire di nuovo
 *  - tra 8 e 48 ore torna con una probabilità che cresce piano piano
 *  - oltre 48 ore (o mai uscita) ha la probabilità piena
 * Così la mattina può ricapitare una parola della sera prima, ma con tanto tempo in mezzo.
 * ------------------------------------------------------------------------- */
export type WordHistory = Record<string, number>

export const REST_MS = 8 * 3600_000
export const FULL_MS = 48 * 3600_000
const FORGET_MS = 7 * 24 * 3600_000

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
export const wordKey = (categoryId: string, word: string) => `${categoryId}_${slug(word)}`

/** Peso di una parola: 0 = a riposo, 1 = piena probabilità. */
export function wordWeight(lastUsed: number | undefined, now: number): number {
  if (lastUsed === undefined) return 1
  const age = now - lastUsed
  if (age < REST_MS) return 0
  if (age >= FULL_MS) return 1
  const t = (age - REST_MS) / (FULL_MS - REST_MS)
  return 0.05 + 0.95 * t * t
}

/** Quante parole di una categoria sono utilizzabili adesso. */
export function availability(categoryId: string, history: WordHistory, now: number): { free: number; total: number } {
  const cats = categoryId === RANDOM_CATEGORY_ID ? CATEGORIES : CATEGORIES.filter((c) => c.id === categoryId)
  let free = 0
  let total = 0
  cats.forEach((c) => c.words.forEach((w) => {
    total++
    if (wordWeight(history[wordKey(c.id, w)], now) > 0) free++
  }))
  return { free, total }
}

function weightedPick<T>(items: T[], weight: (x: T) => number): T | null {
  const total = items.reduce((a, x) => a + weight(x), 0)
  if (total <= 0) return null
  let r = Math.random() * total
  for (const x of items) {
    r -= weight(x)
    if (r <= 0) return x
  }
  return items[items.length - 1]
}

export interface Pick {
  category: Category
  word: string
  key: string
}

/**
 * Sceglie la parola evitando quelle uscite da poco.
 * Con categoria "casuale" le categorie con più parole "fresche" sono più probabili e quella dell'ultima partita meno.
 */
export function pickWord(categoryId: string, history: WordHistory, now: number, lastCategoryId?: string): Pick {
  const pool = categoryId === RANDOM_CATEGORY_ID || !CATEGORIES.find((c) => c.id === categoryId)
    ? CATEGORIES
    : [CATEGORIES.find((c) => c.id === categoryId)!]
  const w = (c: Category, word: string) => wordWeight(history[wordKey(c.id, word)], now)

  let category: Category | null = null
  if (pool.length > 1) {
    category = weightedPick(pool, (c) => c.words.reduce((a, x) => a + w(c, x), 0) * (c.id === lastCategoryId ? 0.35 : 1))
  } else {
    category = pool[0]
  }

  if (category) {
    const cat = category
    const word = weightedPick(cat.words, (x) => w(cat, x))
    if (word) return { category: cat, word, key: wordKey(cat.id, word) }
  }

  // tutto a riposo (partite ravvicinatissime): usa la parola rimasta ferma da più tempo
  const all = pool.flatMap((c) => c.words.map((word) => ({ c, word, last: history[wordKey(c.id, word)] ?? 0 })))
  all.sort((a, b) => a.last - b.last)
  const f = all[0]
  return { category: f.c, word: f.word, key: wordKey(f.c.id, f.word) }
}

/** Aggiunge la parola uscita e dimentica quelle più vecchie di 7 giorni (il documento resta piccolo). */
export function recordWord(history: WordHistory, key: string, now: number): WordHistory {
  const out: WordHistory = {}
  for (const [k, t] of Object.entries(history)) if (now - t < FORGET_MS) out[k] = t
  out[key] = now
  return out
}
