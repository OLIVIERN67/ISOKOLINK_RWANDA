import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { getApiError } from "../services/api";
import { useToast } from "../context/ToastContext";
import { assetUrl } from "../utils/format";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function ImageUploader({
  value,
  onChange,
  upload,
  max = 5,
  label = "Photos",
  hint = "JPEG, PNG, WebP, or GIF · up to 5 MB each",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  upload: (file: File) => Promise<{ url: string }>;
  max?: number;
  label?: string;
  hint?: string;
}) {
  const { error } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - value.length;
    if (remaining <= 0) {
      error(`You can upload up to ${max} image${max === 1 ? "" : "s"}.`);
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of selected) {
        if (!ACCEPTED.includes(file.type)) {
          error(`${file.name}: use a JPEG, PNG, WebP, or GIF image.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          error(`${file.name}: the image is larger than 5 MB.`);
          continue;
        }
        const result = await upload(file);
        uploaded.push(result.url);
      }
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    } catch (requestError) {
      error(getApiError(requestError).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <p className="label">{label}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {value.map((url) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-cream">
            <img src={assetUrl(url) ?? ""} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((entry) => entry !== url))}
              className="absolute right-1.5 top-1.5 rounded-full bg-charcoal/70 p-1 text-white opacity-90 transition hover:bg-error"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
        {value.length < max ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 bg-white text-charcoal/45 transition hover:border-forest-400 hover:text-forest-600 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
            <span className="text-[10px] font-semibold">{uploading ? "Uploading…" : "Add image"}</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple={max > 1}
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <p className="mt-1.5 text-xs text-gray-500">{hint}{max > 1 ? ` · ${value.length}/${max} uploaded` : ""}</p>
    </div>
  );
}
