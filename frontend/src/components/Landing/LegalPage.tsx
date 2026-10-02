import { useEffect, type ReactNode } from "react";
import { navigate } from "../../lib/router";
import { useAuth } from "../../context/AuthContext";
import { PublicFooter, PublicHeader } from "./Landing";
import "./landing.css";

const CONTACT_URL = "https://github.com/mehergalaxy001-hue/Your-AI/issues";
const UPDATED = "October 2, 2026";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="lg-section" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      {children}
    </section>
  );
}

function Privacy() {
  return (
    <>
      <Section id="intro" title="1. About this policy">
        <p>
          Galaxy AI provides AI-powered conversation, web search, image and video creation, file and image analysis, and related features. This policy explains what
          information the app handles, where it goes, and the choices you have. It describes how the app actually works today.
        </p>
      </Section>

      <Section id="collect" title="2. Information we handle">
        <h3>Account information</h3>
        <p>When you sign in, Firebase Authentication provides your name (display name), email address, profile photo URL (for Google accounts), and a unique user ID. We use the user ID to keep your data separate from other users.</p>
        <h3>Authentication information</h3>
        <p>Sign-in is handled entirely by Firebase Authentication. Galaxy AI never receives or stores your password. Firebase keeps your signed-in session in your browser and issues short-lived ID tokens that our server verifies on each AI request.</p>
        <h3>Content you provide</h3>
        <p>The messages you write, prompts for images and videos, and your settings (such as theme and model choice).</p>
        <h3>Uploaded files, images and documents</h3>
        <p>Images, videos, PDFs and text files you attach to a message, and images you upload as the starting frame for a video.</p>
        <h3>Technical information</h3>
        <p>Our server temporarily uses your IP address in memory to apply rate limits, and writes short error messages to server logs (for example, that a provider returned a rate-limit error) for troubleshooting. Chat content is not written to these logs.</p>
        <p>We don't use analytics, advertising or tracking services, and we don't sell your information.</p>
      </Section>

      <Section id="use" title="3. How we use information">
        <ul>
          <li>To provide the service and respond to your requests.</li>
          <li>To authenticate you and keep your account secure.</li>
          <li>To keep your conversations, creations and settings available to you.</li>
          <li>To keep the service reliable, prevent abuse (through rate limits), and troubleshoot problems.</li>
        </ul>
        <p>Galaxy AI does not use your content to train its own models.</p>
      </Section>

      <Section id="ai" title="4. How AI requests work">
        <p className="lg-callout">
          To answer you, Galaxy AI sends your message — together with recent messages from the same conversation and any files or images you attached — through our
          server to the AI provider configured for that feature. The provider processes it and returns the response.
        </p>
        <ul>
          <li><strong>Chat, file and image analysis, and web search</strong> are processed by Google Gemini. When you turn on web search for a message, Gemini may search the web with Google Search to answer it and returns the sources it used.</li>
          <li><strong>Image creation</strong> sends your image prompt to Pollinations.ai, which generates the image.</li>
          <li><strong>Video creation</strong> sends your prompt (and starting image, if provided) to Google Veo through the Gemini API.</li>
        </ul>
        <p>
          Each provider handles data under its own terms and privacy policy. Depending on the provider and plan, a provider may retain or use submitted content as described
          in its terms — for example, Google's Gemini API terms allow Google to use content submitted through unpaid services to improve its products. Please don't submit
          sensitive information you aren't comfortable sharing with these providers.
        </p>
      </Section>

      <Section id="files" title="5. Uploaded files and images">
        <p>
          Files and images you attach are read in your browser and sent with your request so the AI can analyze them. Our server passes them to the AI provider and does not
          keep a copy. A copy stays with the conversation in your browser's storage on your device (large files may be dropped from local storage if it fills up).
        </p>
      </Section>

      <Section id="auth" title="6. Firebase Authentication">
        <p>
          Galaxy AI uses Firebase Authentication (a Google service) to sign you in with Google or with an email address and password. Firebase processes your sign-in details
          under Google's terms. Password resets are sent by Firebase to your email address.
        </p>
      </Section>

      <Section id="services" title="7. Third-party services we use">
        <ul>
          <li><strong>Firebase Authentication (Google)</strong> — account sign-in.</li>
          <li><strong>Google Gemini API</strong> — conversations, file and image analysis, web search grounding, and video creation (Veo).</li>
          <li><strong>Pollinations.ai</strong> — image creation.</li>
        </ul>
        <p>We don't use maps, analytics or advertising providers.</p>
      </Section>

      <Section id="retention" title="8. How long data is kept">
        <ul>
          <li><strong>Conversations, settings and your creation history</strong> are stored in your browser on your device, separated by account. They stay until you delete them or clear your browser data.</li>
          <li><strong>Generated images and videos</strong> are stored on our server in a folder linked to your account and are deleted automatically after about 72 hours, or sooner when you delete them.</li>
          <li><strong>Video generation jobs</strong> (status only) are kept in server memory for up to 24 hours.</li>
          <li><strong>Rate-limit counters</strong> are kept in memory for about a minute.</li>
          <li><strong>Your account</strong> remains with Firebase Authentication until it is deleted.</li>
        </ul>
      </Section>

      <Section id="security" title="9. Security">
        <ul>
          <li>Sign-in is handled by Firebase Authentication; passwords never reach Galaxy AI.</li>
          <li>Our server verifies a Firebase ID token before handling AI requests and keeps each user's generated files separate.</li>
          <li>AI provider keys are kept on the server and are never sent to your browser.</li>
          <li>Requests to Firebase and AI providers use HTTPS/TLS. The website should always be accessed over HTTPS in production.</li>
          <li>Requests are validated and size-limited, and uploaded images are checked by file type.</li>
        </ul>
        <p>No system is perfectly secure, but we work to protect the information the app handles.</p>
      </Section>

      <Section id="choices" title="10. Your choices and controls">
        <ul>
          <li>Delete individual conversations, clear a conversation, or delete all conversations from the app.</li>
          <li>Delete generated images and videos from Images or the Library.</li>
          <li>Remove attachments before sending a message.</li>
          <li>Sign out at any time from the account menu.</li>
          <li>To ask about your data or request account deletion, contact us (see below).</li>
        </ul>
      </Section>

      <Section id="children" title="11. Children">
        <p>Galaxy AI is not intended for children under 13, and we don't knowingly collect information from them. Some sign-in providers may require users to be older.</p>
      </Section>

      <Section id="changes" title="12. Changes to this policy">
        <p>We may update this policy as Galaxy AI changes. When we do, we'll update the "Last updated" date at the top of this page.</p>
      </Section>

      <Section id="contact" title="13. Contact">
        <p>
          Questions or requests? Open an issue on the Galaxy AI project page:{" "}
          <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">github.com/mehergalaxy001-hue/Your-AI/issues</a>.
        </p>
      </Section>
    </>
  );
}

