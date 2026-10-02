import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";

/**
 * Firebase Web App configuration for project "your-ai-477bf".
 * These are public identifiers (not secrets). The apiKey MUST be the one shown in
 * Firebase Console → Project settings → General → Your apps → Web app → SDK config.
 *
 * Values come from VITE_FIREBASE_* env vars (read at BUILD time — restart `vite`
 * / rebuild after changing them), falling back to the values registered for the project.
 */
const env = import.meta.env;
export const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBZ6_LDNus1dx2Jcw4PKY6vM1FKShfVUiw",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "your-ai-477bf.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "your-ai-477bf",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "your-ai-477bf.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "52495617364",
  appId: env.VITE_FIREBASE_APP_ID || "1:52495617364:web:08aa3c29557b22710d0cc1",
};

/** Single Firebase app instance (also safe across Vite HMR reloads). */
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firebaseApp = app;
export const auth = getAuth(app);
// Keep users signed in across refreshes; Firebase manages its own session storage.
void setPersistence(auth, browserLocalPersistence);

export default app;
