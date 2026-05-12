import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { scanMedicine } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Save, RefreshCcw, AlertTriangle, Pill, Clock, Utensils, ShieldAlert, Salad } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scanner")({
  component: ScannerPage,
});

interface MedResult {
  medicine_name?: string; medicine_name_urdu?: string;
  dosage?: string; dosage_urdu?: string;
  frequency?: string; frequency_urdu?: string;
  instructions?: string; instructions_urdu?: string;
  warnings?: string; warnings_urdu?: string;
  food_interactions?: string; food_interactions_urdu?: string;
  is_dangerous?: boolean;
}

function ScannerPage() {
  const scanFn = useServerFn(scanMedicine);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<MedResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function readFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    const reader = new FileReader();
    reader.onload = () => { setPreview(reader.result as string); setResult(null); setSaved(false); };
    reader.readAsDataURL(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) readFile(f);
  }

  async function scan() {
    if (!preview) return;
    setLoading(true); setResult(null); setSaved(false);
    try {
      const data = await scanFn({ data: { imageBase64: preview } });
      setResult(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to scan");
    } finally { setLoading(false); }
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("scans").insert({
      user_id: u.user.id,
      scan_type: "medicine",
      medicine_name: result.medicine_name,
      medicine_name_urdu: result.medicine_name_urdu,
      dosage: result.dosage,
      dosage_urdu: result.dosage_urdu,
      frequency: result.frequency,
      frequency_urdu: result.frequency_urdu,
      warnings: result.warnings,
      warnings_urdu: result.warnings_urdu,
      food_interactions: result.instructions || result.food_interactions,
      food_interactions_urdu: result.instructions_urdu || result.food_interactions_urdu,
      is_dangerous: !!result.is_dangerous,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { setSaved(true); toast.success("✅ Saved to history!"); }
  }

  function reset() {
    setPreview(null); setResult(null); setSaved(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold md:text-3xl">Medicine Scanner</h1>
      <p className="mt-1 text-muted-foreground">Snap a medicine label and get clear instructions in Urdu.</p>

      {/* Upload box */}
      {!result && (
        <div className="mt-6">
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/30"
            }`}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-[40vh] w-auto rounded-lg object-contain" />
            ) : (
              <>
                <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-base font-semibold">Click to upload medicine photo</p>
                  <p className="text-sm text-muted-foreground">or drag and drop</p>
                </div>
              </>
            )}
            <input
              ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
            />
          </label>

          {preview && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={scan} disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pill className="h-4 w-4" />}
                {loading ? "Reading label..." : "Scan Medicine"}
              </button>
              <button
                onClick={reset} disabled={loading}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 font-medium hover:bg-accent disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" /> Choose another
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-border bg-card p-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Reading the label and translating to Urdu…</span>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          {result.is_dangerous && (
            <div className="rounded-xl border-2 border-destructive bg-destructive/10 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 shrink-0 text-destructive" />
                <div>
                  <p className="text-lg font-bold text-destructive">⚠️ HIGH RISK MEDICINE</p>
                  <p className="text-sm font-semibold text-destructive">CONSULT DOCTOR BEFORE TAKING</p>
                  <p className="urdu mt-1 text-base font-semibold text-destructive">خطرناک دوائی - ڈاکٹر سے ملیں</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Medicine</p>
            <h2 className="mt-1 text-3xl font-bold text-primary">{result.medicine_name || "Unknown"}</h2>
            {result.medicine_name_urdu && (
              <p className="urdu mt-2 text-2xl font-semibold">{result.medicine_name_urdu}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile icon="💊" label="Dosage" en={result.dosage} ur={result.dosage_urdu} />
            <InfoTile icon="⏰" label="Frequency" en={result.frequency} ur={result.frequency_urdu} />
            <InfoTile icon="🍽️" label="Instructions" en={result.instructions} ur={result.instructions_urdu} />
            <InfoTile icon="⚠️" label="Warnings" en={result.warnings} ur={result.warnings_urdu} />
            <InfoTile icon="🥗" label="Food Interactions" en={result.food_interactions} ur={result.food_interactions_urdu} />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              disabled={saving || saved} onClick={save}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? "✅ Saved to history!" : "Save to History"}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 font-medium hover:bg-accent"
            >
              <RefreshCcw className="h-4 w-4" /> Scan Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoTile({ icon, label, en, ur }: { icon: string; label: string; en?: string; ur?: string }) {
  if (!en && !ur) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-base">{icon}</span> {label}
      </p>
      {en && <p className="mt-2 text-sm">{en}</p>}
      {ur && <p className="urdu mt-1 text-sm">{ur}</p>}
    </div>
  );
}
