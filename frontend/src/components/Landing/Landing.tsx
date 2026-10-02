import { useEffect, useRef, useState, type ReactNode } from "react";
import { navigate } from "../../lib/router";
import { BookIcon, CodeIcon, FileIcon, GlobeIcon, LibraryIcon, Logo, MenuIcon, MicIcon, PhotoIcon, SparkleIcon, VideoIcon, XIcon } from "../UI/Icons";
import "./landing.css";

const ChatIcon = (p: { width?: number; height?: number }) => (
  <svg width={p.width ?? 20} height={p.height ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
  </svg>
);
const EyeIcon = (p: { width?: number; height?: number }) => (
  <svg width={p.width ?? 20} height={p.height ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Only capabilities that exist in the Galaxy AI app today. */
const FEATURES: { icon: (p: { width?: number; height?: number }) => ReactNode; title: string; text: string }[] = [
  { icon: ChatIcon, title: "Natural conversations", text: "Ask questions, write, learn, brainstorm and solve problems with streaming answers, Markdown and code." },
  { icon: GlobeIcon, title: "Web search", text: "Turn on web search to ground answers in current information, with the sources listed under the reply." },
  { icon: SparkleIcon, title: "Image creation", text: "Describe an image and generate it from a text prompt, then download it or save it to your Library." },
  { icon: EyeIcon, title: "Image understanding", text: "Upload a photo and ask Galaxy AI to describe, explain or analyze what's in it." },
  { icon: FileIcon, title: "Files & PDFs", text: "Attach PDFs, text, CSV or JSON files and ask questions about their contents." },
  { icon: VideoIcon, title: "Video creation", text: "Generate short videos from a prompt or a starting image when a video model is configured on the server." },
  { icon: MicIcon, title: "Voice input", text: "Speak instead of typing — your words appear in the composer so you can edit before sending." },
  { icon: LibraryIcon, title: "Organized workspace", text: "Chat history, generated images, videos and uploaded files stay organized in one Library." },
];

const TOOLS = [
  { icon: ChatIcon, name: "Chat", text: "Conversations with streaming, editable messages." },
  { icon: GlobeIcon, name: "Search", text: "Answers grounded in the live web, with sources." },
  { icon: PhotoIcon, name: "Images", text: "Text-to-image generation and a personal gallery." },
  { icon: FileIcon, name: "Files", text: "Attach documents and data files to any message." },
  { icon: BookIcon, name: "PDF Analysis", text: "Summarize, question and extract from PDFs." },
  { icon: VideoIcon, name: "Video", text: "Prompt or image to video, where supported." },
  { icon: LibraryIcon, name: "Library", text: "Everything you've created and uploaded, in one place." },
  { icon: CodeIcon, name: "Code", text: "Syntax-highlighted code blocks with one-click copy." },
];

const STEPS = [
  { n: "01", title: "Ask", text: "Ask Galaxy AI anything." },
  { n: "02", title: "Create", text: "Generate, analyze, search and work with your content." },
  { n: "03", title: "Get things done", text: "Use the result in your workflow." },
];

/** Fade/slide sections in as they enter the viewport. */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return ref;
}

export function Landing({ signedIn }: { signedIn: boolean }) {
  const ref = useReveal();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.title = "Galaxy AI — Your AI. Your Galaxy.";
    document.body.classList.add("lp-body");
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      document.body.classList.remove("lp-body");
    };
  }, []);

  const start = () => navigate(signedIn ? "/app" : "/signup");
  const open = () => navigate(signedIn ? "/app" : "/login");
  const jump = (id: string) => {
    setMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navLinks = (
    <>
      <button onClick={() => jump("features")}>Features</button>
      <button onClick={() => jump("tools")}>AI Tools</button>
      <button onClick={() => jump("about")}>About</button>
    </>
  );
  const authButtons = signedIn ? (
    <button className="lp-btn primary sm" onClick={() => navigate("/app")}>Open Galaxy AI</button>
  ) : (
    <>
      <button className="lp-btn ghost sm" onClick={() => navigate("/login")}>Log in</button>
      <button className="lp-btn primary sm" onClick={() => navigate("/signup")}>Sign up</button>
    </>
  );

  return (
    <div className="lp" ref={ref}>
      <div className="lp-bg" aria-hidden>
        <span className="lp-orb a" />
        <span className="lp-orb b" />
        <span className="lp-stars" />
      </div>

      <header className={`lp-header ${scrolled ? "scrolled" : ""}`}>
        <div className="lp-container lp-header-row">
          <a className="lp-brand" href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <Logo size={32} />
            <span>Galaxy AI</span>
          </a>
          <nav className="lp-nav" aria-label="Main">{navLinks}</nav>
          <div className="lp-header-actions">{authButtons}</div>
          <button className="lp-menu-btn" onClick={() => setMenu((m) => !m)} aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu}>
            {menu ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
        {menu && (
          <div className="lp-mobile-menu">
            <nav aria-label="Main">{navLinks}</nav>
            <div className="lp-mobile-actions">{authButtons}</div>
          </div>
        )}
      </header>

      <main>
        <section className="lp-hero lp-container">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow reveal"><SparkleIcon width={14} height={14} /> One AI workspace for everything you do</span>
            <h1 className="reveal">Your AI.<br /><span className="lp-grad">Your Galaxy.</span></h1>
            <p className="lp-lead reveal">
              Galaxy AI brings intelligent conversations, web search, image creation, file analysis, and more into one powerful AI workspace.
            </p>
            <div className="lp-cta reveal">
              <button className="lp-btn primary lg" onClick={start}>{signedIn ? "Open Galaxy AI" : "Start with Galaxy AI"}</button>
              <button className="lp-btn glass lg" onClick={() => jump("features")}>Explore Features</button>
            </div>
          </div>
          <div className="lp-hero-visual reveal" aria-hidden>
            <div className="lp-planet">
              <span className="ring r1" />
              <span className="ring r2" />
              <span className="core" />
              <img src="/galaxy-logo.png" alt="" className="lp-planet-logo" />
            </div>
            <div className="lp-preview glass">
              <div className="lp-preview-row user"><span>Plan a 3-day trip to Kyoto on a budget</span></div>
              <div className="lp-preview-row ai">
                <Logo size={22} />
                <div className="lp-lines"><i /><i /><i className="short" /></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="lp-section lp-container">
          <div className="lp-section-head reveal">
            <span className="lp-kicker">Features</span>
            <h2>What Galaxy AI can do</h2>
            <p>Thoughtful tools for thinking, searching and creating — built around a fast, focused chat experience.</p>
          </div>
          <div className="lp-features">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <article key={title} className="lp-card glass reveal" style={{ transitionDelay: `${(i % 4) * 60}ms` }}>
                <span className="lp-card-icon"><Icon width={20} height={20} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-container">
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.n} className="lp-step reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                <span className="lp-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="tools" className="lp-section lp-container">
          <div className="lp-section-head reveal">
            <span className="lp-kicker">AI Tools</span>
            <h2>Everything you need in one AI workspace</h2>
            <p>Pick a tool to jump in. {signedIn ? "" : "You'll be asked to sign in first."}</p>
          </div>
          <div className="lp-tools reveal">
            {TOOLS.map(({ icon: Icon, name, text }) => (
              <button key={name} className="lp-tool glass" onClick={open}>
                <span className="lp-card-icon"><Icon width={20} height={20} /></span>
                <span className="lp-tool-text">
                  <strong>{name}</strong>
                  <span>{text}</span>
                </span>
                <span className="lp-tool-arrow" aria-hidden>→</span>
              </button>
            ))}
          </div>
        </section>

        <section id="about" className="lp-section lp-container">
          <div className="lp-about glass reveal">
            <div>
              <span className="lp-kicker">About</span>
              <h2>Built to be fast, focused and yours.</h2>
              <p>
                Galaxy AI is an AI workspace powered by Google Gemini. Sign in with Google or email, and your conversations and creations stay tied to your
                account. AI provider keys are kept on the server and never reach your browser.
              </p>
            </div>
            <button className="lp-btn primary lg" onClick={start}>{signedIn ? "Open Galaxy AI" : "Start with Galaxy AI"}</button>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-row">
          <div className="lp-footer-brand">
            <div className="lp-brand"><Logo size={28} /><span>Galaxy AI</span></div>
            <p>Intelligence for everyone.</p>
          </div>
          <nav className="lp-footer-links" aria-label="Footer">
            <button onClick={() => jump("features")}>Features</button>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate("/privacy"); window.scrollTo(0, 0); }}>Privacy</a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); navigate("/terms"); window.scrollTo(0, 0); }}>Terms</a>
            <a href="https://github.com/mehergalaxy001-hue/Your-AI/issues" target="_blank" rel="noopener noreferrer">Contact</a>
          </nav>
        </div>
        <div className="lp-container lp-copy">© 2026 Galaxy AI</div>
      </footer>
    </div>
  );
}
