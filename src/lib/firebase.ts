import { initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { initializeFirestore, type Firestore } from 'firebase/firestore'

const env = import.meta.env
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const firebaseConfigured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId)

const app = firebaseConfigured ? initializeApp(cfg) : null

export const auth: Auth = app ? getAuth(app) : (null as unknown as Auth)

// Long polling automatico: funziona anche con le wifi delle scuole che bloccano i WebSocket.
export const db: Firestore = app
  ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true })
  : (null as unknown as Firestore)

export const adminUids: string[] = ((env.VITE_ADMIN_UIDS as string | undefined) ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
