import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { scanMedicine } from "@/lib/ai.functions";
import { CameraCapture } from "@/components/CameraCapture";
import { MedicineCard } from "@/components/MedicineCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scanner")({
  component: ScannerPage,
});

function ScannerPage() {
  const scanFn = useServerFn(scanMedicine);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  async function handleCapture(imageBase64: string) {
    setLoading(true); setResult(null); setSaved(false);
    try {
      const data = await scanFn({ data: { imageBase64 } });
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
      user_id: u.user.id, scan_type: "medicine", ...result,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { setSaved(true); toast.success("Saved to history"); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold md:text-3xl">Scan Medicine</h1>
      <p className="mt-1 text-muted-foreground">Take a clear photo of the medicine label.</p>
      <p className="urdu mt-1 text-muted-foreground">دوا کے لیبل کی صاف تصویر لیں۔</p>

      <div className="mt-6">
        <CameraCapture onCapture={handleCapture} disabled={loading} />
      </div>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-border bg-card p-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Reading the label and translating to Urdu…</span>
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-4">
          <MedicineCard med={result} />
          <button disabled={saving || saved} onClick={save}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved ✓" : "Save to history"}
          </button>
        </div>
      )}
    </div>
  );
}
