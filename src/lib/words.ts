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

export function pickWord(categoryId: string): { category: Category; word: string } {
  const cat = categoryId === RANDOM_CATEGORY_ID || !CATEGORIES.find((c) => c.id === categoryId)
    ? CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    : CATEGORIES.find((c) => c.id === categoryId)!
  const word = cat.words[Math.floor(Math.random() * cat.words.length)]
  return { category: cat, word }
}
