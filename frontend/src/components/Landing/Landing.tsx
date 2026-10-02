import { useEffect, useRef, useState, type ReactNode } from "react";
import { navigate } from "../../lib/router";
import {
  BookIcon, CheckIcon, CodeIcon, FileIcon, GlobeIcon, LibraryIcon, Logo, MenuIcon, MicIcon, PhotoIcon, SearchIcon, SparkleIcon, VideoIcon, XIcon,
} from "../UI/Icons";
import "./landing.css";

type IconC = (p: { width?: number; height?: number }) => ReactNode;
const svg = (d: ReactNode): IconC => (p) => (
  <svg width={p.width ?? 20} height={p.height ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
const ChatIcon = svg(<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />);
const EyeIcon = svg(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>);
const ShieldIcon = svg(<path d="M12 3 4 6v6c0 5 3.4 8.6 8 9 4.6-.4 8-4 8-9V6l-8-3Z" />);
const LockIcon = svg(<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>);
const ListIcon = svg(<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />);
const SlidersIcon = svg(<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" />);
const LayersIcon = svg(<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />);
const UserIcon = svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
const CompassIcon = svg(<><circle cx="12" cy="12" r="10" /><path d="m16 8-2 6-6 2 2-6 6-2Z" /></>);
const MinimalIcon = svg(<><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18" /></>);

const CONTACT_URL = "https://github.com/mehergalaxy001-hue/Your-AI/issues";

const FIT = [
  { icon: ChatIcon, title: "Everyday help", text: "Get help with questions, ideas, writing, learning, planning, coding, and everyday tasks." },
  { icon: SparkleIcon, title: "Creative work", text: "Turn your ideas into images and other creative content with supported AI tools." },
  { icon: FileIcon, title: "Files & information", text: "Work with files, documents, images, and information in one place." },
];

/** Only features that exist in the app today. */
const FEATURES: { icon: IconC; title: string; text: string }[] = [
  { icon: ChatIcon, title: "Conversations", text: "Have natural conversations, explore ideas, solve problems, write, learn, and plan with Galaxy AI." },
  { icon: GlobeIcon, title: "Web search", text: "Find current information from the web and explore the sources behind the answer when up-to-date information matters." },
  { icon: SparkleIcon, title: "Image creation", text: "Turn your ideas into visuals with AI-powered image creation." },
  { icon: BookIcon, title: "Document analysis", text: "Upload supported documents and ask questions about their content, structure, tables, and information." },
  { icon: EyeIcon, title: "Image understanding", text: "Upload an image and ask Galaxy AI to explain, analyze, or understand what you see." },
  { icon: VideoIcon, title: "Video creation", text: "Create short videos from a prompt or a starting image when a video model is available." },
  { icon: MicIcon, title: "Voice input", text: "Speak instead of typing. Your words appear in the message box, ready to edit and send." },
  { icon: LibraryIcon, title: "Library", text: "Keep important conversations and generated content organized in one place." },
];

const TOOLS: { icon: IconC; name: string; text: string }[] = [
  { icon: ChatIcon, name: "Chat", text: "Streaming answers, editable messages, regenerate and copy." },
  { icon: SearchIcon, name: "Web search", text: "Answers grounded in the live web, with sources." },
  { icon: PhotoIcon, name: "Images", text: "Create images from text and browse your gallery." },
  { icon: FileIcon, name: "Files", text: "Attach PDFs, text, CSV and JSON files to a message." },
  { icon: BookIcon, name: "PDF analysis", text: "Summarize, question and pull details from PDFs." },
  { icon: VideoIcon, name: "Video", text: "Prompt or image to video, where supported." },
  { icon: LibraryIcon, name: "Library", text: "Your saved images, videos and uploads, together." },
  { icon: CodeIcon, name: "Code", text: "Highlighted code blocks with one-click copy." },
];

const STEPS = [
  { n: "01", title: "Ask", text: "Start with a question, idea, file, image, or task." },
  { n: "02", title: "Explore", text: "Search, analyze, compare, and understand information." },
  { n: "03", title: "Create", text: "Turn ideas into useful text, images, and creative work." },
  { n: "04", title: "Move forward", text: "Save what matters and take the next step." },
];

const EXPERIENCE = [
  { icon: MinimalIcon, title: "Simple by design", text: "A clean interface that stays out of your way." },
  { icon: LayersIcon, title: "Everything together", text: "Multiple AI capabilities brought together in one workspace." },
  { icon: UserIcon, title: "Made around you", text: "Your conversations and workspace are organized around your needs." },
  { icon: CompassIcon, title: "For every day", text: "Use Galaxy AI for learning, work, creativity, planning, research, and everyday tasks." },
];

const SECURITY = [
  { icon: LockIcon, title: "Secure sign-in", text: "Your account is protected by Firebase Authentication with Google or email sign-in. Galaxy AI never sees your password." },
  { icon: ListIcon, title: "Clear about data", text: "Our Privacy Policy explains what the app stores, where it's stored, and why — in plain language." },
  { icon: ShieldIcon, title: "Encrypted connections", text: "Requests to Firebase and our AI providers travel over HTTPS/TLS, and AI provider keys stay on our server." },
  { icon: SlidersIcon, title: "You're in control", text: "Delete chats, remove generated images and videos, and sign out whenever you like." },
];

/** Fade sections in as they enter the viewport (disabled for reduced motion via CSS). */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>(".reveal");
    if (!els) return;
    if (!("IntersectionObserver" in window)) return els.forEach((e) => e.classList.add("in"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return ref;
}

export function PublicHeader({ signedIn, onJump }: { signedIn: boolean; onJump?: (id: string) => void }) {
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [menu]);

  const go = (id: string) => {
    setMenu(false);
    if (onJump) onJump(id);
    else navigate(`/#${id}`);
  };
  const route = (to: string) => {
    setMenu(false);
    navigate(to);
    window.scrollTo(0, 0);
  };

  const links = (
    <>
      <button onClick={() => go("features")}>Features</button>
      <button onClick={() => go("tools")}>AI Tools</button>
      <button onClick={() => go("security")}>Security</button>
      <a href="/privacy" onClick={(e) => { e.preventDefault(); route("/privacy"); }}>Privacy</a>
    </>
  );
  const actions = signedIn ? (
    <button className="lp-btn primary sm" onClick={() => route("/app")}>Open Galaxy AI</button>
  ) : (
    <>
      <button className="lp-btn ghost sm" onClick={() => route("/login")}>Log in</button>
      <button className="lp-btn outline sm lp-hide-md" onClick={() => route("/signup")}>Sign up</button>
      <button className="lp-btn primary sm" onClick={() => route("/signup")}>Get Started</button>
    </>
  );

  return (
    <header className={`lp-header ${scrolled || menu ? "scrolled" : ""}`}>
      <div className="lp-container lp-header-row">
        <a className="lp-brand" href="/" onClick={(e) => { e.preventDefault(); setMenu(false); navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Galaxy AI home">
          <Logo size={30} />
          <span>Galaxy AI</span>
        </a>
        <nav className="lp-nav" aria-label="Primary">{links}</nav>
        <div className="lp-header-actions">{actions}</div>
        <button className="lp-menu-btn" onClick={() => setMenu((m) => !m)} aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} aria-controls="lp-drawer">
          {menu ? <XIcon /> : <MenuIcon />}
        </button>
      </div>
      {menu && (
        <div className="lp-drawer" id="lp-drawer">
          <nav aria-label="Primary">{links}</nav>
          <div className="lp-drawer-actions">{actions}</div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter({ onJump }: { onJump?: (id: string) => void }) {
  const go = (id: string) => (onJump ? onJump(id) : navigate(`/#${id}`));
  const route = (to: string) => {
    navigate(to);
    window.scrollTo(0, 0);
  };
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-grid">
        <div className="lp-footer-brand">
          <div className="lp-brand"><Logo size={28} /><span>Galaxy AI</span></div>
          <p>Your intelligent workspace for thinking, creating, searching, and getting things done.</p>
        </div>
        <nav aria-label="Product">
          <h3>Product</h3>
          <button onClick={() => go("features")}>Features</button>
          <button onClick={() => go("tools")}>AI Tools</button>
          <button onClick={() => go("tools")}>Library</button>
        </nav>
        <nav aria-label="Company">
          <h3>Company</h3>
          <button onClick={() => go("about")}>About</button>
          <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">Contact</a>
        </nav>
        <nav aria-label="Legal">
          <h3>Legal</h3>
          <a href="/privacy" onClick={(e) => { e.preventDefault(); route("/privacy"); }}>Privacy Policy</a>
          <a href="/terms" onClick={(e) => { e.preventDefault(); route("/terms"); }}>Terms of Service</a>
        </nav>
      </div>
      <div className="lp-container lp-footer-bottom">
        <span>© 2026 Galaxy AI. All rights reserved.</span>
        <span>Galaxy AI can make mistakes. Please check again.</span>
      </div>
    </footer>
  );
}

/** Abstract preview of the real workspace: Ask → Create → Discover → Get things done. */
function WorkspaceVisual() {
  return (
    <div className="lp-window glass" aria-hidden>
      <div className="lp-window-bar"><i /><i /><i /><span>Galaxy AI</span></div>
      <div className="lp-window-body">
        <aside className="lp-window-side">
          <span className="on"><ChatIcon width={14} height={14} /> Chat</span>
          <span><SearchIcon width={14} height={14} /> Search</span>
          <span><PhotoIcon width={14} height={14} /> Images</span>
          <span><FileIcon width={14} height={14} /> Files</span>
          <span><LibraryIcon width={14} height={14} /> Library</span>
        </aside>
        <div className="lp-window-main">
          <div className="lp-bubble user">Summarize this report and suggest a cover image</div>
          <div className="lp-bubble ai">
            <Logo size={20} />
            <div className="lp-lines"><i /><i /><i className="short" /></div>
          </div>
          <div className="lp-chips">
            <span><FileIcon width={12} height={12} /> report.pdf</span>
            <span><GlobeIcon width={12} height={12} /> 3 sources</span>
            <span><SparkleIcon width={12} height={12} /> Image</span>
          </div>
        </div>
      </div>
      <ol className="lp-flow">
        <li>Ask</li><li>Create</li><li>Discover</li><li>Get things done</li>
      </ol>
    </div>
  );
}

export function Landing({ signedIn }: { signedIn: boolean }) {
  const ref = useReveal();

  useEffect(() => {
    document.title = "Galaxy AI — One AI workspace";
    document.body.classList.add("lp-body");
    const id = window.location.hash.slice(1);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => document.body.classList.remove("lp-body");
  }, []);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `/#${id}`);
  };
  const start = () => navigate(signedIn ? "/app" : "/signup");
  const open = () => navigate(signedIn ? "/app" : "/login");

  return (
    <div className="lp" ref={ref}>
      <div className="lp-bg" aria-hidden><span className="lp-orb a" /><span className="lp-orb b" /><span className="lp-stars" /></div>
      <a className="lp-skip" href="#main">Skip to content</a>
      <PublicHeader signedIn={signedIn} onJump={jump} />

      <main id="main">
        {/* Hero */}
        <section className="lp-hero lp-container" aria-labelledby="hero-title">
          <div className="lp-hero-copy">
            <span className="lp-badge reveal"><SparkleIcon width={14} height={14} /> Meet Galaxy AI</span>
            <h1 id="hero-title" className="reveal">One AI workspace.<br /><span className="lp-grad">A galaxy of possibilities.</span></h1>
            <p className="lp-lead reveal">
              Think, create, search, analyze, and get things done with Galaxy AI — your intelligent workspace for everyday questions, ideas, files, images, and more.
            </p>
            <div className="lp-cta reveal">
              <button className="lp-btn primary lg" onClick={start}>{signedIn ? "Open Galaxy AI" : "Start with Galaxy AI"}</button>
              <button className="lp-btn glass lg" onClick={() => jump("workspace")}>Explore Galaxy AI</button>
            </div>
            <p className="lp-trust reveal"><CheckIcon width={14} height={14} /> Simple to use. Powerful when you need it.</p>
          </div>
          <div className="lp-hero-visual reveal" aria-hidden>
            <div className="lp-planet">
              <span className="ring r1" /><span className="ring r2" /><span className="core" />
              <img src="/galaxy-logo.png" alt="" className="lp-planet-logo" width={160} height={160} decoding="async" />
            </div>
          </div>
        </section>

        {/* Workspace */}
        <section id="workspace" className="lp-section lp-container" aria-labelledby="fit-title">
          <div className="lp-split">
            <div className="lp-section-head left reveal">
              <span className="lp-kicker">The workspace</span>
              <h2 id="fit-title">AI that fits the way you work.</h2>
              <p>From a quick question to a complex project, Galaxy AI brings the tools you need into one simple workspace.</p>
            </div>
            <div className="reveal"><WorkspaceVisual /></div>
          </div>
          <div className="lp-grid three">
            {FIT.map(({ icon: Icon, title, text }, i) => (
              <article key={title} className="lp-card glass reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="lp-icon"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="lp-section lp-container" aria-labelledby="features-title">
          <div className="lp-section-head reveal">
            <span className="lp-kicker">Features</span>
            <h2 id="features-title">Everything you need. Right where you need it.</h2>
          </div>
          <div className="lp-grid four">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <article key={title} className="lp-card glass reveal" style={{ transitionDelay: `${(i % 4) * 60}ms` }}>
                <span className="lp-icon"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* AI tools */}
        <section id="tools" className="lp-section lp-container" aria-labelledby="tools-title">
          <div className="lp-section-head reveal">
            <span className="lp-kicker">AI Tools</span>
            <h2 id="tools-title">Pick a tool and start.</h2>
            <p>{signedIn ? "Jump straight into your workspace." : "Choose a tool — you'll sign in first, then land right in your workspace."}</p>
          </div>
          <div className="lp-grid four tools">
            {TOOLS.map(({ icon: Icon, name, text }) => (
              <button key={name} className="lp-tool glass reveal" onClick={open} aria-label={`Open ${name} in Galaxy AI`}>
                <span className="lp-icon sm"><Icon width={18} height={18} /></span>
                <span className="lp-tool-text"><strong>{name}</strong><span>{text}</span></span>
                <span className="lp-tool-arrow" aria-hidden>→</span>
              </button>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section className="lp-section lp-container" aria-labelledby="flow-title">
          <div className="lp-section-head reveal">
            <span className="lp-kicker">How it works</span>
            <h2 id="flow-title">From an idea to something real.</h2>
          </div>
          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <li key={s.n} className="lp-step reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="lp-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Experience / About */}
        <section id="about" className="lp-section lp-container" aria-labelledby="about-title">
          <div className="lp-section-head reveal">
            <span className="lp-kicker">About</span>
            <h2 id="about-title">Built around your experience.</h2>
          </div>
          <div className="lp-grid four">
            {EXPERIENCE.map(({ icon: Icon, title, text }, i) => (
              <article key={title} className="lp-card plain reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                <span className="lp-icon"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Security */}
        <section id="security" className="lp-section lp-container" aria-labelledby="security-title">
          <div className="lp-security glass reveal">
            <div className="lp-section-head left">
              <span className="lp-kicker">Security & privacy</span>
              <h2 id="security-title">Your conversations deserve privacy.</h2>
              <p>
                Galaxy AI is designed with privacy and security in mind. We aim to collect only what is necessary to provide the service and give you control over
                your account and content.
              </p>
              <a className="lp-btn glass md" href="/privacy" onClick={(e) => { e.preventDefault(); navigate("/privacy"); window.scrollTo(0, 0); }}>
                Read our Privacy Policy
              </a>
            </div>
            <div className="lp-grid two">
              {SECURITY.map(({ icon: Icon, title, text }) => (
                <article key={title} className="lp-card plain">
                  <span className="lp-icon"><Icon /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="lp-section tight lp-container" aria-labelledby="control-title">
          <div className="lp-note reveal">
            <span className="lp-icon"><ShieldIcon /></span>
            <div>
              <h2 id="control-title">AI can help. You stay in control.</h2>
              <p>Galaxy AI can make mistakes. Check important information before relying on it, especially for decisions involving health, finance, law, safety, or other high-impact situations.</p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="lp-section lp-container" aria-labelledby="cta-title">
          <div className="lp-final glass reveal">
            <Logo size={56} />
            <h2 id="cta-title">Ready to explore your AI workspace?</h2>
            <p>Start a conversation, explore ideas, create something new, or simply ask Galaxy AI what it can help you with.</p>
            <div className="lp-cta center">
              <button className="lp-btn primary lg" onClick={start}>{signedIn ? "Open Galaxy AI" : "Get Started with Galaxy AI"}</button>
              <button className="lp-btn glass lg" onClick={() => jump("features")}>Learn More</button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter onJump={jump} />
    </div>
  );
}