function Terms() {
  return (
    <>
      <Section id="intro" title="1. Introduction">
        <p>These terms describe the rules for using Galaxy AI. By creating an account or using the service, you agree to them. They're written in plain language and aren't legal advice.</p>
      </Section>
      <Section id="acceptable" title="2. Acceptable use">
        <p>Use Galaxy AI lawfully and respectfully. Don't attempt to disrupt the service, bypass its limits, or access other users' data.</p>
      </Section>
      <Section id="accounts" title="3. User accounts">
        <p>You sign in with Google or with an email and password through Firebase Authentication. Keep your sign-in details secure; you're responsible for activity on your account.</p>
      </Section>
      <Section id="ai" title="4. AI-generated content">
        <p>
          Responses, images and videos are generated by AI and can be inaccurate, incomplete or unexpected. Check important information before relying on it — especially for
          health, finance, law, safety, or other high-impact decisions. AI output isn't professional advice.
        </p>
      </Section>
      <Section id="responsibilities" title="5. Your responsibilities">
        <p>You're responsible for the content you submit and how you use the results. Only upload content you have the right to share, and avoid submitting sensitive personal information.</p>
      </Section>
      <Section id="third-party" title="6. Third-party services">
        <p>Galaxy AI relies on third-party services — Firebase Authentication, Google Gemini (including Veo), and Pollinations.ai. Your use of those features is also subject to those providers' terms.</p>
      </Section>
      <Section id="availability" title="7. Service availability">
        <p>Features depend on third-party providers and their quotas, and may be limited, slow or unavailable at times. We may change rate limits to keep the service reliable.</p>
      </Section>
      <Section id="ip" title="8. Intellectual property">
        <p>You keep the rights you have to the content you submit. The Galaxy AI name, logo and interface belong to Galaxy AI. Rights in AI-generated output may also depend on the provider's terms and applicable law.</p>
      </Section>
      <Section id="prohibited" title="9. Prohibited use">
        <ul>
          <li>Creating illegal, hateful, harassing, sexually explicit or otherwise harmful content.</li>
          <li>Infringing others' intellectual property or privacy.</li>
          <li>Generating malware, spam, or content intended to deceive or defraud.</li>
          <li>Automated or excessive use intended to overload the service.</li>
        </ul>
      </Section>
      <Section id="changes" title="10. Changes to the service">
        <p>We may add, change or remove features over time, and may update these terms. We'll update the date at the top when we do.</p>
      </Section>
      <Section id="termination" title="11. Termination">
        <p>You can stop using Galaxy AI at any time. We may suspend or end access for accounts that break these terms or put the service or other users at risk.</p>
      </Section>
      <Section id="contact" title="12. Contact">
        <p>
          Questions about these terms? Open an issue on the project page:{" "}
          <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">github.com/mehergalaxy001-hue/Your-AI/issues</a>.
        </p>
      </Section>
    </>
  );
}

/** Privacy Policy and Terms of Service pages, sharing the public header/footer. */
export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { user } = useAuth();
  useEffect(() => {
    document.title = `${kind === "privacy" ? "Privacy Policy" : "Terms of Service"} · Galaxy AI`;
    document.body.classList.add("lp-body");
    return () => document.body.classList.remove("lp-body");
  }, [kind]);

  return (
    <div className="lp">
      <div className="lp-bg" aria-hidden><span className="lp-orb a" /></div>
      <a className="lp-skip" href="#main">Skip to content</a>
      <PublicHeader signedIn={!!user} />
      <main id="main" className="lp-container lg">
        <header className="lg-head">
          <span className="lp-kicker">Legal</span>
          <h1>{kind === "privacy" ? "Privacy Policy" : "Terms of Service"}</h1>
          <p className="lg-date">Last updated: {UPDATED}</p>
          <div className="lg-switch">
            <a href="/privacy" aria-current={kind === "privacy" ? "page" : undefined} onClick={(e) => { e.preventDefault(); navigate("/privacy"); window.scrollTo(0, 0); }}>Privacy Policy</a>
            <a href="/terms" aria-current={kind === "terms" ? "page" : undefined} onClick={(e) => { e.preventDefault(); navigate("/terms"); window.scrollTo(0, 0); }}>Terms of Service</a>
          </div>
        </header>
        <article className="lg-body glass">{kind === "privacy" ? <Privacy /> : <Terms />}</article>
      </main>
      <PublicFooter />
    </div>
  );
}
