// Firebase initialization (Firestore + Auth)
//
// Credentials are read from Vite environment variables (.env file at repo root).
// See .env.example for the keys you need to fill in. You can find these values in:
//   Firebase Console -> Project Settings -> Your apps -> Web app -> SDK setup
//
// IMPORTANT: never commit a real .env file. Only commit .env.example.

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Friendly fail-fast: if env vars are missing, the rest of the app would explode
// with a cryptic Firebase error. We surface a clear console message instead.
const missing = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    '[Jardim do Lago] Firebase config ausente. Crie um arquivo .env na raiz ' +
    'baseado em .env.example. Variáveis faltando:',
    missing
  );
}

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Keep the user signed in even after closing the browser tab.
setPersistence(auth, browserLocalPersistence).catch(() => {});

// Enable offline cache so the app keeps working without connectivity.
// Failure modes here are non-fatal (e.g., multiple tabs open) so we swallow.
enableIndexedDbPersistence(db).catch(() => {});

// Single-document data model: all schedule data lives at /escalas/main.
// This keeps reads cheap (one document = one read) and writes atomic.
export const SCHEDULE_DOC_PATH = { collection: 'escalas', doc: 'main' };

// The "fake" email used internally for the admin login. The user only types
// her name + password in the UI; we map "Ana" -> this email under the hood.
export const ADMIN_EMAIL = 'ana@jardimdolago.local';
