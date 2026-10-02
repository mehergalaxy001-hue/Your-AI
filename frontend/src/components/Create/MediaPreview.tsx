import { memo, useState } from "react";
import type { Creation } from "../../types/media";
import { useCopy } from "../../hooks/useCopy";
import { AlertIcon, CheckIcon, CopyIcon, DownloadIcon, RefreshIcon } from "../UI/Icons";

interface Props {
  creation: Creation;
  onGenerateAgain?: () => void;
  busy?: boolean;
}

/** Large preview of a generated image/video with real Download / Copy URL actions. */
function MediaPreviewImpl({ creation, onGenerateAgain, busy }: Props) {
  const [expired, setExpired] = useState(false);
  const [unplayable, setUnplayable] = useState(false);
  // A media error can mean the file expired (404) or the browser can't decode it.
  const onMediaError = () => {
    fetch(creation.resultUrl, { method: "HEAD" })
      .then((r) => (r.ok ? setUnplayable(true) : setExpired(true)))
      .catch(() => setExpired(true));
  };
  const [copied, copy] = useCopy();
  const absoluteUrl = new URL(creation.resultUrl, window.location.origin).toString();
  const ext = creation.mime?.split("/")[1]?.replace("jpeg", "jpg") ?? (creation.type === "video" ? "mp4" : "png");

  return (
    <figure className="media-preview">
      {expired ? (
        <div className="media-expired" role="alert">
          <AlertIcon width={18} height={18} />
          <span>This result has expired or is no longer available on the server. Generate it again to get a new copy.</span>
        </div>
      ) : creation.type === "image" ? (
        <img src={creation.resultUrl} alt={creation.prompt} onError={onMediaError} />
      ) : unplayable ? (
        <div className="media-expired" role="alert">
          <AlertIcon width={18} height={18} />
          <span>This browser can't play this video format. Use Download to watch it in another player.</span>
        </div>
      ) : (
        <video src={creation.resultUrl} controls playsInline preload="metadata" onError={onMediaError} />
      )}
      <figcaption className="media-prompt">{creation.prompt}</figcaption>
      <div className="media-actions">
        {!expired && (
          <a className="btn" href={`${creation.resultUrl}?download=1`} download={`galaxy-ai-${creation.id}.${ext}`}>
            <DownloadIcon width={16} height={16} /> Download
          </a>
        )}
        {onGenerateAgain && (
          <button className="btn" onClick={onGenerateAgain} disabled={busy}>
            <RefreshIcon width={16} height={16} /> Generate again
          </button>
        )}
        {!expired && creation.type === "image" && (
          <button className="btn" onClick={() => copy(absoluteUrl)}>
            {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />} {copied ? "Copied" : "Copy image URL"}
          </button>
        )}
      </div>
    </figure>
  );
}

export const MediaPreview = memo(MediaPreviewImpl);
