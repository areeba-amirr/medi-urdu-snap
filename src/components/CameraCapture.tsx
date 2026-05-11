import { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, Upload, RefreshCcw, X } from "lucide-react";

interface Props {
  onCapture: (base64: string) => void;
  disabled?: boolean;
}

export function CameraCapture({ onCapture, disabled }: Props) {
  const webcamRef = useRef<Webcam>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"camera" | "upload" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot();
    if (img) setPreview(img);
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <img src={preview} alt="Captured" className="w-full max-h-[60vh] object-contain bg-black" />
        </div>
        <div className="flex flex-wrap gap-3">
          <button disabled={disabled} onClick={() => onCapture(preview)} className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            Analyze image
          </button>
          <button disabled={disabled} onClick={() => { setPreview(null); setMode(null); }} className="rounded-lg border border-border bg-card px-5 py-2.5 font-medium hover:bg-accent disabled:opacity-60">
            Retake
          </button>
        </div>
      </div>
    );
  }

  if (mode === "camera") {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-black">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode }}
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={capture} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90">
            <Camera className="h-4 w-4" /> Capture
          </button>
          <button onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 hover:bg-accent">
            <RefreshCcw className="h-4 w-4" /> Flip
          </button>
          <button onClick={() => setMode(null)} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 hover:bg-accent">
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button onClick={() => setMode("camera")} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center hover:bg-accent">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Camera className="h-6 w-6" /></div>
        <div>
          <p className="font-semibold">Use camera</p>
          <p className="text-sm text-muted-foreground">Snap the medicine label</p>
        </div>
      </button>
      <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center hover:bg-accent">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success"><Upload className="h-6 w-6" /></div>
        <div>
          <p className="font-semibold">Upload from gallery</p>
          <p className="text-sm text-muted-foreground">Choose a saved photo</p>
        </div>
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  );
}
