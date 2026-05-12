import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { scanPrescription } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Save, RefreshCcw, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/prescription")({
  component: PrescriptionPage,
});

interface PMed {
  name?: string; name_urdu?: string;
  dosage?: string; dosage_urdu?: string;
  frequency?: string; frequency_urdu?: string;
  duration?: string; duration_urdu?: string;
  instructions?: string; instructions_urdu?: string;
  warnings?: string; warnings_urdu?: string;
  is_dangerous?: boolean;
}

interface PResult {
  medicines: PMed[];
  doctor_notes?: string; doctor_notes_urdu?: string;
  interactions?: string; interactions_urdu?: string;
}

function isEmpty(v?: string) {
  if (!v) return true;
  const t = v.trim();
  return t === "" || t === "N/A" || t === "دستیاب نہیں";
}

function PrescriptionPage() {
  const fn = useServerFn(scanPrescription);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<PResult | null>(null);
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
      const data = await fn({ data: { imageBase64: preview } });
      setResult(data as PResult);
    } catch (e: any) {
      toast.error(e.message || "Failed to read prescription");
    } finally { setLoading(false); }
  }

  async function saveAll() {
    if (!result || !result.medicines?.length) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const groupId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const rows = result.medicines.map((m) => ({
      user_id: u.user!.id,
      scan_type: "prescription",
      scan_group_id: groupId,
      medicine_name: m.name,
      medicine_name_urdu: m.name_urdu,
      dosage: m.dosage,
      dosage_urdu: m.dosage_urdu,
      frequency: m.frequency,
      frequency_urdu: m.frequency_urdu,
      warnings: m.warnings,
      warnings_urdu: m.warnings_urdu,
      food_interactions: m.instructions,
      food_interactions_urdu: m.instructions_urdu,
      doctor_notes: result.doctor_notes,
      doctor_notes_urdu: result.doctor_notes_urdu,
      is_dangerous: !!m.is_dangerous,
      prescription_data: { ...m, interactions: result.interactions } as any,
    }));
    const { error } = await supabase.from("scans").insert(rows);
    setSaving(false);
    if (error) toast.error(error.message);
    else { setSaved(true); toast.success("✅ All medicines saved!"); }
  }

  function reset() {
    setPreview(null); setResult(null); setSaved(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold md:text-3xl">Scan Doctor Prescription</h1>
      <p className="urdu mt-1 text-lg text-muted-foreground">ڈاکٹر کا نسخہ اسکین کریں</p>

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
                  <p className="text-base font-semibold">Click to upload prescription photo</p>
                  <p className="text-sm text-muted-foreground">Handwritten or printed accepted</p>
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {loading ? "Reading prescription..." : "Read Prescription"}
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
        <div className="mt-6 space-y-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Reading prescription...</span>
          </div>
          <p className="ml-8 text-sm text-muted-foreground">Decoding medical abbreviations...</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-bold">Medicines Found ({result.medicines.length})</h2>

          {!isEmpty(result.interactions) && (
            <div className="rounded-xl border-2 border-warning bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                <div className="min-w-0">
                  <p className="font-bold text-warning">⚠️ Drug Interaction Detected</p>
                  <p className="urdu text-sm font-semibold text-warning">ادویات کا باہمی تعامل</p>
                  <p className="mt-2 text-sm">{result.interactions}</p>
                  {!isEmpty(result.interactions_urdu) && (
                    <p className="urdu mt-1 text-sm">{result.interactions_urdu}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {result.medicines.map((m, i) => (
              <div
                key={i}
                className={`rounded-2xl border bg-card p-5 shadow-sm ${
                  m.is_dangerous ? "border-2 border-destructive" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold">
                      <span className="text-primary">{i + 1}.</span> {m.name}
                    </h3>
                    {!isEmpty(m.name_urdu) && <p className="urdu text-base">{m.name_urdu}</p>}
                  </div>
                  {m.is_dangerous && (
                    <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                      Caution
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Row icon="💊" enLabel="Dosage" urLabel="خوراک" en={m.dosage} ur={m.dosage_urdu} />
                  <Row icon="⏰" enLabel="Frequency" urLabel="وقت" en={m.frequency} ur={m.frequency_urdu} />
                  <Row icon="📅" enLabel="Duration" urLabel="مدت" en={m.duration} ur={m.duration_urdu} />
                  <Row icon="🍽️" enLabel="Instructions" urLabel="ہدایت" en={m.instructions} ur={m.instructions_urdu} />
                  {!isEmpty(m.warnings) && (
                    <div className="sm:col-span-2">
                      <Row icon="⚠️" enLabel="Warnings" urLabel="احتیاط" en={m.warnings} ur={m.warnings_urdu} danger />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!isEmpty(result.doctor_notes) && (
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <p className="text-sm font-semibold">Doctor's Notes:</p>
              <p className="urdu text-sm font-semibold">ڈاکٹر کی ہدایات</p>
              <p className="mt-2 text-sm">{result.doctor_notes}</p>
              {!isEmpty(result.doctor_notes_urdu) && (
                <p className="urdu mt-1 text-sm">{result.doctor_notes_urdu}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              disabled={saving || saved} onClick={saveAll}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? "✅ All medicines saved!" : "Save All to History"}
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

function Row({
  icon, enLabel, urLabel, en, ur, danger,
}: { icon: string; enLabel: string; urLabel: string; en?: string; ur?: string; danger?: boolean }) {
  return (
    <div>
      <p className={`text-sm ${danger ? "text-destructive" : ""}`}>
        <span className="mr-1">{icon}</span>
        <span className="font-semibold">{enLabel}:</span> {en}
      </p>
      {!isEmpty(ur) && (
        <p className={`urdu text-sm ${danger ? "text-destructive" : ""}`}>
          <span className="font-semibold">{urLabel}:</span> {ur}
        </p>
      )}
    </div>
  );
}
