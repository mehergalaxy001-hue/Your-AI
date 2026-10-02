import { useRef, useState } from "react";
import { formatBytes } from "../../utils/format";
import { UploadIcon, XIcon } from "../UI/Icons";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];
const EXT = /\.(png|jpe?g|webp)$/i;

interface Props {
  value: { dataUrl: string; name: string; size: number } | null;
  maxBytes: number;
  disabled?: boolean;
  onChange: (v: { dataUrl: string; name: string; size: number } | null) => void;
}

/** Validated image picker (PNG/JPG/JPEG/WEBP, size-limited) with preview. */
export function ImageUpload({ value, maxBytes, disabled, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = (file: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!ALLOWED.includes(file.type) || !EXT.test(file.name)) {
      setError("Unsupported format. Please choose a PNG, JPG, JPEG or WEBP image.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`File too large. The maximum size is ${formatBytes(maxBytes)}.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError(null);
      onChange({ dataUrl: String(reader.result), name: file.name, size: file.size });
    };
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="upload">
      <input ref={input} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className="upload-preview">
          <img src={value.dataUrl} alt="Start image preview" />
          <div className="upload-meta">
            <span className="file-name">{value.name}</span>
            <span className="muted small">{formatBytes(value.size)} · used as the first frame</span>
          </div>
          <button className="icon-btn sm" onClick={() => onChange(null)} disabled={disabled} aria-label="Remove image">
            <XIcon width={16} height={16} />
          </button>
        </div>
      ) : (
        <button className="btn" onClick={() => input.current?.click()} disabled={disabled}>
          <UploadIcon width={16} height={16} /> Upload image
        </button>
      )}
      {error && <p className="status error" role="alert">{error}</p>}
    </div>
  );
}
