import { getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";

/**
 * Firebase Web App configuration for project "your-ai-477bf".
 * These are public identifiers for the Firebase Web SDK (not secrets).
 */
const firebaseConfig = {
  apiKey: "AIzaSyBZ6_LDNus1dx2Jcw4PK6YvM1FKShfVUiw",
  authDomain: "your-ai-477bf.firebaseapp.com",
  projectId: "your-ai-477bf",
  storageBucket: "your-ai-477bf.firebasestorage.app",
  messagingSenderId: "52495617364",
  appId: "1:52495617364:web:08aa3c29557b22710d0cc1",
};

// Single Firebase app instance (getApps() guard keeps it single across Vite hot reloads).
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Keep users signed in across refreshes; Firebase manages its own session storage.
void setPersistence(auth, browserLocalPersistence);

export { app, firebaseConfig };
export default app;
