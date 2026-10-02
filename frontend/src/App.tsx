import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { useAuth } from "./context/AuthContext";
import type { Attachment, Limits, ServerConfig } from "./types";
import { useConversations } from "./hooks/useConversations";
import { useSettings } from "./hooks/useSettings";
import { useChatEngine } from "./hooks/useChatEngine";
import { fetchConfig } from "./services/api";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { ChatHeader } from "./components/Chat/ChatHeader";
import { ChatView } from "./components/Chat/ChatView";
import { Composer, type ComposerHandle } from "./components/Composer/Composer";
import { ConfirmDialog, type ConfirmRequest } from "./components/UI/Modal";
import { AlertIcon, Logo } from "./components/UI/Icons";
import { CreateView, type CreateRequest } from "./components/Create/CreateView";
import { LibraryView } from "./components/Library/LibraryView";
import { useCreations } from "./hooks/useCreations";

const SettingsModal = lazy(() => import("./components/Settings/SettingsModal"));

const FALLBACK_LIMITS: Limits = {
  maxMessages: 80, maxMessageChars: 32_000, maxTotalChars: 240_000, maxAttachments: 5,
  maxImageBytes: 5 * 1024 * 1024, maxPdfBytes: 10 * 1024 * 1024, maxVideoBytes: 15 * 1024 * 1024, maxTextFileChars: 120_000,
};
const mobileQuery = "(max-width: 768px)";
const isMobile = () => window.matchMedia(mobileQuery).matches;

