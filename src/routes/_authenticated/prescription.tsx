import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { scanPrescription } from "@/lib/ai.functions";
import { CameraCapture } from "@/components/CameraCapture";
import { BilingualField, WarningBanner } from "@/components/MedicineCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Pill } from "lucide-react";
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
  is_dangerous?: boolean;
}

function PrescriptionPage() {
  const fn = useServerFn(scanPrescription);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<{
    medicines: PMed[]; doctor_notes?: string; doctor_notes_urdu?: string;
    interactions?: string; interactions_urdu?: string;
  } | null>(null);

  async function handleCapture(imageBase64: string) {
    setLoading(true); setResult(null); setSaved(false);
    try {
      const data = await fn({ data: { imageBase64 } });
      setResult(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to read prescription");
    } finally { setLoading(false); }
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const first = result.medicines?.[0];
    const { error } = await supabase.from("scans").insert({
      user_id: u.user.id,
      scan_type: "prescription",
      medicine_name: first?.name ?? "Prescription",
      medicine_name_urdu: first?.name_urdu ?? "نسخہ",
      warnings: result.interactions,
      warnings_urdu: result.interactions_urdu,
      doctor_notes: result.doctor_notes,
      doctor_notes_urdu: result.doctor_notes_urdu,
      is_dangerous: result.medicines?.some((m) => m.is_dangerous) || !!result.interactions,
      prescription_data: result as any,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { setSaved(true); toast.success("Prescription saved"); }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold md:text-3xl">Scan Prescription</h1>
      <p className="mt-1 text-muted-foreground">Upload a photo of your doctor's prescription (handwritten or printed).</p>
      <p className="urdu mt-1 text-muted-foreground">ڈاکٹر کے نسخے کی تصویر اپلوڈ کریں۔</p>

      <div className="mt-6">
        <CameraCapture onCapture={handleCapture} disabled={loading} />
      </div>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-border bg-card p-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Decoding handwriting and translating to Urdu…</span>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-4">
          {result.interactions && (
            <WarningBanner text={`Possible interactions: ${result.interactions}`} urdu={result.interactions_urdu} />
          )}
          <div className="grid gap-3">
            {result.medicines?.map((m, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Pill className="h-5 w-5" /></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{m.name}</h3>
                    {m.name_urdu && <p className="urdu text-base">{m.name_urdu}</p>}
                  </div>
                  {m.is_dangerous && <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">Caution</span>}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <BilingualField label="Dosage" en={m.dosage} ur={m.dosage_urdu} />
                  <BilingualField label="Frequency" en={m.frequency} ur={m.frequency_urdu} />
                  <BilingualField label="Duration" en={m.duration} ur={m.duration_urdu} />
                  <BilingualField label="Instructions" en={m.instructions} ur={m.instructions_urdu} />
                </div>
              </div>
            ))}
          </div>
          {result.doctor_notes && (
            <BilingualField label="Doctor's notes" en={result.doctor_notes} ur={result.doctor_notes_urdu} />
          )}
          <button disabled={saving || saved} onClick={save}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved ✓" : "Save prescription"}
          </button>
        </div>
      )}
    </div>
  );
}
