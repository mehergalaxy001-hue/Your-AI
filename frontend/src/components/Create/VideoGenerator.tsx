import { useEffect, useRef, useState } from "react";
import type { AspectRatio, Creation, MediaConfig, VideoJob } from "../../types/media";
import { getVideoGenerationStatus, startVideoGeneration } from "../../services/videoGeneration";
import { MediaApiError } from "../../services/media";
import { AlertIcon } from "../UI/Icons";
import { ImageUpload } from "./ImageUpload";
import { MediaPreview } from "./MediaPreview";

type Caps = Extract<MediaConfig["video"], { available: true }>;
type Ratio = Exclude<AspectRatio, "square">;

interface Props {
  caps: Caps;
  maxChars: number;
  maxUploadBytes: number;
  current: Creation | null;
  onCreated: (c: Creation) => void;
}

const POLL_MS = 6000;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function VideoGenerator({ caps, maxChars, maxUploadBytes, current, onCreated }: Props) {
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<Ratio>(caps.aspectRatios[0] ?? "landscape");
  const [image, setImage] = useState<{ dataUrl: string; name: string; size: number } | null>(null);
  const [phase, setPhase] = useState<"idle" | "preparing" | "generating">("idle");
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const promptRef = useRef("");

  // Poll the job until it finishes. Keeps running while the Create view is hidden.
  useEffect(() => {
    if (!job || job.status === "succeeded" || job.status === "failed") return;
    const ctrl = new AbortController();
    let failures = 0;
    const t = window.setInterval(async () => {
      try {
        const next = await getVideoGenerationStatus(job.id, ctrl.signal);
        failures = 0;
        if (next.status === "succeeded" && next.result) {
          onCreated({ id: next.id, type: "video", prompt: promptRef.current, createdAt: Date.now(), resultUrl: next.result.url, mime: next.result.mime });
          setPhase("idle");
          setJob(null);
        } else if (next.status === "failed") {
          setError(next.error?.message ?? "Video generation failed. Please try again.");
          setPhase("idle");
          setJob(null);
        } else setJob(next);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (e instanceof MediaApiError && e.code === "job_not_found") {
          setError(e.message);
          setPhase("idle");
          setJob(null);
        } else if (++failures >= 5) {
          setError("Lost connection while checking the video status. Please try again.");
          setPhase("idle");
          setJob(null);
        }
      }
    }, POLL_MS);
    return () => {
      ctrl.abort();
      window.clearInterval(t);
    };
  }, [job, onCreated]);

  useEffect(() => {
    if (phase === "idle") return;
    const start = Date.now();
    setElapsed(0);
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [phase === "idle"]); // eslint-disable-line react-hooks/exhaustive-deps

  const busy = phase !== "idle";

  const run = async (p: string, img = image) => {
    const text = p.trim();
    if (busy) return;
    if (text.length < 3) {
      setError("Please describe the video you want to create.");
      return;
    }
    setError(null);
    setPhase("preparing");
    promptRef.current = text;
    try {
      const j = await startVideoGeneration(text, {
        aspectRatio: caps.aspectRatios.length ? aspect : undefined,
        image: caps.imageToVideo && img ? img.dataUrl : undefined,
      });
      setJob(j);
      setPhase("generating");
    } catch (e) {
      setError(e instanceof MediaApiError ? e.message : "Video generation failed. Please try again.");
      setPhase("idle");
    }
  };

  return (
    <div className="gen">
      <label className="gen-label" htmlFor="video-prompt">Prompt</label>
      <textarea
        id="video-prompt"
        className="gen-prompt"
        value={prompt}
        maxLength={maxChars}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run(prompt);
        }}
        placeholder="A cinematic spaceship flying through a futuristic galaxy city at night"
        rows={4}
        disabled={busy}
      />

      <div className="gen-options">
        {caps.aspectRatios.length > 1 && (
          <div className="gen-option">
            <span className="gen-label">Aspect ratio</span>
            <div className="segmented" role="radiogroup" aria-label="Aspect ratio">
              {caps.aspectRatios.map((a) => (
                <button key={a} role="radio" aria-checked={aspect === a} className={aspect === a ? "on" : ""} onClick={() => setAspect(a)} disabled={busy}>
                  {a === "landscape" ? "Landscape" : "Portrait"}
                </button>
              ))}
            </div>
          </div>
        )}
        {caps.imageToVideo && (
          <div className="gen-option">
            <span className="gen-label">Start image (optional)</span>
            <ImageUpload value={image} maxBytes={maxUploadBytes} disabled={busy} onChange={setImage} />
          </div>
        )}
      </div>

      <button className="btn primary gen-submit" onClick={() => void run(prompt)} disabled={busy || prompt.trim().length < 3}>
        {busy ? <><span className="spinner sm" aria-hidden /> Generating video...</> : "Generate Video"}
      </button>
      {caps.note && <p className="muted small gen-note">{caps.note}</p>}

      {error && (
        <div className="error-box" role="alert">
          <AlertIcon width={16} height={16} />
          <div><span>{error}</span></div>
        </div>
      )}

      {busy && (
        <div className="gen-loading" role="status" aria-live="polite">
          <ol className="steps" aria-label="Progress">
            <li className={phase === "preparing" ? "on" : "done"}>Preparing</li>
            <li className={phase === "generating" ? "on" : ""}>Generating</li>
          </ol>
          {job?.progress != null ? (
            <div className="determinate" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${job.progress}%` }} />
            </div>
          ) : (
            <div className="indeterminate"><span /></div>
          )}
          <span>
            Generating video... {job?.progress != null ? `${Math.round(job.progress)}%` : ""} <span className="muted">· {fmt(elapsed)} elapsed · this usually takes 1–3 minutes</span>
          </span>
        </div>
      )}

      {!busy && current && <MediaPreview creation={current} onGenerateAgain={() => void run(current.prompt, null)} />}
    </div>
  );
}