export default function App({ user }: { user: User }) {
  const { signOut } = useAuth();
  const store = useConversations();
  const { settings, set } = useSettings();
  const [cfg, setCfg] = useState<ServerConfig | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [view, setView] = useState<"chat" | "images" | "library">("chat");
  const [createMounted, setCreateMounted] = useState(false);
  const [createRequest, setCreateRequest] = useState<CreateRequest | null>(null);
  const creations = useCreations();
  const composer = useRef<ComposerHandle>(null);

  const loadConfig = useCallback(() => {
    setCfgError(null);
    fetchConfig()
      .then((c) => {
        setCfg(c);
        if (!c.models.some((m) => m.id === settings.model)) set("model", c.defaultModel);
      })
      .catch((e: Error) => setCfgError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(loadConfig, [loadConfig]);

  // Close drawer when switching to mobile; reopen on desktop.
  useEffect(() => {
    const mq = window.matchMedia(mobileQuery);
    const onChange = () => setSidebarOpen(!mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const limits = cfg?.limits ?? FALLBACK_LIMITS;
  const onConfigError = useCallback((code: string) => {
    if (code === "missing_api_key") setCfg((c) => (c ? { ...c, configured: false } : c));
  }, []);
  const engine = useChatEngine(store, settings.model, limits, onConfigError);
  const { generating, stop } = engine;

  const closeOnMobile = useCallback(() => isMobile() && setSidebarOpen(false), []);

  const newChat = useCallback(() => {
    setView("chat");
    store.setActiveId(null);
    closeOnMobile();
    requestAnimationFrame(() => composer.current?.focus());
  }, [store.setActiveId, closeOnMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        newChat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newChat]);

  const onSelect = useCallback(
    (id: string) => {
      setView("chat");
      store.setActiveId(id);
      closeOnMobile();
    },
    [store.setActiveId, closeOnMobile], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onDelete = useCallback(
    (id: string, title: string) =>
      setConfirm({
        title: "Delete conversation?",
        message: `“${title}” will be permanently deleted from this device.`,
        confirmLabel: "Delete",
        danger: true,
        onConfirm: () => {
          if (generating?.convId === id) stop();
          store.remove(id);
        },
      }),
    [generating, stop, store.remove], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onDeleteAll = useCallback(
    () =>
      setConfirm({
        title: "Delete all conversations?",
        message: "Every conversation stored in this browser will be permanently deleted. Consider exporting first.",
        confirmLabel: "Delete all",
        danger: true,
        onConfirm: () => {
          stop();
          store.removeAll();
        },
      }),
    [stop, store.removeAll], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const active = store.active;
  const onClear = useCallback(() => {
    if (!active) return;
    setConfirm({
      title: "Clear this conversation?",
      message: "All messages in this conversation will be removed. The conversation itself stays in your history.",
      confirmLabel: "Clear",
      danger: true,
      onConfirm: () => {
        if (generating?.convId === active.id) stop();
        store.clearMessages(active.id);
      },
    });
  }, [active, generating, stop, store.clearMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeId = store.activeId;
  const onRegenerate = useCallback((msgId: string) => activeId && engine.regenerate(activeId, msgId), [activeId, engine.regenerate]); // eslint-disable-line react-hooks/exhaustive-deps
  const onFeedback = useCallback(
    (msgId: string, value: "up" | "down" | undefined) => activeId && store.patchMessage(activeId, msgId, (m) => ({ ...m, feedback: value })),
    [activeId, store.patchMessage], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Editing an earlier user message: load it into the composer, then resend.
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => setEditingId(null), [activeId]);
  const onEdit = useCallback(
    (msgId: string) => {
      const msg = store.latest.current.find((c) => c.id === activeId)?.messages.find((m) => m.id === msgId);
      if (!msg) return;
      setEditingId(msgId);
      composer.current?.setText(msg.content);
    },
    [activeId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const onCancelEdit = useCallback(() => setEditingId(null), []);
  const onSend = useCallback(
    (text: string, attachments: Attachment[], opts: { webSearch?: boolean }) => {
      if (editingId && activeId) {
        engine.edit(activeId, editingId, text);
        setEditingId(null);
      } else {
        engine.send(text, attachments, opts);
      }
    },
    [editingId, activeId, engine.edit, engine.send], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const onModel = useCallback((id: string) => set("model", id), [set]);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openImages = useCallback(() => {
    setView("images");
    setCreateMounted(true);
    setCreateRequest({ mode: "image", nonce: Date.now() });
    closeOnMobile();
  }, [closeOnMobile]);
  const openLibrary = useCallback(() => {
    setView("library");
    closeOnMobile();
  }, [closeOnMobile]);
  // "+" → Create image: reuse the Images workspace, prefilled with the composer draft.
  const onCreateImage = useCallback((prompt: string) => {
    setView("images");
    setCreateMounted(true);
    setCreateRequest({ mode: "image", prompt, nonce: Date.now() });
  }, []);

  const notConfigured = !!cfg && !cfg.configured;
  const models = useMemo(() => cfg?.models ?? [], [cfg]);
  const title = active?.title ?? "New chat";

  useEffect(() => {
    document.title = active ? `${active.title} · Galaxy AI` : "Galaxy AI";
  }, [active?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cfg && !cfgError) {
    return (
      <div className="splash" role="status" aria-label="Loading Galaxy AI">
        <Logo size={48} />
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className={`app ${sidebarOpen ? "with-sidebar" : ""}`}>
      <a className="skip-link" href="#composer-input-area">Skip to message input</a>
      <Sidebar
        metas={store.metas}
        activeId={store.activeId}
        open={sidebarOpen}
        search={store.search}
        onClose={closeSidebar}
        onSelect={onSelect}
        onNew={newChat}
        onRename={store.rename}
        onDelete={onDelete}
        onDeleteAll={onDeleteAll}
        view={view}
        user={user}
        onSignOut={() => void signOut()}
        onSettings={openSettings}
        onImages={openImages}
        onLibrary={openLibrary}
      />

      {createMounted && (
        <div className="view" hidden={view !== "images"}>
          <CreateView sidebarOpen={sidebarOpen} onOpenSidebar={openSidebar} creations={creations} request={createRequest} />
        </div>
      )}
      {view === "library" && (
        <div className="view">
          <LibraryView
            sidebarOpen={sidebarOpen}
            onOpenSidebar={openSidebar}
            creations={creations.items}
            conversations={store.conversations}
            onOpenChat={onSelect}
            onRemoveCreation={creations.remove}
            onToggleSave={creations.setSaved}
          />
        </div>
      )}

      <main className="main" hidden={view !== "chat"}>
        <ChatHeader
          title={title}
          sidebarOpen={sidebarOpen}
          models={models}
          model={settings.model}
          modelDisabled={!!generating}
          canClear={!!active?.messages.length}
          onOpenSidebar={openSidebar}
          onNew={newChat}
          onModel={onModel}
          onClear={onClear}
          onSettings={openSettings}
        />

        {(notConfigured || cfgError) && (
          <div className="setup-banner" role="alert">
            <AlertIcon width={18} height={18} />
            <div>
              {cfgError ? (
                <>
                  <strong>Server unavailable.</strong> {cfgError}{" "}
                  <button className="link-btn" onClick={loadConfig}>Retry</button>
                </>
              ) : (
                <>
                  <strong>Setup required.</strong> No AI provider key is configured. Add <code>GEMINI_API_KEY</code> (or <code>OPENAI_API_KEY</code>) to
                  <code>.env</code> and restart the server.
                </>
              )}
            </div>
          </div>
        )}

        <ChatView
          conversation={active}
          streamingId={generating?.msgId ?? null}
          busy={!!generating}
          models={models}
          editingId={editingId}
          onEdit={onEdit}
          onRegenerate={onRegenerate}
          onFeedback={onFeedback}
        />

        <div id="composer-input-area">
          <Composer
            ref={composer}
            generating={!!generating}
            disabled={notConfigured || !!cfgError || !settings.model}
            disabledReason={notConfigured ? "Add an API key to start chatting" : cfgError ? "Server unavailable" : undefined}
            enterToSend={settings.enterToSend}
            limits={limits}
            onSend={onSend}
            onCreateImage={onCreateImage}
            onStop={stop}
            editing={!!editingId}
            onCancelEdit={onCancelEdit}
          />
        </div>
      </main>

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            settings={settings}
            models={models}
            provider={cfg?.provider ?? null}
            onSet={set}
            onClose={() => setSettingsOpen(false)}
          />
        </Suspense>
      )}
      {confirm && <ConfirmDialog req={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
