import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "../lib/firebase";

interface AuthValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Friendly messages for Firebase Auth error codes (raw errors are never shown). */
export function authErrorMessage(e: unknown): string | null {
  const code = e instanceof FirebaseError ? e.code : "";
  // Log only the error code (never tokens/keys) to help the site owner diagnose configuration.
  if (code) console.warn(`[auth] Firebase error: ${code}`);
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return null; // user intentionally dismissed — not an error
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method. Try signing in with email.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled for Galaxy AI yet.";
    case "auth/unauthorized-domain":
      return "This domain isn't authorized for sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.";
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    case "auth/invalid-api-key":
      return "Sign-in isn't available right now: the site's Firebase configuration is invalid. The site owner needs to update the Firebase API key.";
    case "auth/configuration-not-found":
      return "Sign-in isn't set up for this site yet. The site owner needs to enable Firebase Authentication.";
    case "auth/admin-restricted-operation":
      return "New sign-ups are currently disabled for this site.";
    case "auth/requests-from-referer-are-blocked":
    case "auth/requests-to-this-api-identitytoolkit-method-are-blocked.":
      return "Sign-in is blocked by the site's API key restrictions. The site owner needs to allow this domain.";
    case "auth/internal-error":
      return "Firebase had a temporary problem. Please try again.";
    default:
      return "Something went wrong while signing in. Please try again.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Completes a redirect sign-in (popup fallback); errors surface via the login page.
    getRedirectResult(auth).catch(() => undefined);
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : "";
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw e;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (name?.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
      setUser(Object.assign(Object.create(Object.getPrototypeOf(cred.user)), cred.user));
    }
  }, []);

  const signOut = useCallback(() => fbSignOut(auth), []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      // Don't reveal whether an account exists for this email.
      if (e instanceof FirebaseError && e.code === "auth/user-not-found") return;
      throw e;
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, resetPassword }),
    [user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, resetPassword],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

/** Firebase ID token for authenticating requests to the Galaxy AI backend. */
export async function getIdToken(): Promise<string | null> {
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}
