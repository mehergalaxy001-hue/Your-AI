import { useCallback, useEffect, useState } from "react";
import type { Creation, CreationType, MediaConfig } from "../../types/media";
import { fetchMediaConfig } from "../../services/media";
import { useCreations } from "../../hooks/useCreations";
import { AlertIcon, MenuIcon, SidebarIcon } from "../UI/Icons";
import { CreationHistory } from "./CreationHistory";
import { ImageGenerator } from "./ImageGenerator";
import { VideoGenerator } from "./VideoGenerator";

interface Props {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
}

/** Image / video creation workspace. Kept mounted while hidden so running jobs keep polling. */
export function CreateView({ sidebarOpen, onOpenSidebar }: Props) {
  const [mode, setMode] = useState<CreationType>("image");
  const [cfg, setCfg] = useState<MediaConfig | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const { items, add, remove } = useCreations();
  const [current, setCurrent] = useState<Record<CreationType, Creation | null>>({ image: null, video: null });

  useEffect(() => {
    fetchMediaConfig().then(setCfg, (e: Error) => setCfgError(e.message));
  }, []);

  const onCreated = useCallback(
    (c: Creation) => {
      add(c);
      setCurrent((s) => ({ ...s, [c.type]: c }));
    },
    [add],
  );

  const open = useCallback((c: Creation) => {
    setMode(c.type);
    setCurrent((s) => ({ ...s, [c.type]: c }));
  }, []);

  const unavailable = (what: string) => (
    <div className="setup-banner static" role="alert">
      <AlertIcon width={18} height={18} />
      <div>{what} generation is not configured on the server. See <code>.env.example</code> for the provider settings.</div>
    </div>
  );

  return (
    <main className="main create">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-btn only-mobile" onClick={onOpenSidebar} aria-label="Open menu">
            <MenuIcon />
          </button>
          {!sidebarOpen && (
            <button className="icon-btn only-desktop" onClick={onOpenSidebar} aria-label="Expand sidebar" title="Expand sidebar">
              <SidebarIcon />
            </button>
          )}
        </div>
        <h1 className="topbar-title">Create</h1>
        <div className="topbar-right" />
      </header>

      <div className="scroller">
        <div className="create-wrap">
          <div className="segmented mode-switch" role="tablist" aria-label="Creation type">
            {(["image", "video"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
                {m === "image" ? "Image" : "Video"}
              </button>
            ))}
          </div>

          {cfgError && (
            <div className="error-box" role="alert">
              <AlertIcon width={16} height={16} />
              <div><span>{cfgError}</span></div>
            </div>
          )}
          {!cfg && !cfgError && <div className="spinner" role="status" aria-label="Loading" />}

          {cfg && (
            <>
              <div hidden={mode !== "image"}>
                {cfg.image.available ? (
                  <ImageGenerator caps={cfg.image} maxChars={cfg.limits.maxPromptChars} current={current.image} onCreated={onCreated} />
                ) : (
                  unavailable("Image")
                )}
              </div>
              <div hidden={mode !== "video"}>
                {cfg.video.available ? (
                  <VideoGenerator
                    caps={cfg.video}
                    maxChars={cfg.limits.maxPromptChars}
                    maxUploadBytes={cfg.limits.maxUploadBytes}
                    current={current.video}
                    onCreated={onCreated}
                  />
                ) : (
                  unavailable("Video")
                )}
              </div>
            </>
          )}

          <CreationHistory items={items} activeId={current[mode]?.id ?? null} onOpen={open} onRemove={remove} />
        </div>
      </div>
    </main>
  );
}
