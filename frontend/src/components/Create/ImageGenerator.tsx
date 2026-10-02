import { useEffect, useRef, useState } from "react";
import type { AspectRatio, Creation, MediaConfig } from "../../types/media";
import { generateImage } from "../../services/imageGeneration";
import { MediaApiError } from "../../services/media";
import { AlertIcon } from "../UI/Icons";
import { MediaPreview } from "./MediaPreview";

type Caps = Extract<MediaConfig["image"], { available: true }>;

interface Props {
  caps: Caps;
  maxChars: number;
  current: Creation | null;
  onCreated: (c: Creation) => void;
  /** Prefill request from elsewhere (e.g. the composer's "Create image"). */
  request: { prompt?: string; nonce: number } | null;
  onDelete?: () => void;
  onToggleSave?: () => void;
}

const LABELS: Record<AspectRatio, string> = { square: "Square", portrait: "Portrait", landscape: "Landscape" };

export function ImageGenerator({ caps, maxChars, current, onCreated, request, onDelete, onToggleSave }: Props) {
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<AspectRatio>(caps.aspectRatios[0] ?? "square");
  const [quality, setQuality] = useState<"standard" | "high">(caps.qualities[0] ?? "standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastPrompt = useRef("");
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!request) return;
    if (request.prompt) setPrompt(request.prompt);
    requestAnimationFrame(() => promptRef.current?.focus());
  }, [request]);

  const run = async (p: string) => {
    const text = p.trim();
    if (loading) return;
    if (text.length < 3) {
      setError("Please describe the image you want to create.");
      return;
    }
    setLoading(true);
    setError(null);
    lastPrompt.current = text;
    try {
      const r = await generateImage(text, {
        aspectRatio: caps.aspectRatios.length ? aspect : undefined,
        quality: caps.qualities.length ? quality : undefined,
      });
      onCreated({ id: r.id, type: "image", prompt: text, createdAt: Date.now(), resultUrl: r.url, mime: r.mime });
    } catch (e) {
      setError(e instanceof MediaApiError ? e.message : "Image generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gen">
      <label className="gen-label" htmlFor="image-prompt">Prompt</label>
      <textarea
        id="image-prompt"
        ref={promptRef}
        className="gen-prompt"
        value={prompt}
        maxLength={maxChars}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run(prompt);
        }}
        placeholder="Describe the image you want to create..."
        rows={4}
        disabled={loading}
      />

      {(caps.aspectRatios.length > 1 || caps.qualities.length > 1) && (
        <div className="gen-options">
          {caps.aspectRatios.length > 1 && (
            <div className="gen-option">
              <span className="gen-label">Aspect ratio</span>
              <div className="segmented" role="radiogroup" aria-label="Aspect ratio">
                {caps.aspectRatios.map((a) => (
                  <button key={a} role="radio" aria-checked={aspect === a} className={aspect === a ? "on" : ""} onClick={() => setAspect(a)} disabled={loading}>
                    {LABELS[a]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {caps.qualities.length > 1 && (
            <div className="gen-option">
              <span className="gen-label">Quality</span>
              <div className="segmented" role="radiogroup" aria-label="Quality">
                {caps.qualities.map((q) => (
                  <button key={q} role="radio" aria-checked={quality === q} className={quality === q ? "on" : ""} onClick={() => setQuality(q)} disabled={loading}>
                    {q === "high" ? "High" : "Standard"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button className="btn primary gen-submit" onClick={() => void run(prompt)} disabled={loading || prompt.trim().length < 3}>
        {loading ? <><span className="spinner sm" aria-hidden /> Generating image...</> : "Generate Image"}
      </button>
      {caps.note && <p className="muted small gen-note">{caps.note}</p>}

      {error && (
        <div className="error-box" role="alert">
          <AlertIcon width={16} height={16} />
          <div><span>{error}</span></div>
        </div>
      )}

      {loading && (
        <div className="gen-loading" role="status" aria-live="polite">
          <div className="indeterminate"><span /></div>
          <span>Generating image...</span>
        </div>
      )}

      {!loading && current && <MediaPreview creation={current} busy={loading} onGenerateAgain={() => void run(current.prompt)} onDelete={onDelete} onToggleSave={onToggleSave} />}
    </div>
  );
}
