// Filtro parolacce / bestemmie / insulti per nickname e titoli.
// Normalizza (minuscole, accenti, leet 0->o 1->i 3->e 4->a 5->s 7->t @->a $->s) e collassa le lettere doppie.

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i', '€': 'e' }

const collapse = (s: string) => s.replace(/(.)\1+/g, '$1')

function clean(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0134577@$!€]/g, (c) => LEET[c] ?? c)
}

// Parole forti: bloccate anche se sono dentro un'altra parola o separate da simboli
const STRONG = [
  'cazzo', 'minchia', 'merda', 'stronz', 'vaffanculo', 'fanculo', 'puttan', 'zoccola', 'bastard', 'coglion',
  'porcodio', 'diocane', 'dioporco', 'dioboia', 'cristoporco', 'mignotta', 'inculo', 'inculare', 'rottinculo',
  'culattone', 'frocio', 'ricchione', 'mongoloide', 'sborr', 'segaiolo', 'pompino', 'stupro',
  'fuck', 'shit', 'bitch', 'nigger', 'nigga', 'faggot', 'whore', 'asshole', 'hitler',
].map((w) => collapse(w))

// Parole deboli: bloccate solo se sono una parola intera
const WEAK = [
  'figa', 'culo', 'culone', 'pene', 'tette', 'troia', 'cesso', 'negro', 'finocchio', 'vaffa', 'nazi',
  'cunt', 'dick', 'cock', 'pussy', 'slut', 'sesso', 'porno', 'puttana', 'scemo',
].map((w) => collapse(w))

export function isProfane(text: string): boolean {
  if (!text) return false
  const c = clean(text)
  const tokens = c.split(/[^a-z]+/).filter(Boolean).map(collapse)
  if (tokens.some((t) => WEAK.includes(t))) return true
  const compact = collapse(c.replace(/[^a-z]/g, ''))
  return STRONG.some((w) => compact.includes(w))
}

export function validateNickname(raw: string): string | null {
  const nick = raw.trim().replace(/\s+/g, ' ')
  if (nick.length < 2) return 'Il nickname deve avere almeno 2 caratteri'
  if (nick.length > 16) return 'Massimo 16 caratteri'
  if (!/^[\p{L}\p{N} ._\-]+$/u.test(nick)) return 'Usa solo lettere, numeri, spazi e . _ -'
  if (isProfane(nick)) return 'Questo nickname non è consentito 🙅'
  if (/^(admin|amministratore|moderatore|schermo)$/i.test(nick)) return 'Nickname riservato'
  return null
}
