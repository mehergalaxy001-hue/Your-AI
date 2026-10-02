import { useEffect } from "react";
import { navigate } from "../../lib/router";
import { Logo } from "../UI/Icons";
import "./landing.css";

/** Plain-language Privacy / Terms pages describing how Galaxy AI actually works. */
export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  useEffect(() => {
    document.title = `${kind === "privacy" ? "Privacy" : "Terms"} · Galaxy AI`;
    document.body.classList.add("lp-body");
    return () => document.body.classList.remove("lp-body");
  }, [kind]);

  return (
    <div className="lp">
      <div className="lp-bg" aria-hidden><span className="lp-orb a" /></div>
      <header className="lp-header scrolled">
        <div className="lp-container lp-header-row">
          <a className="lp-brand" href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
            <Logo size={32} />
            <span>Galaxy AI</span>
          </a>
          <div className="lp-header-actions">
            <button className="lp-btn ghost sm" onClick={() => navigate("/")}>Back to home</button>
          </div>
        </div>
      </header>
      <main className="lp-container lp-legal">
        {kind === "privacy" ? (
          <>
            <h1>Privacy</h1>
            <p>This page explains, in plain language, how Galaxy AI handles your information.</p>
            <h2>Account</h2>
            <p>Sign-in is handled by Firebase Authentication (Google or email). Galaxy AI never sees or stores your password.</p>
            <h2>Conversations</h2>
            <p>
              Your chat history is stored in your browser on this device, separated per account. Messages you send — and any files or images you
              attach — are forwarded through the Galaxy AI server to the configured AI provider (Google Gemini) to generate a reply.
            </p>
            <h2>Generated media</h2>
            <p>Images and videos you generate are stored on the Galaxy AI server in a folder tied to your account and are deleted automatically after a limited period, or when you delete them.</p>
            <h2>Web search</h2>
            <p>When you enable web search for a message, the AI provider may search the web to answer it and return the sources it used.</p>
          </>
        ) : (
          <>
            <h1>Terms</h1>
            <p>By using Galaxy AI you agree to use it responsibly and lawfully.</p>
            <h2>AI output</h2>
            <p>Galaxy AI can make mistakes. Check important information before relying on it, and don't use responses as professional (medical, legal or financial) advice.</p>
            <h2>Acceptable use</h2>
            <p>Don't use Galaxy AI to create illegal, harmful or abusive content, or to upload content you don't have the right to share.</p>
            <h2>Availability</h2>
            <p>Features depend on third-party AI services and their quotas, and may be limited or unavailable at times.</p>
          </>
        )}
      </main>
      <footer className="lp-footer">
        <div className="lp-container lp-copy">© 2026 Galaxy AI</div>
      </footer>
    </div>
  );
}
