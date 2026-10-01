import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Attachment, Message, ServerConfig } from "./types";
import { useChats } from "./hooks/useChats";
import { useTheme } from "./hooks/useTheme";
import { ApiError, fetchConfig, streamChat, toWire } from "./lib/api";
import { uid } from "./lib/storage";
import { Sidebar } from "./components/Sidebar";
import { Composer } from "./components/Composer";
import { MessageItem } from "./components/MessageItem";
import { Welcome } from "./components/Welcome";
import { AlertIcon, ComposeIcon, Logo, MenuIcon, SidebarIcon } from "./components/Icons";

const MODEL_KEY = "yourai.model";
const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

const FALLBACK_LIMITS: ServerConfig["limits"] = {
  maxMessages: 60, maxMessageChars: 32_000, maxAttachments: 4, maxImageBytes: 4 * 1024 * 1024, maxTextFileChars: 100_000,
};

export default function App() {
  const { chats, active, activeId, setActiveId, createChat, appendMessages, patchMessage, renameChat, deleteChat, latest } = useChats();
  const { pref, setPref } = useTheme();
  const [cfg, setCfg] = useState<ServerConfig | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [model, setModel] = useState(() => localStorage.getItem(MODEL_KEY) ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [generating, setGenerating] = useState<{ chatId: string; msgId: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busy = useRef(false); // synchronous guard against double submits
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    fetchConfig()
      .then((c) => {
        setCfg(c);
        setModel((m) => (c.models.includes(m) ? m : c.defaultModel));
      })
      .catch((e: Error) => setCfgError(e.message));
  }, []);

  useEffect(() => {
    if (model) localStorage.setItem(MODEL_KEY, model);
  }, [model]);

  // Auto-scroll while the user is near the bottom.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [active?.messages]);

  useEffect(() => {
    stick.current = true;
  }, [activeId]);

  const limits = cfg?.limits ?? FALLBACK_LIMITS;

  const send = useCallback(
    async (text: string, attachments: Attachment[]) => {
      if (busy.current || !model) return;
      busy.current = true;

      const userMsg: Message = { id: uid(), role: "user", content: text, createdAt: Date.now(), ...(attachments.length ? { attachments } : {}) };
      const botMsg: Message = { id: uid(), role: "assistant", content: "", createdAt: Date.now(), model };

      let chatId = activeId;
      const history = chatId ? latest.current.find((c) => c.id === chatId)?.messages ?? [] : [];
      if (!chatId) {
        chatId = createChat(userMsg);
        appendMessages(chatId, botMsg);
      } else {
        appendMessages(chatId, userMsg, botMsg);
      }
      const id = chatId;
      stick.current = true;
      if (isMobile()) setSidebarOpen(false);

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setGenerating({ chatId: id, msgId: botMsg.id });

      try {
        await streamChat({
          model,
          messages: toWire([...history, userMsg], limits.maxMessages),
          signal: ctrl.signal,
          onDelta: (d) => patchMessage(id, botMsg.id, (m) => ({ ...m, content: m.content + d })),
        });
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          patchMessage(id, botMsg.id, (m) => ({ ...m, stopped: true }));
        } else {
          const msg = e instanceof ApiError ? e.message : "Something went wrong. Please try again.";
          patchMessage(id, botMsg.id, (m) => ({ ...m, error: msg }));
          if (e instanceof ApiError && e.code === "missing_api_key") setCfg((c) => (c ? { ...c, configured: false } : c));
        }
      } finally {
        abortRef.current = null;
        busy.current = false;
        setGenerating(null);
      }
    },
    [activeId, model, limits.maxMessages, createChat, appendMessages, patchMessage, latest],
  );

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    if (generating) stop();
    setActiveId(null);
    if (isMobile()) setSidebarOpen(false);
  };

  const notConfigured = cfg && !cfg.configured;

  return (
    <div className={`app ${sidebarOpen ? "with-sidebar" : ""}`}>
      <Sidebar
        chats={chats}
        activeId={activeId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => {
          setActiveId(id);
          if (isMobile()) setSidebarOpen(false);
        }}
        onNew={newChat}
        onRename={renameChat}
        onDelete={(id) => {
          if (generating?.chatId === id) stop();
          deleteChat(id);
        }}
        theme={pref}
        onTheme={setPref}
      />

      <main className="main">
        <header className="topbar">
          {!sidebarOpen && (
            <>
              <button className="icon-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" title="Open sidebar">
                <span className="only-desktop"><SidebarIcon /></span>
                <span className="only-mobile"><MenuIcon /></span>
              </button>
              <button className="icon-btn" onClick={newChat} aria-label="New chat" title="New chat">
                <ComposeIcon />
              </button>
            </>
          )}
          <label className="model-picker">
            <span className="sr-only">Model</span>
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={!cfg || !!generating} aria-label="Model">
              {(cfg?.models ?? (model ? [model] : [])).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <div className="topbar-title only-mobile">
            <Logo size={22} /> Your-AI
          </div>
        </header>

        {(notConfigured || cfgError) && (
          <div className="setup-banner" role="alert">
            <AlertIcon width={18} height={18} />
            <div>
              {cfgError ? (
                <><strong>Backend unreachable.</strong> {cfgError} Start it with <code>npm run dev</code>.</>
              ) : (
                <><strong>Setup required:</strong> <code>OPENAI_API_KEY</code> is not configured. Copy <code>.env.example</code> to <code>.env</code>, add your key, and restart the server.</>
              )}
            </div>
          </div>
        )}

        <div
          className="scroller"
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {active ? (
            <div className="thread">
              {active.messages.map((m) => (
                <MessageItem key={m.id} message={m} streaming={generating?.msgId === m.id} />
              ))}
            </div>
          ) : (
            <Welcome onPick={(p) => send(p, [])} />
          )}
        </div>

        <Composer
          generating={!!generating}
          disabled={!!notConfigured || !!cfgError || !model}
          maxChars={limits.maxMessageChars}
          maxAttachments={limits.maxAttachments}
          limits={limits}
          onSend={send}
          onStop={stop}
        />
      </main>
    </div>
  );
}
