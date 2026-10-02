import { useEffect, useState, type FormEvent } from "react";
import { navigate } from "../../lib/router";
import "../Landing/landing.css";
import { authErrorMessage, useAuth } from "../../context/AuthContext";
import { Logo } from "../UI/Icons";

type Mode = "signin" | "signup" | "reset";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/** Galaxy AI sign-in page backed by Firebase Authentication. */
export function AuthPage({ mode: initialMode = "signin" }: { mode?: Mode }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  useEffect(() => setMode(initialMode), [initialMode]);
  useEffect(() => {
    document.title = initialMode === "signup" ? "Sign up · Galaxy AI" : "Log in · Galaxy AI";
  }, [initialMode]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const go = (m: Mode) => {
    if (m !== "reset") navigate(m === "signup" ? "/signup" : "/login");
    setMode(m);
    setError(null);
    setInfo(null);
    setPassword("");
  };

  const google = async () => {
    setBusy("google");
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address.");
    setBusy("email");
    try {
      if (mode === "reset") {
        await resetPassword(email);
        setInfo("Password reset email sent. Please check your inbox.");
      } else if (mode === "signup") {
        if (!name.trim()) {
          setError("Please enter your name.");
          return;
        }
        if (password.length < 6) {
          setError("Password is too weak. Use at least 6 characters.");
          return;
        }
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
      setPassword((p) => (mode === "reset" ? "" : p));
    }
  };

  return (
    <div className="auth lp">
      <div className="lp-bg" aria-hidden><span className="lp-orb a" /><span className="lp-orb b" /></div>
      <div className="auth-card glass">
        <a className="auth-brand" href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} aria-label="Galaxy AI home">
          <Logo size={52} />
          <span>Galaxy AI</span>
        </a>
        <h1>{mode === "signup" ? "Create your Galaxy AI account" : mode === "reset" ? "Reset your password" : "Welcome back"}</h1>
        {mode === "signin" && <p className="muted">Log in to continue to Galaxy AI.</p>}
        {mode === "signup" && <p className="muted">Start chatting, searching and creating in seconds.</p>}
        {mode === "reset" && <p className="muted">Enter your email and we'll send you a link to reset your password.</p>}

        {mode !== "reset" && (
          <>
            <button className="btn auth-google" onClick={google} disabled={!!busy}>
              {busy === "google" ? <span className="spinner sm dark" aria-hidden /> : <GoogleIcon />} Continue with Google
            </button>
            <div className="auth-divider"><span>or</span></div>
          </>
        )}

        <form className="auth-form" onSubmit={submit} noValidate>
          {mode === "signup" && (
            <label>
              <span>Name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" maxLength={80} />
            </label>
          )}
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="Enter your email" required />
          </label>
          {mode !== "reset" && (
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                required
              />
            </label>
          )}
          {error && <p className="status error" role="alert">{error}</p>}
          {info && <p className="status ok" role="status">{info}</p>}
          <button className="btn primary auth-submit" type="submit" disabled={!!busy || !email || (mode !== "reset" && !password)}>
            {busy === "email" && <span className="spinner sm" aria-hidden />}
            {mode === "reset" ? "Send reset email" : mode === "signup" ? "Create account" : "Log in"}
          </button>
        </form>

        <div className="auth-links">
          {mode === "signin" && (
            <>
              <button className="link-btn" onClick={() => go("reset")}>Forgot password?</button>
              <span className="muted">Don't have an account? <button className="link-btn" onClick={() => go("signup")}>Sign up</button></span>
            </>
          )}
          {mode === "signup" && (
            <span className="muted">Already have an account? <button className="link-btn" onClick={() => go("signin")}>Log in</button></span>
          )}
          {mode === "reset" && <button className="link-btn" onClick={() => go("signin")}>Back to log in</button>}
        </div>
      </div>
    </div>
  );
}
