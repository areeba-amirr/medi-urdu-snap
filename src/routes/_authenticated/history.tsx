import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkInteraction } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search, Trash2, Loader2, Pill, ShieldCheck, AlertTriangle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { MedicineCard, BilingualField } from "@/components/MedicineCard";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const interactionFn = useServerFn(checkInteraction);
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [m1, setM1] = useState(""); const [m2, setM2] = useState("");
  const [checking, setChecking] = useState(false);
  const [interaction, setInteraction] = useState<any>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("scans").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setScans(data || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!confirm("Delete this scan?")) return;
    const { error } = await supabase.from("scans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { setScans((s) => s.filter((x) => x.id !== id)); toast.success("Deleted"); }
  }

  async function runInteraction() {
    if (!m1 || !m2) return toast.error("Pick two medicines");
    setChecking(true); setInteraction(null);
    try {
      const r = await interactionFn({ data: { medicine1: m1, medicine2: m2 } });
      setInteraction(r);
    } catch (e: any) { toast.error(e.message); }
    finally { setChecking(false); }
  }

  const filtered = scans.filter((s) => {
    const matchSearch = !search || (s.medicine_name || "").toLowerCase().includes(search.toLowerCase());
    const matchDate = !date || format(new Date(s.created_at), "yyyy-MM-dd") === date;
    return matchSearch && matchDate;
  });

  const medOptions = Array.from(new Set(scans.map((s) => s.medicine_name).filter(Boolean)));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold md:text-3xl">Scan History</h1>
      <p className="mt-1 text-muted-foreground">All your saved medicines and prescriptions.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Drug interaction checker</h2>
        <p className="text-sm text-muted-foreground">Check whether two medicines are safe to take together.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select value={m1} onChange={(e) => setM1(e.target.value)} className="rounded-lg border border-input bg-background p-2.5 text-sm">
            <option value="">Medicine 1…</option>
            {medOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={m2} onChange={(e) => setM2(e.target.value)} className="rounded-lg border border-input bg-background p-2.5 text-sm">
            <option value="">Medicine 2…</option>
            {medOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button disabled={checking} onClick={runInteraction}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
          </button>
        </div>
        {interaction && (
          <div className={`mt-4 rounded-xl border-l-4 p-4 ${
            interaction.is_safe ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
          }`}>
            <div className="flex items-center gap-2 font-semibold">
              {interaction.is_safe ? <ShieldCheck className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
              {interaction.is_safe ? "Safe combination" : `Caution — ${interaction.severity}`}
            </div>
            <p className="mt-2 text-sm">{interaction.explanation}</p>
            {interaction.explanation_urdu && <p className="urdu mt-1 text-sm">{interaction.explanation_urdu}</p>}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicine name…"
            className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm" />
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          No scans yet. Try the medicine scanner!
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card shadow-sm">
              <button onClick={() => setOpenId(openId === s.id ? null : s.id)} className="flex w-full items-center gap-4 p-4 text-left">
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.is_dangerous ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  <Pill className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold">{s.medicine_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(s.created_at), "PPP p")} · {s.scan_type}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openId === s.id ? "rotate-180" : ""}`} />
                <button onClick={(e) => { e.stopPropagation(); del(s.id); }} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </button>
              {openId === s.id && (
                <div className="border-t border-border p-4">
                  {s.scan_type === "prescription" && s.prescription_data?.medicines ? (
                    <div className="space-y-3">
                      {s.prescription_data.medicines.map((m: any, i: number) => (
                        <div key={i} className="rounded-lg border border-border bg-secondary/50 p-3">
                          <p className="font-semibold">{m.name}</p>
                          {m.name_urdu && <p className="urdu">{m.name_urdu}</p>}
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <BilingualField label="Dosage" en={m.dosage} ur={m.dosage_urdu} />
                            <BilingualField label="Frequency" en={m.frequency} ur={m.frequency_urdu} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <MedicineCard med={s} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
