import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";

/**
 * Firebase Web SDK configuration. These values are public identifiers (not secrets)
 * and are safe to ship to the browser. Override per environment with VITE_FIREBASE_* vars.
 * Never put service-account / Admin SDK credentials in frontend code.
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

/** Single Firebase app instance (safe across Vite HMR reloads). */
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// Keep users signed in across refreshes; Firebase manages the session storage itself.
void setPersistence(auth, browserLocalPersistence);
