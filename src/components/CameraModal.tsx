import { useEffect, useRef, useState } from "react";
import { X, Camera as CameraIcon, RefreshCw, Upload } from "lucide-react";

export function CameraModal({
  open,
  onClose,
  onCapture,
  onFallbackFile,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  onFallbackFile: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera API not available in this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not access camera.";
        setError(msg);
      }
    };

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facing]);

  if (!open) return null;

  const capture = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    onCapture(c.toDataURL("image/jpeg", 0.92));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-display text-lg">Take a photo</div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative bg-black aspect-video flex items-center justify-center">
          {error ? (
            <div className="text-center p-6 space-y-4">
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90"
              >
                <Upload className="h-4 w-4" /> Choose file instead
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    onFallbackFile(f);
                    onClose();
                  }
                }}
              />
            </div>
          ) : (
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          )}
        </div>

        {!error && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
            <button
              onClick={() => setFacing(facing === "environment" ? "user" : "environment")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted text-muted-foreground"
            >
              <RefreshCw className="h-4 w-4" /> Switch
            </button>
            <button
              onClick={capture}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              <CameraIcon className="h-4 w-4" /> Capture
            </button>
            <div className="w-[88px]" />
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
