import { useAuth } from "../../context/AuthContext";
import { setStorageScope } from "../../services/storage";
import { Logo } from "../UI/Icons";
import { AuthPage } from "./AuthPage";
import App from "../../App";

/**
 * Renders nothing of the app until Firebase has resolved the session, then shows
 * either the sign-in page or Galaxy AI for the signed-in user.
 */
export function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="splash" role="status" aria-label="Loading Galaxy AI">
        <Logo size={48} />
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <AuthPage />;

  // Scope local data to this Firebase user before the app reads storage.
  setStorageScope(user.uid);
  return <App key={user.uid} user={user} />;
}
