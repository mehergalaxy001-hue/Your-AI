import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { setStorageScope } from "../../services/storage";
import { isProtected, navigate, usePath } from "../../lib/router";
import { Logo } from "../UI/Icons";
import { AuthPage } from "./AuthPage";
import { Landing } from "../Landing/Landing";
import { LegalPage } from "../Landing/LegalPage";
import App from "../../App";

/**
 * Route + auth gate.
 *  Public:    /  /login  /signup  /privacy  /terms
 *  Protected: /app  /chat  → require a Firebase user, else redirect to /login
 * Nothing protected renders until Firebase has resolved the session.
 */
export function AuthGate() {
  const { user, loading } = useAuth();
  const path = usePath();

  useEffect(() => {
    if (loading) return;
    if (isProtected(path) && !user) navigate(`/login`, true);
    else if ((path === "/login" || path === "/signup") && user) navigate("/app", true);
    else if (!isProtected(path) && !["/", "/login", "/signup", "/privacy", "/terms"].includes(path)) navigate("/", true);
  }, [loading, user, path]);

  if (loading) {
    return (
      <div className="splash" role="status" aria-label="Loading Galaxy AI">
        <Logo size={48} />
        <div className="spinner" />
      </div>
    );
  }

  if (isProtected(path)) {
    if (!user) return null; // redirecting to /login
    setStorageScope(user.uid); // scope local data before the app reads storage
    return <App key={user.uid} user={user} />;
  }
  if (path === "/login" || path === "/signup") return user ? null : <AuthPage mode={path === "/signup" ? "signup" : "signin"} />;
  if (path === "/privacy" || path === "/terms") return <LegalPage kind={path === "/privacy" ? "privacy" : "terms"} />;
  return <Landing signedIn={!!user} />;
}
