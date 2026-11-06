export const BRAND = {
  title: 'Occupazione 2026',
  school: 'Galileo Galilei',
  city: 'Roma',
  full: 'Occupazione 2026 · Galileo Galilei',
  logo: '/logo.png',
}

export function publicUrl(): string {
  const env = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim()
  return env || window.location.origin
}
